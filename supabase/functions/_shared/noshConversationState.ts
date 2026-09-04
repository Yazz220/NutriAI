/**
 * Conversation working memory for Folio.
 *
 * The state is derived deterministically from the thread's tool results, so
 * it needs no extra storage and survives app restarts as long as the thread
 * history does. It answers one question for the model: which saved recipe
 * does "it", "that one", or "the fajitas" refer to right now?
 */

interface ToolCallLike {
  id: string;
  function?: { name?: string; arguments?: string };
}

interface MessageLike {
  role: string;
  content?: unknown;
  tool_call_id?: string;
  tool_calls?: ToolCallLike[];
}

export interface ConversationRecipeRef {
  pageId: string;
  title: string;
  cookbookId?: string;
  cookbookTitle?: string;
}

export interface ConversationState {
  /** The recipe the conversation is currently about. */
  subject: ConversationRecipeRef | null;
  subjectSource: 'tool' | 'focus' | null;
  /** The most recent search or browse result set, in result order. */
  recentCandidates: ConversationRecipeRef[];
  /** Recipes whose full graph has already been read in this conversation. */
  loadedRecipes: ConversationRecipeRef[];
  /** The task the conversation is currently about (collection, recipe-help, …). */
  activeTask: string | null;
}

export const MAX_RECENT_CANDIDATES = 8;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function toRecipeRef(value: unknown): ConversationRecipeRef | null {
  const record = asRecord(value);
  if (!record) return null;
  const pageId = optionalString(record.pageId);
  const graph = asRecord(record.recipeGraph);
  const title = optionalString(record.title) ?? optionalString(graph?.title);
  if (!pageId || !title) return null;
  return {
    pageId,
    title,
    ...(optionalString(record.cookbookId) ? { cookbookId: record.cookbookId as string } : {}),
    ...(optionalString(record.cookbookTitle) ? { cookbookTitle: record.cookbookTitle as string } : {}),
  };
}

function refsFrom(values: unknown): ConversationRecipeRef[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(toRecipeRef)
    .filter((ref): ref is ConversationRecipeRef => ref !== null)
    .slice(0, MAX_RECENT_CANDIDATES);
}

function parseToolContent(content: unknown): Record<string, unknown> | null {
  if (typeof content !== 'string') return asRecord(content);
  try {
    return asRecord(JSON.parse(content));
  } catch {
    return null;
  }
}

function parseArguments(call: ToolCallLike | undefined): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(call?.function?.arguments || '{}')) ?? {};
  } catch {
    return {};
  }
}

function upsertRef(list: ConversationRecipeRef[], ref: ConversationRecipeRef): ConversationRecipeRef[] {
  return [ref, ...list.filter((item) => item.pageId !== ref.pageId)].slice(0, MAX_RECENT_CANDIDATES);
}

/**
 * Apply one completed tool result to the working memory.
 * Exported so the server can update the state during its own tool loop.
 */
export function applyToolResult(
  state: ConversationState,
  toolName: string,
  result: unknown,
  args: Record<string, unknown> = {},
): ConversationState {
  const record = asRecord(result);
  if (!record || record.error) return state;

  switch (toolName) {
    case 'search_recipe_collection': {
      const candidates = refsFrom(record.candidates);
      const resolved = record.status === 'resolved' ? toRecipeRef(record.candidate) ?? candidates[0] : null;
      return {
        ...state,
        recentCandidates: candidates.length ? candidates : state.recentCandidates,
        ...(resolved ? { subject: resolved, subjectSource: 'tool' } : {}),
      };
    }
    case 'browse_recipe_collection': {
      const recipes = refsFrom(record.recipes);
      const sole = record.totalCount === 1 && recipes.length === 1 ? recipes[0] : null;
      return {
        ...state,
        recentCandidates: recipes.length ? recipes : state.recentCandidates,
        ...(sole ? { subject: sole, subjectSource: 'tool' } : {}),
      };
    }
    case 'load_recipe':
    case 'open_recipe': {
      const ref = toRecipeRef(record);
      if (!ref) return state;
      return {
        ...state,
        subject: ref,
        subjectSource: 'tool',
        loadedRecipes: toolName === 'load_recipe' ? upsertRef(state.loadedRecipes, ref) : state.loadedRecipes,
      };
    }
    case 'organize_recipe': {
      const resultPageId = optionalString(record.resultPageId);
      const sourcePageId = optionalString(args.pageId);
      if (!resultPageId || !state.subject || state.subject.pageId !== sourcePageId) return state;
      return {
        ...state,
        subject: {
          ...state.subject,
          pageId: resultPageId,
          ...(optionalString(record.destinationCookbookId)
            ? { cookbookId: record.destinationCookbookId as string }
            : {}),
        },
      };
    }
    default:
      return state;
  }
}

export function emptyConversationState(): ConversationState {
  return { subject: null, subjectSource: null, recentCandidates: [], loadedRecipes: [], activeTask: null };
}

/**
 * Rebuild the working memory from the full thread.
 *
 * `focus` is the recipe the user opened Folio from. It becomes the subject
 * unless a tool result established a different subject after the focus was
 * accepted. `focusUserMessageCount` is how many user messages existed when
 * that focus was accepted; 0 means the focus predates the whole thread.
 */
export function deriveConversationState(
  messages: MessageLike[],
  focus?: ConversationRecipeRef | null,
  focusUserMessageCount = 0,
): ConversationState {
  const callsById = new Map<string, ToolCallLike>();
  let state = emptyConversationState();
  let userCount = 0;
  let lastSubjectUserCount = -1;

  for (const message of messages) {
    if (message.role === 'user') {
      userCount += 1;
      continue;
    }
    if (message.role === 'assistant') {
      for (const call of message.tool_calls ?? []) callsById.set(call.id, call);
      continue;
    }
    if (message.role !== 'tool' || !message.tool_call_id) continue;
    const call = callsById.get(message.tool_call_id);
    const toolName = call?.function?.name;
    if (!toolName) continue;
    const before = state.subject;
    state = applyToolResult(state, toolName, parseToolContent(message.content), parseArguments(call));
    if (state.subject !== before) lastSubjectUserCount = userCount;
  }

  const focusWins = Boolean(focus)
    && (state.subject === null || lastSubjectUserCount <= Math.max(0, focusUserMessageCount));
  if (focus && focusWins) {
    return { ...state, subject: focus, subjectSource: 'focus' };
  }
  return state;
}

function describeRef(ref: ConversationRecipeRef): string {
  const location = ref.cookbookTitle ? ` in ${ref.cookbookTitle}` : '';
  return `${ref.title}${location} (pageId: ${ref.pageId})`;
}

/** Render the working memory as a compact prompt block. */
export function formatConversationState(state: ConversationState): string[] {
  const lines = ['CONVERSATION STATE:'];
  if (state.activeTask) {
    lines.push(`Active task: ${state.activeTask}`);
  }
  if (state.subject) {
    lines.push(`Current subject: ${describeRef(state.subject)}${
      state.subjectSource === 'focus' ? ' — the recipe the user opened Folio from' : ' — established earlier in this conversation'
    }`);
  } else {
    lines.push('Current subject: none yet. The first resolved recipe becomes the subject.');
  }
  if (state.recentCandidates.length > 0) {
    lines.push('Most recent result list (use for "the first one", "the second", "that one"):');
    state.recentCandidates.forEach((ref, index) => {
      lines.push(`  ${index + 1}. ${describeRef(ref)}`);
    });
  }
  if (state.loadedRecipes.length > 0) {
    lines.push(`Recipes already read this conversation: ${
      state.loadedRecipes.map((ref) => `${ref.title} (pageId: ${ref.pageId})`).join('; ')
    }. Use the supplied current subject or focused recipe graph directly. Call load_recipe only for a recipe whose full graph is not supplied.`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Database serialization — for nosh_thread_state persistence
// ---------------------------------------------------------------------------

/** Convert a ConversationState to the column shape of nosh_thread_state. */
export function toThreadStateRow(state: ConversationState): {
  subject_page_id: string | null;
  subject_title: string | null;
  subject_cookbook_id: string | null;
  subject_source: 'tool' | 'focus' | null;
  recent_candidates: ConversationRecipeRef[];
  loaded_recipes: ConversationRecipeRef[];
  active_task: string | null;
} {
  return {
    subject_page_id: state.subject?.pageId ?? null,
    subject_title: state.subject?.title ?? null,
    subject_cookbook_id: state.subject?.cookbookId ?? null,
    subject_source: state.subjectSource,
    recent_candidates: state.recentCandidates,
    loaded_recipes: state.loadedRecipes,
    active_task: state.activeTask,
  };
}

/**
 * Rebuild a ConversationState from a nosh_thread_state row.
 * Missing or invalid fields fall back to empty — the derivation from tool
 * results is always the primary source of truth; the table is a supplement.
 */
export function fromThreadStateRow(row: unknown): ConversationState {
  const record = asRecord(row);
  if (!record) return emptyConversationState();
  const subjectPageId = optionalString(record.subject_page_id);
  const subjectTitle = optionalString(record.subject_title);
  const subject: ConversationRecipeRef | null = subjectPageId && subjectTitle
    ? {
      pageId: subjectPageId,
      title: subjectTitle,
      ...(optionalString(record.subject_cookbook_id) ? { cookbookId: record.subject_cookbook_id as string } : {}),
    }
    : null;
  const sourceRaw = optionalString(record.subject_source);
  const subjectSource = sourceRaw === 'tool' || sourceRaw === 'focus' ? sourceRaw : null;
  return {
    subject,
    subjectSource,
    recentCandidates: refsFrom(record.recent_candidates),
    loadedRecipes: refsFrom(record.loaded_recipes),
    activeTask: optionalString(record.active_task) ?? null,
  };
}

/**
 * Merge a freshly-derived state with a persisted state from the table.
 * The derived state wins for fields it can compute; the table fills in
 * fields that are lost when history is compacted or that aren't derivable
 * (like activeTask when the interaction context is absent).
 */
export function mergeWithPersisted(
  derived: ConversationState,
  persisted: ConversationState,
): ConversationState {
  return {
    subject: derived.subject ?? persisted.subject,
    subjectSource: derived.subject ? derived.subjectSource : persisted.subject ? persisted.subjectSource : null,
    recentCandidates: derived.recentCandidates.length ? derived.recentCandidates : persisted.recentCandidates,
    loadedRecipes: derived.loadedRecipes.length ? derived.loadedRecipes : persisted.loadedRecipes,
    activeTask: derived.activeTask ?? persisted.activeTask,
  };
}
