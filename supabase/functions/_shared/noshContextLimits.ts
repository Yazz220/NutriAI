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
export const MAX_CHAT_HISTORY_CHARACTERS = 36_000;

function messageSize(message: MessageLike): number {
  return JSON.stringify(message).length;
}

/**
 * Keep the current user/tool loop intact, then add recent conversational text
 * until the budget is reached. Old tool payloads often contain full recipe
 * graphs and are intentionally excluded; canonical recipe context is rebuilt
 * separately for every run.
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

  for (let index = currentTurnStart - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role === 'tool' || message.tool_calls?.length) continue;
    const size = messageSize(message);
    if (used + size > maxCharacters) break;
    recent.unshift(message);
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
