interface ToolCallLike {
  id: string;
  function?: { name?: string };
}

interface MessageLike {
  role: string;
  tool_call_id?: string;
  tool_calls?: ToolCallLike[];
}

export const MAX_LOADED_RECIPES_PER_REQUEST = 3;

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
