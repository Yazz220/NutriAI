interface ToolCallLike {
  id: string;
  function?: { name?: string };
}

interface MessageLike {
  role: string;
  content?: unknown;
  tool_call_id?: string;
  tool_calls?: ToolCallLike[];
}

export const MAX_LOADED_RECIPES_PER_REQUEST = 3;
export const MAX_COLLECTION_LOOKUPS_PER_REQUEST = 3;
export const MAX_CHAT_HISTORY_CHARACTERS = 36_000;
const MAX_GENERIC_TOOL_SUMMARY_CHARACTERS = 240;

function messageSize(message: MessageLike): number {
  return JSON.stringify(message).length;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function compactRef(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record || typeof record.pageId !== 'string') return null;
  const graph = asRecord(record.recipeGraph);
  const title = typeof record.title === 'string' ? record.title : graph?.title;
  return {
    pageId: record.pageId,
    ...(typeof title === 'string' ? { title } : {}),
    ...(typeof record.cookbookTitle === 'string' ? { cookbookTitle: record.cookbookTitle } : {}),
    ...(typeof record.totalTimeMinutes === 'number' ? { totalTimeMinutes: record.totalTimeMinutes } : {}),
  };
}

function compactRefs(values: unknown): Record<string, unknown>[] {
  if (!Array.isArray(values)) return [];
  return values.map(compactRef).filter((ref): ref is Record<string, unknown> => ref !== null).slice(0, 8);
}

/**
 * Replace a completed tool payload with the small part the model may still
 * need later: stable ids, titles, counts, and outcome. Full recipe graphs
 * are intentionally dropped; the model reloads them by pageId.
 */
export function summarizeToolResult(toolName: string | undefined, content: unknown): string {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? null);
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = asRecord(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed) return text.slice(0, MAX_GENERIC_TOOL_SUMMARY_CHARACTERS);

  switch (toolName) {
    case 'search_recipe_collection':
      return JSON.stringify({
        summary: true,
        status: parsed.status,
        ...(parsed.candidate ? { candidate: compactRef(parsed.candidate) } : {}),
        candidates: compactRefs(parsed.candidates),
      });
    case 'browse_recipe_collection':
      return JSON.stringify({
        summary: true,
        totalCount: parsed.totalCount,
        recipes: compactRefs(parsed.recipes),
      });
    case 'load_recipe': {
      const graph = asRecord(parsed.recipeGraph);
      const groups = Array.isArray(graph?.ingredientGroups) ? graph.ingredientGroups : [];
      const ingredientCount = groups.reduce<number>((total, group) => {
        const record = asRecord(group);
        return total + (Array.isArray(record?.ingredients) ? record.ingredients.length : 0);
      }, 0);
      return JSON.stringify({
        summary: true,
        pageId: parsed.pageId,
        cookbookId: parsed.cookbookId,
        title: graph?.title,
        servings: graph?.servings,
        ingredientCount,
        note: 'Full recipe omitted from history. Call load_recipe with this pageId for exact quantities.',
      });
    }
    default:
      return text.length > MAX_GENERIC_TOOL_SUMMARY_CHARACTERS
        ? `${text.slice(0, MAX_GENERIC_TOOL_SUMMARY_CHARACTERS)}…`
        : text;
  }
}

/**
 * Group older messages so an assistant tool-call message always travels with
 * its tool results. Unfinished tool rounds and orphan tool results are dropped
 * because providers reject them.
 */
function groupHistoryUnits<T extends MessageLike>(messages: T[]): T[][] {
  const units: T[][] = [];
  let index = 0;
  while (index < messages.length) {
    const message = messages[index];
    if (message.role === 'assistant' && message.tool_calls?.length) {
      const calls = new Map(message.tool_calls.map((call) => [call.id, call.function?.name]));
      const unit: T[] = [message];
      index += 1;
      while (index < messages.length) {
        const next = messages[index];
        if (next.role !== 'tool' || !next.tool_call_id || !calls.has(next.tool_call_id)) break;
        unit.push({
          ...next,
          content: summarizeToolResult(calls.get(next.tool_call_id), next.content),
        });
        index += 1;
      }
      if (unit.length === calls.size + 1) units.push(unit);
      continue;
    }
    if (message.role !== 'tool') units.push([message]);
    index += 1;
  }
  return units;
}

/**
 * Keep the current user/tool loop intact, then add recent history newest
 * first until the budget is reached. Older tool results are summarized to
 * ids and titles so the model can keep referring to what it already found.
 */
export function compactChatHistory<T extends MessageLike>(
  messages: T[],
  maxCharacters = MAX_CHAT_HISTORY_CHARACTERS,
): T[] {
  if (messages.length === 0) return [];

  let latestUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      latestUserIndex = index;
      break;
    }
  }
  const currentTurnStart = latestUserIndex >= 0 ? latestUserIndex : messages.length - 1;
  const currentTurn = messages.slice(currentTurnStart);
  let used = currentTurn.reduce((total, message) => total + messageSize(message), 0);
  const recent: T[] = [];

  const units = groupHistoryUnits(messages.slice(0, currentTurnStart));
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index];
    const size = unit.reduce((total, message) => total + messageSize(message), 0);
    if (used + size > maxCharacters) break;
    recent.unshift(...unit);
    used += size;
  }

  return [...recent, ...currentTurn];
}

export function countCompletedToolCallsSinceLatestUser(
  messages: MessageLike[],
  toolName: string,
): number {
  let latestUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      latestUserIndex = index;
      break;
    }
  }

  const matchingCallIds = new Set<string>();
  for (const message of messages.slice(latestUserIndex + 1)) {
    if (message.role !== 'assistant') continue;
    for (const call of message.tool_calls ?? []) {
      if (call.function?.name === toolName) matchingCallIds.add(call.id);
    }
  }

  return messages
    .slice(latestUserIndex + 1)
    .filter((message) => (
      message.role === 'tool'
      && typeof message.tool_call_id === 'string'
      && matchingCallIds.has(message.tool_call_id)
    ))
    .length;
}
