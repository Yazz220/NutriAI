# Folio assistant context

Folio assembles a fresh, bounded context for every assistant run. The model is
not expected to infer which recipe is open from transcript history.

## Context precedence

1. The current user request.
2. A confirmed session-only recipe preview.
3. The canonical `cookbook_pages.recipe_graph` loaded by `nosh-chat` through
   the caller's JWT and row-level security.
4. Explicit cooking preferences saved by the user.
5. Recent conversational text.

Opening Folio from a recipe immediately makes that recipe the conversation
focus. The sheet names the recipe and keeps the contextual start state visible
while its graph is being resolved. A background `load_recipe` call never
changes focus or navigation; only `open_recipe` may do that after an explicit
request. Starting a new conversation preserves the current surface and focus.

## Turn lifecycle

- Greetings and thanks use a server-side quick path (`responseMode: "quick"`)
  that skips action tools and recipe lookups while still naming the active
  recipe when one is focused. Because this path does not call an external AI
  provider, it does not open the AI data-consent prompt. All other turns go
  through the model — client-side regex shortcuts were removed so tool calls
  are always recorded in thread history and the conversation subject is
  preserved.
- Ordinary answers stream as soon as model text arrives. Folio delays its
  neutral pending indicator so a quick response never flashes a fake thinking
  state.
- Recipe and preference lookups run in parallel for standard turns. Agent trace
  persistence also runs alongside the model request instead of delaying its
  first token.
- Only real tool work gets a named working state and a persisted result card.
  Cancelling a response aborts the active request, and retry keeps the current
  thread and focus.

## Collection retrieval

- `search_recipe_collection` resolves a named or described recipe.
- `browse_recipe_collection` handles inventory, filters, counts, ingredient
  matching, exclusions, categories, cuisines, time limits, and pagination.
- `load_recipe` fetches a full graph only after a compact candidate is chosen.

Read-only tools (`search_recipe_collection`, `browse_recipe_collection`,
`load_recipe`, `list_cookbooks`) execute server-side inside `nosh-chat` in a
bounded loop (at most three rounds). A search → load → answer chain therefore
costs one client round trip instead of three. The server streams `tool-call`
and `tool-result` events so the client can render inline tool cards as they
happen. Tools that mutate, navigate, or need a confirmation card stay on the
client.

## Conversation working memory

Folio derives a conversation state from the thread's tool results on every
request and persists it in `nosh_thread_state` (under RLS, IDs and titles
only — no message content). The state tracks:

- **Current subject**: the recipe the conversation is about right now. A
  resolved search or a sole browse result sets it; `load_recipe` and
  `open_recipe` reinforce it. The focused recipe (the page the user opened
  Folio from) is the subject until a tool result establishes a different one
  after the focus was accepted.
- **Recent candidates**: the most recent search or browse result list, so
  "the second one" or "the 30-minute one" resolves without re-searching.
- **Loaded recipes**: recipes whose full graph has already been read this
  conversation. Their full payloads are summarised out of history; the model
  reloads by pageId when it needs exact quantities again.
- **Active task**: the task the conversation is currently about (collection,
  recipe-help, capture, …). Set from the interaction context each turn and
  persisted so it survives even if the client omits it.

The state is injected as a `CONVERSATION STATE` block in the system prompt and
refreshed after each server-side tool round. On each request the server reads
the persisted state, merges it with the freshly-derived state (derived values
win; persisted values fill in fields lost to history compaction), and upserts
the merged state back to the table after the turn completes. This enables
cross-device thread state and ensures the subject survives even when old tool
results are summarised away.

## History compaction

Older tool results are summarised instead of dropped:

- `load_recipe` results become compact references (pageId, title, servings,
  ingredient count) with a note to reload for exact quantities.
- `search_recipe_collection` and `browse_recipe_collection` results become
  compact candidate lists (pageId, title, cookbook title).
- Unfinished tool rounds (assistant tool call with no matching tool result)
  are removed.
- When the token budget is tight, the oldest messages are dropped first;
  the latest user message and any in-progress tool round are always kept.

At most three saved recipes may be loaded for one user request.

## Preferences and traces

Folio never infers durable preferences from ordinary conversation.
`save_cooking_preference` presents a confirmation card before saving or
removing a preference. Settings opens a dedicated preference conversation with
only that confirmation tool available. Saved allergies act as safety
constraints. Dietary restrictions and disliked ingredients shape
recommendations and adaptations; measurement units shape explanations and
conversions; default servings, appliances, and cooking goals apply only when
relevant. A current request may override a convenience default but never
silently deletes or weakens a saved preference.

Model-backed runs in `nosh_agent_runs` store identifiers, routing details, tool
names, token counts, latency, and outcome, but not prompt or response content.
Deterministic quick replies emit a structured server log instead of an agent
run. The response report flow links a report to the available trace ID.

## Deployment

Apply `20260903160550_nosh_agent_context_and_collection.sql` and
`20260903200000_nosh_thread_state.sql`, then deploy `nosh-chat` and
`report-ai-response`. `CHAT_MODEL` selects the assistant model
and falls back to the legacy `AI_MODEL`. Optional server-only tuning variables
are:

- `NOSH_TEMPERATURE` (default `0.4`, clamped to `0`–`1.5`).
- `NOSH_REASONING_EFFORT` (`low`, `medium`, or `high`). Omit it to leave
  reasoning configuration unchanged.

Run the normal Jest suite, TypeScript check, ESLint, and Deno checks before
deployment. The 28-case baseline in
`supabase/functions/nosh-chat/evals/scenarios.json` covers collection,
cookbook, recipe, capture, preference, navigation, and mutation
routing, plus three multi-turn memory scenarios that verify follow-up turns
("What ingredients do I need?", "Make me a shopping list for it.", "The second
one") do not re-search recipes already established in the conversation.
Step-by-step cooking guidance is handled in text — the agent has the full
recipe graph and walks the user through it like any capable chat assistant.
