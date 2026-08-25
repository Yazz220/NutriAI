import type { ChatModelRunOptions, ChatModelRunResult } from '@assistant-ui/react-native';
import { createNoshChatAdapter } from '@/utils/cookbook/noshChatAdapter';
import { streamAuthenticatedFunction } from '@/utils/supabaseEdge';

jest.mock('@/utils/supabaseEdge', () => ({
  streamAuthenticatedFunction: jest.fn(),
}));

const mockedStream = jest.mocked(streamAuthenticatedFunction);
const collectionInteraction = {
  entryPoint: 'shelf-nosh' as const,
  task: 'collection' as const,
  focus: { kind: 'collection' as const },
  visibleContext: { kind: 'collection' as const },
};
const captureInteraction = {
  ...collectionInteraction,
  entryPoint: 'cookbook-add' as const,
  task: 'capture' as const,
  focus: { kind: 'cookbook' as const, cookbookId: 'book-a', title: 'Dinner' },
  visibleContext: { kind: 'cookbook' as const, cookbookId: 'book-a', title: 'Dinner' },
};

function runOptions(execute: jest.Mock): ChatModelRunOptions {
  return {
    messages: [],
    runConfig: {},
    abortSignal: new AbortController().signal,
    context: {
      tools: {
        start_recipe_capture: {
          type: 'human',
          description: 'handoff',
          parameters: { type: 'object' },
        },
        search_recipe_collection: {
          type: 'frontend',
          description: 'search',
          parameters: { type: 'object' },
          execute,
        },
      },
    },
    unstable_getMessage: jest.fn(),
  } as unknown as ChatModelRunOptions;
}

function mockResponse(response: Record<string, unknown>) {
  mockedStream.mockImplementation(async function* () {
    yield { type: 'result', result: response };
  });
}

async function runAdapter(
  adapter: ReturnType<typeof createNoshChatAdapter>,
  options: ChatModelRunOptions,
): Promise<ChatModelRunResult> {
  const output = adapter.run(options);
  if (output instanceof Promise) return output;
  let latest: ChatModelRunResult | undefined;
  for await (const result of output) latest = result;
  if (!latest) throw new Error('Adapter did not yield a result');
  return latest;
}

async function collectAdapterResults(
  adapter: ReturnType<typeof createNoshChatAdapter>,
  options: ChatModelRunOptions,
): Promise<ChatModelRunResult[]> {
  const output = adapter.run(options);
  if (output instanceof Promise) return [await output];
  const results: ChatModelRunResult[] = [];
  for await (const result of output) results.push(result);
  return results;
}

describe('createNoshChatAdapter', () => {
  beforeEach(() => {
    mockedStream.mockReset();
  });

  it('yields cumulative assistant text as tokens arrive', async () => {
    mockedStream.mockImplementation(async function* () {
      yield { type: 'text-delta', delta: 'Hello' };
      yield { type: 'text-delta', delta: ' from Nosh' };
      yield {
        type: 'result',
        result: {
          message: { role: 'assistant', content: 'Hello from Nosh' },
          toolCalls: [],
        },
      };
    });
    const adapter = createNoshChatAdapter(() => ({ interaction: collectionInteraction }));

    const results = await collectAdapterResults(adapter, runOptions(jest.fn()));

    expect(results.map((result) => result.content)).toEqual([
      [{ type: 'text', text: 'Hello' }],
      [{ type: 'text', text: 'Hello from Nosh' }],
      [{ type: 'text', text: 'Hello from Nosh' }],
    ]);
  });

  it('offers an explicit capture handoff from collection conversation', async () => {
    mockResponse({
      message: {
        role: 'assistant',
        content: 'I can turn that into a cookbook page.',
        tool_calls: [{
          id: 'handoff-1',
          type: 'function',
          function: {
            name: 'start_recipe_capture',
            arguments: JSON.stringify({ sourceType: 'url', input: 'https://example.com/recipe' }),
          },
        }],
      },
      toolCalls: [],
    });
    const adapter = createNoshChatAdapter(() => ({ interaction: collectionInteraction }));
    const options = runOptions(jest.fn());
    const result = await runAdapter(adapter, options);

    expect(result.status).toEqual({ type: 'requires-action', reason: 'tool-calls' });
    expect(result.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'tool-call', toolName: 'start_recipe_capture' }),
    ]));
  });

  it('stops the automatic loop when a frontend tool fails', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Provider unavailable'));
    mockResponse({
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'search-2',
          type: 'function',
          function: {
            name: 'search_recipe_collection',
            arguments: JSON.stringify({ query: 'Tea' }),
          },
        }],
      },
      toolCalls: [],
    });

    const adapter = createNoshChatAdapter(() => ({ interaction: collectionInteraction }));
    const result = await runAdapter(adapter, runOptions(execute));

    expect(result.status).toEqual({ type: 'complete', reason: 'stop' });
    expect(result.content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'tool-call',
        isError: true,
        result: { error: 'Provider unavailable' },
      }),
      expect.objectContaining({ type: 'text' }),
    ]));
  });

  it('executes collection retrieval without injecting a capped page-title list', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'resolved',
      candidate: { pageId: 'page-cheesecake', title: 'Baked Cheesecake', score: 6 },
      candidates: [{ pageId: 'page-cheesecake', title: 'Baked Cheesecake', score: 6 }],
    });
    mockResponse({
      message: {
        role: 'assistant',
        content: 'I found it.',
        tool_calls: [{
          id: 'search-1',
          type: 'function',
          function: {
            name: 'search_recipe_collection',
            arguments: JSON.stringify({ query: 'cheesecake' }),
          },
        }],
      },
      toolCalls: [],
    });

    const adapter = createNoshChatAdapter(() => ({
      interaction: collectionInteraction,
    }));
    const options = runOptions(jest.fn());
    options.context.tools = {
      ...options.context.tools,
      search_recipe_collection: {
        type: 'frontend',
        description: 'search',
        parameters: { type: 'object' },
        execute,
      },
    };

    const result = await runAdapter(adapter, options);

    expect(execute).toHaveBeenCalledWith(
      { query: 'cheesecake' },
      expect.objectContaining({ toolCallId: 'search-1' }),
    );
    expect(mockedStream).toHaveBeenCalledWith(
      'nosh-chat',
      expect.objectContaining({
        interactionContext: expect.objectContaining(collectionInteraction),
        tools: [
          'start_recipe_capture',
          'search_recipe_collection',
          'load_recipe',
          'open_recipe',
          'list_cookbooks',
          'organize_recipe',
        ],
        cookbookContext: expect.not.objectContaining({ otherRecipes: expect.anything() }),
      }),
      expect.anything(),
    );
    expect(result.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ toolName: 'search_recipe_collection' }),
    ]));
  });

  it('sends stable conversation focus separately from the visible reader page', async () => {
    const focusedGraph = { title: 'Soup', ingredientGroups: [], stepGroups: [] };
    mockResponse({
      message: { role: 'assistant', content: 'Soup stays in focus.' },
      toolCalls: [],
    });
    const adapter = createNoshChatAdapter(() => ({
      recipeGraph: focusedGraph as never,
      interaction: {
        entryPoint: 'recipe-ask',
        task: 'recipe-help',
        focus: { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-soup', title: 'Soup' },
        visibleContext: { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-pasta', title: 'Pasta' },
      },
    }));

    await runAdapter(adapter, runOptions(jest.fn()));

    expect(mockedStream).toHaveBeenCalledWith(
      'nosh-chat',
      expect.objectContaining({
        recipeGraph: focusedGraph,
        interactionContext: expect.objectContaining({
          focus: expect.objectContaining({ pageId: 'page-soup' }),
          visibleContext: expect.objectContaining({ pageId: 'page-pasta' }),
        }),
        tools: expect.arrayContaining(['scale_servings', 'search_recipe_collection']),
      }),
      expect.anything(),
    );
  });

  it('does not expose chat tools inside the dedicated capture workspace', async () => {
    mockResponse({
      message: { role: 'assistant', content: 'The capture workspace is handling this recipe.' },
      toolCalls: [],
    });
    const adapter = createNoshChatAdapter(() => ({ interaction: captureInteraction }));

    await runAdapter(adapter, runOptions(jest.fn()));

    expect(mockedStream).toHaveBeenCalledWith(
      'nosh-chat',
      expect.objectContaining({ tools: [] }),
      expect.anything(),
    );
  });
});
