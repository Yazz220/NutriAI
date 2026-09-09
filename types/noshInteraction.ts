export type NoshEntryPoint =
  | 'shelf-nosh'
  | 'cookbook-nosh'
  | 'recipe-ask'
  | 'cookbook-add'
  | 'share-to-nosh'
  | 'settings-preferences';

export type NoshTask = 'collection' | 'cookbook-help' | 'recipe-help' | 'capture' | 'preferences';

export type NoshFocus =
  | { kind: 'collection' }
  | { kind: 'cookbook'; cookbookId: string; title: string }
  | { kind: 'recipe'; cookbookId: string; pageId: string; title: string }
  | { kind: 'capture'; captureId: string; title?: string };

export type NoshVisibleContext =
  | { kind: 'collection' }
  | { kind: 'cookbook'; cookbookId: string; title: string }
  | { kind: 'recipe'; cookbookId: string; pageId: string; title: string };

export interface NoshInteractionSession {
  entryPoint: NoshEntryPoint;
  task: NoshTask;
  focus: NoshFocus;
}

export interface NoshInteractionEnvelope extends NoshInteractionSession {
  visibleContext: NoshVisibleContext;
  focusStatus?: 'ready' | 'loading' | 'missing' | 'stale';
  /**
   * How many user messages the thread already had when this focus was
   * accepted. Lets the server decide whether the focused recipe or a recipe
   * resolved later in the conversation is the current subject.
   */
  focusUserMessageCount?: number;
}

export function taskForEntryPoint(entryPoint: NoshEntryPoint): NoshTask {
  switch (entryPoint) {
    case 'recipe-ask':
      return 'recipe-help';
    case 'cookbook-nosh':
      return 'cookbook-help';
    case 'cookbook-add':
    case 'share-to-nosh':
      return 'capture';
    case 'settings-preferences':
      return 'preferences';
    case 'shelf-nosh':
      return 'collection';
  }
}

export function isSameNoshFocus(left: NoshFocus, right: NoshFocus): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'collection') return true;
  if (left.kind === 'cookbook') {
    return left.cookbookId === (right as Extract<NoshFocus, { kind: 'cookbook' }>).cookbookId;
  }
  if (left.kind === 'recipe') {
    return left.pageId === (right as Extract<NoshFocus, { kind: 'recipe' }>).pageId;
  }
  return left.captureId === (right as Extract<NoshFocus, { kind: 'capture' }>).captureId;
}

export function shouldOfferNoshFocusTransition(
  current: NoshInteractionSession,
  requested: NoshInteractionSession,
  hasMessages: boolean,
): boolean {
  return hasMessages
    && (requested.entryPoint === 'recipe-ask' || requested.entryPoint === 'cookbook-nosh')
    && (requested.focus.kind === 'recipe' || requested.focus.kind === 'cookbook')
    && !isSameNoshFocus(current.focus, requested.focus);
}

export function isNoshInteractionSession(value: unknown): value is NoshInteractionSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NoshInteractionSession>;
  if (!candidate.entryPoint || !candidate.task || !candidate.focus) return false;
  if (!['shelf-nosh', 'cookbook-nosh', 'recipe-ask', 'cookbook-add', 'share-to-nosh', 'settings-preferences'].includes(candidate.entryPoint)) {
    return false;
  }
  if (!['collection', 'cookbook-help', 'recipe-help', 'capture', 'preferences'].includes(candidate.task)) return false;
  const focus = candidate.focus as Partial<NoshFocus>;
  if (focus.kind === 'collection') return true;
  if (focus.kind === 'cookbook') return typeof focus.cookbookId === 'string' && typeof focus.title === 'string';
  if (focus.kind === 'recipe') {
    return typeof focus.cookbookId === 'string'
      && typeof focus.pageId === 'string'
      && typeof focus.title === 'string';
  }
  return focus.kind === 'capture' && typeof focus.captureId === 'string';
}
