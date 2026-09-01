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
focus. The composer stays disabled while its graph is being resolved. A
background `load_recipe` call never changes focus or navigation; only
`open_recipe` may do that after an explicit request.

## Collection retrieval

- `search_recipe_collection` resolves a named or described recipe.
- `browse_recipe_collection` handles inventory, filters, counts, ingredient
  matching, exclusions, categories, cuisines, time limits, and pagination.
- `load_recipe` fetches a full graph only after a compact candidate is chosen.

The server keeps the current tool loop intact but removes full recipe payloads
from older turns. At most three saved recipes may be loaded for one user
request.

## Preferences and traces

Folio never infers durable preferences from ordinary conversation.
`save_cooking_preference` presents a confirmation card before saving or
removing a preference. `nosh_agent_runs` stores identifiers, routing details,
tool names, token counts, latency, and outcome, but not prompt or response
content. The response report flow links a report to this trace ID.

## Deployment

Apply `20260826164632_nosh_agent_context_and_collection.sql`, then deploy
`nosh-chat` and `report-ai-response`. The existing `AI_MODEL` remains the model
selector. Optional server-only tuning variables are:

- `NOSH_TEMPERATURE` (default `0.4`, clamped to `0`–`1.5`).
- `NOSH_REASONING_EFFORT` (`low`, `medium`, or `high`). Omit it to leave
  reasoning configuration unchanged.

Run the normal Jest suite, TypeScript check, ESLint, and Deno checks before
deployment. The 24-case baseline in
`supabase/functions/nosh-chat/evals/scenarios.json` covers focus, retrieval,
navigation, mutation, capture, walkthrough, and preference-memory routing.
