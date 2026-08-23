import {
  getNoshComposerMode,
  getNoshStartConfig,
} from '@/components/nosh/conversation/noshConversationPresentation';
import type { NoshInteractionSession } from '@/types/noshInteraction';

const collection: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

const recipe: NoshInteractionSession = {
  entryPoint: 'recipe-ask',
  task: 'recipe-help',
  focus: { kind: 'recipe', cookbookId: 'book-1', pageId: 'page-1', title: 'Baked Cheesecake' },
};

const capture: NoshInteractionSession = {
  entryPoint: 'cookbook-add',
  task: 'capture',
  focus: { kind: 'cookbook', cookbookId: 'book-1', title: 'Dinner' },
};

describe('purpose-built Nosh conversation wrappers', () => {
  it('gives an empty shelf conversation collection jobs instead of capture prompts', () => {
    const config = getNoshStartConfig(collection, true);

    expect(config.title).toBe('What can Nosh help with?');
    expect(config.prompts).toEqual(expect.arrayContaining([
      'Find a recipe I saved',
      'Save or check a recipe',
      'Organize my cookbooks',
      'Create a new cookbook',
    ]));
    expect(config.prompts).not.toContain('Add a recipe from a link');
  });

  it('names the focused recipe and offers recipe-specific starts', () => {
    const config = getNoshStartConfig(recipe, true);

    expect(config.title).toBe('Baked Cheesecake');
    expect(config.prompts).toContain('Make this for two');
  });

  it('removes capture attachments and mixed copy from general conversation', () => {
    expect(getNoshComposerMode(collection, true)).toEqual({
      allowsRecipePhoto: false,
      placeholder: 'Ask Nosh about your cookbooks...',
    });
    expect(getNoshComposerMode(recipe, true)).toEqual({
      allowsRecipePhoto: false,
      placeholder: 'Ask about Baked Cheesecake...',
    });
  });

  it('keeps source controls in the dedicated capture task', () => {
    expect(getNoshStartConfig(capture, true).copy).toContain('add it to the right cookbook automatically');
    expect(getNoshStartConfig(capture, true).copy).not.toContain('ask before');
    expect(getNoshComposerMode(capture, true)).toEqual({
      allowsRecipePhoto: true,
      placeholder: 'Send a recipe link, text, or photo...',
    });
  });

  it('keeps the legacy everything-box behavior while the flag is off', () => {
    expect(getNoshComposerMode(collection, false)).toEqual({
      allowsRecipePhoto: true,
      placeholder: 'Drop a recipe link or ask Nosh...',
    });
  });
});
