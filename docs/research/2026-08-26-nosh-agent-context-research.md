# Nosh agent context and usefulness research

Date: 2026-08-26

## Executive recommendation

Nosh does not primarily need a smarter model. It needs a deterministic context layer between the app and the model.

The current Qwen3.6 model is capable enough for ingredient substitutions, cooking guidance, collection questions, and tool use. The experience feels unintelligent because the model is sometimes given the wrong recipe, no recipe while the right one is still loading, or no useful representation of the collection. In longer conversations it is also given an unbounded transcript containing old and sometimes duplicated RecipeGraphs.

The highest-value change is to create a server-owned `AgentContextSnapshot` for every turn. It should resolve the visible recipe, conversation focus, active cookbook, relevant collection evidence, and user preferences before the model runs. A recipe-help turn must not start until its active RecipeGraph is ready or definitively unavailable.

My opinionated product decision is this:

> When the user opens Ask Nosh from a recipe, that visible recipe should become the active recipe for the turn by default. A prior recipe can remain pinned only through an explicit, visible mode. Hidden stable focus is not a good mobile default.

This should be followed by a structured collection browsing tool, context compaction, trace-linked feedback, and a real agent evaluation suite. Model and sampling changes should come after those changes have a baseline.

## What Nosh is using today

Nosh has a reasonable foundation:

- `@assistant-ui/react-native` `LocalRuntime` owns the chat run loop, streaming message state, tool execution cycle, composer state, and device-local multi-thread UX.
- `utils/cookbook/noshChatAdapter.ts` converts assistant-ui messages to an OpenAI-compatible request and streams text and tool calls from the `nosh-chat` Edge Function.
- `NoshConversationContext` keeps an interaction session alive across shelf and reader navigation.
- The interaction session separates a stable conversation `focus` from `visibleContext`.
- The active RecipeGraph is injected directly into the system prompt when it is available.
- Task-specific tool sets expose recipe capture, collection search, recipe loading, navigation, organization, recipe edits, timers, and walkthrough actions.
- `search_recipe_collection` uses Postgres full-text search plus title trigram matching over the canonical `cookbook_pages.recipe_graph` data, under RLS.
- Threads and their interaction metadata are persisted to user-scoped AsyncStorage.
- A response report control now stores the reported message ID and response text.

That is enough infrastructure to build a strong agent. The roughness is in how these pieces are composed.

## Confirmed failure modes

### P0: visible recipe and conversational focus disagree

Evidence:

- `contexts/NoshConversationContext.tsx:81` retains the old recipe focus when Ask Nosh is opened from a different recipe and stores the new recipe in `requestedFocus`.
- `components/cookbook/NoshAssistantChat.tsx:591` displays a focus-choice prompt, but still renders the normal conversation and composer below it.
- `components/nosh/conversation/NoshFocusChangePrompt.tsx:11` receives the current focus label but discards it.
- `supabase/functions/nosh-chat/index.ts:451` explicitly tells the model that visible app context must not replace conversation focus.

Impact:

The screen says the user is looking at recipe B, while "this recipe" still means recipe A. The user can send a message before resolving the prompt. This is internally consistent with the current architecture, but inconsistent with ordinary mobile expectations. It directly explains wrong-recipe substitutions and cooking answers.

Recommendation:

- Opening Ask Nosh from recipe B should make B active immediately for the next turn.
- If preserving discussion of recipe A is valuable, make that an explicit pinned state with a persistent header such as `Discussing Soup`, plus a clear `Use open recipe` action.
- If the existing confirmation model is retained temporarily, disable sending until the user chooses and name both recipes in the prompt.
- Treat the currently visible recipe as authoritative for deictic language such as "this", "here", "these ingredients", and "what can I swap?" unless the user has explicitly pinned another recipe.

### P0: focused RecipeGraph loading is not a send precondition

Evidence:

- `components/cookbook/NoshAssistantChat.tsx:156` loads a missing focused graph asynchronously.
- The adapter reads the current graph ref when a run begins. It can therefore send no `recipeGraph` while `focusStatus` is `loading`.
- The composer is not gated on `focusStatus`.
- `supabase/functions/nosh-chat/index.ts:429` says `No recipe is currently focused` whenever the graph is absent. It only has special handling for `missing`, not `loading`.

Impact:

The same question can succeed or fail depending on whether the fetch completed a moment earlier. The model may receive a recipe focus ID and, at the same time, a system statement saying that no recipe is focused.

Recommendation:

- Add a context preflight to the adapter. If the turn is recipe-scoped and the canonical graph is absent, await `loadRecipeFromCollection(pageId)` before calling the Edge Function.
- Expose a send gate while focus is unresolved. assistant-ui supports runtime-level send disabling; a local guard in the composer is also possible with the current runtime.
- Send an explicit context state of `ready`, `loading`, `missing`, or `stale`, and never translate `loading` into "no recipe focused."
- On `missing`, stop deterministically and offer search or focus clearing. Do not ask the language model to infer what happened from contradictory context.

### P0: collection knowledge supports search, not browsing or inventory

Evidence:

- `search_recipe_collection` requires a text query, returns at most five candidates, and supports only optional cookbook, recency, and limit arguments.
- The model receives cookbook titles but no recipe catalog.
- `list_cookbooks` lists books, not the recipes inside them.

Impact:

Nosh can resolve "my cheesecake" or a named ingredient when lexical terms match. It cannot reliably answer:

- "What is inside my books?"
- "What can I cook in 30 minutes?"
- "Which recipes use what I already have?"
- "Show me vegetarian dinners."
- "What have I not cooked recently?"

These are not model failures. No tool exposes the required data shape.

Recommendation:

Add a read-only `browse_recipe_collection` tool with deterministic server-side filtering and aggregation:

```ts
type BrowseRecipeCollectionInput = {
  cookbookIds?: string[];
  text?: string;
  ingredientsAll?: string[];
  ingredientsAny?: string[];
  excludeIngredients?: string[];
  tags?: string[];
  category?: string;
  cuisine?: string;
  maxTotalMinutes?: number;
  sort?: 'relevance' | 'recent' | 'title';
  cursor?: string;
  limit?: number;
  includeCounts?: boolean;
};
```

Return compact recipe cards, match reasons, aggregate counts when requested, and a cursor. Keep `load_recipe` for the few records whose full graph is needed. Do not put every full recipe into the model context.

### P1: loading evidence changes focus

Evidence:

- `components/cookbook/NoshAssistantChat.tsx:331` handles `load_recipe` by loading the graph and calling `requestFocus`.
- The system prompt says that search alone should not navigate, but retrieval still mutates the conversation focus.

Impact:

Reading a recipe as evidence silently changes what "this recipe" means. In a comparison, the last loaded recipe can become the new focus. Retrieval and UI state are coupled when they should be separate.

Recommendation:

- Make `load_recipe` read-only.
- Only `open_recipe` or a dedicated explicit `set_recipe_focus` action should change focus.
- Let comparison and recommendation turns load multiple recipes without changing the user's open page or conversational subject.

### P1: the conversation context grows without a budget

Evidence:

- `utils/cookbook/noshChatAdapter.ts:80` converts every assistant-ui message on every run.
- `supabase/functions/_shared/noshSafety.ts:80` prepends the new system prompt and passes all non-system messages through unchanged.
- There is no token budgeting, history trimming, summarization, or old tool-result compaction.
- `load_recipe` returns a complete RecipeGraph as a tool result and also changes focus. On the following tool round, that graph can appear once in the tool result and again in the focused-recipe section of the system prompt.

Impact:

Longer threads accumulate old recipes and tool output. This increases latency and cost, and gives stale recipes more chances to compete with the current recipe. Large supported context windows do not remove context-quality degradation.

Recommendation:

Create a server-side context builder with a hard token budget:

1. Stable system instructions and tool contracts.
2. One authoritative `AgentContextSnapshot`.
3. The current user turn and recent conversational turns.
4. A compact session summary of commitments and unresolved work.
5. Current-turn tool calls and results, preserving valid call/result pairs.

Old full RecipeGraphs should be replaced with compact evidence handles containing page ID, title, cookbook, and a short factual summary. The canonical graph remains reloadable through `load_recipe`. Never keep duplicate full graphs in the same request.

### P1: grounding language can suppress useful general cooking knowledge

Evidence:

- The prompt says, "Never invent recipe data that isn't in the graph. If you don't know, say so."

Impact:

The safety goal is correct, but the boundary is underspecified. A model may treat general culinary reasoning as forbidden when no RecipeGraph is present, creating unnecessarily weak answers to basic substitution or technique questions.

Recommendation:

Separate saved-recipe facts from general expertise:

- Never invent ingredients, quantities, steps, or claims about a user's saved recipe.
- General culinary knowledge is allowed. State when advice is general rather than derived from the saved recipe.
- For safety-sensitive substitutions, mention the functional role and important constraints such as allergens, raw egg, canning, or baking chemistry.
- Add a small set of canonical examples for recipe-scoped substitution, generic substitution, missing context, ambiguous recipe, and collection browsing. Avoid adding a long list of prose rules.

### P1: feedback is not connected to the run that failed

Evidence:

- Edge logs contain message count, tool names, token usage, and coarse collection-search outcomes.
- Client analytics only logs in development.
- `ai_response_reports` stores message ID and response text, but not the request, context snapshot, model/provider, prompt version, tool decisions, timings, or outcome.

Impact:

A reported bad answer cannot be reconstructed. The team cannot tell whether it was caused by wrong focus, missing graph, failed retrieval, incorrect tool choice, provider variation, or model behavior.

Recommendation:

Create privacy-conscious run traces keyed by `requestId`, `threadId`, and `messageId`. Store:

- prompt and tool-policy version;
- model slug and selected provider metadata;
- context snapshot IDs and statuses, not recipe text;
- chosen tools, validated arguments, compact result status, and latency;
- prompt, completion, and reasoning token counts;
- completion status and error class;
- the report ID when the user flags a response.

Keep recipe text, user search text, allergy details, URLs, and images out of general analytics. If content retention is required for debugging, make it a separate, explicit, short-lived support workflow.

### P2: the current tests validate contracts, not agent behavior

Evidence:

- Current tests cover focus state, search classification, adapter conversion, tool exposure, and message safety.
- There is no repeatable suite that runs the model and scores context selection, tool choice, grounding, and final usefulness.

Impact:

A refactor can keep all unit tests green while making the agent worse. Prompt, tool-schema, provider, and sampling changes are being made without a behavioral baseline.

Recommendation:

Build a small production-shaped agent evaluation suite before model tuning. Start with 30 to 50 cases and run each nondeterministic case multiple times.

Required scenarios:

- Ask for a substitution while recipe A is visibly open.
- Move from recipe A to recipe B, then ask "Can I replace the cream?"
- Start a new thread from a recipe and send immediately.
- Ask while the focused graph is loading, missing, or stale.
- Name a recipe in another cookbook.
- Ask "What recipes are in my books?"
- Filter by time, ingredients, exclusions, category, and cookbook.
- Compare two saved recipes without changing focus.
- Use a durable dietary preference, then override it in the current message.
- Recover from a failed search or load without repeating the same failed action.

Primary metrics:

- context correctness;
- wrong-recipe answer rate, with a target of zero;
- correct tool selection and argument validity;
- collection recall at K and ambiguity handling;
- grounded factual accuracy against RecipeGraph;
- task success and turns to resolution;
- time to first visible text and total latency;
- prompt, completion, and reasoning token cost.

## Target context architecture

Every user turn should pass through one deterministic assembler:

```text
App state + thread state + current message
  -> resolve intent and reference policy
  -> resolve authoritative recipe focus
  -> await canonical RecipeGraph when recipe-scoped
  -> select compact collection evidence when needed
  -> select relevant user preferences
  -> compact prior conversation within budget
  -> AgentContextSnapshot
  -> model and tools
  -> trace, grade, and user-visible response
```

The client should be authoritative for what the user is visibly viewing and which explicit UI action they took. The authenticated Edge Function should be authoritative for the canonical RecipeGraph and collection data. In the target design, the client sends page and cookbook IDs plus interaction state, then `nosh-chat` resolves the graph under the user's RLS identity before the model call. The client-side preflight proposed in Phase 0 is a fast corrective step; server-side canonical resolution is the durable architecture and also prevents stale cache data from becoming model context.

Suggested snapshot:

```ts
type AgentContextSnapshot = {
  version: 1;
  turnId: string;
  task: 'collection' | 'recipe-help' | 'capture' | 'walkthrough';
  visible: {
    route: 'shelf' | 'reader' | 'other';
    cookbookId?: string;
    pageId?: string;
  };
  focus: {
    source: 'explicit-user' | 'visible-page' | 'pinned-thread' | 'retrieval' | 'none';
    status: 'ready' | 'loading' | 'missing' | 'stale' | 'none';
    cookbookId?: string;
    pageId?: string;
    title?: string;
    recipe?: CompactWorkingRecipe;
  };
  collection: {
    scopeCookbookIds?: string[];
    evidence?: CompactRecipeCard[];
  };
  preferences: UserCookingPreferences;
  conversation: {
    summary?: string;
    unresolvedCommitments?: string[];
  };
};
```

Context precedence should be explicit:

1. The user's current, explicit instruction or named recipe.
2. The visible open recipe for deictic references in reader-launched chat.
3. An explicitly pinned thread focus that is visibly labeled.
4. Retrieved collection evidence.
5. Durable user preferences and defaults.

Active app state is not memory. The open recipe must come from current application state, not a remembered note.

## Retrieval strategy

Use a hybrid architecture, not one retrieval mechanism for every question:

- Inject the active recipe up front for recipe-help turns. This is small, deterministic, and latency-sensitive.
- Use structured SQL browsing for inventory, filtering, counts, and sorting.
- Keep lexical and trigram retrieval for exact titles, ingredients, and cookbook names.
- Add semantic retrieval only after evals show important conceptual misses, such as "something comforting that uses pantry staples."
- If semantic retrieval is justified, embed one compact record per recipe and combine lexical and semantic ranks with reciprocal rank fusion. Keep exact user/RLS scoping and structured filters outside the vector score.

Do not use embeddings to solve focus. Focus is application state and must be deterministic.

## Memory strategy

Memory is useful for durable preferences, not for basic context plumbing.

Good candidates:

- allergies and dietary restrictions;
- disliked ingredients;
- preferred measurement system;
- household serving default;
- available appliances;
- explicitly saved cooking goals.

Use a dedicated `save_cooking_preference` tool with explicit confirmation for sensitive or durable facts. Store structured values where possible, plus provenance and update time. Inject only relevant preferences. Apply this precedence:

1. current user message;
2. current-session override;
3. durable preference;
4. product default.

Do not automatically infer permanent allergies or preferences from one substitution request.

## Model and provider configuration

The current Edge Function defaults to `qwen/qwen3.6-35b-a3b:exacto`, but an `AI_MODEL` secret overrides that default. Verify the deployed value. If it omits `:exacto`, the code's tool-oriented default is not being used.

The current request sets `temperature: 0.4` and `max_tokens: 2000`, but does not send Qwen's other recommended sampling controls or explicit reasoning configuration. The streaming parser only preserves text and tool-call deltas. It does not retain reasoning fields between model turns.

Do not change this blindly. After the context and eval baseline exists:

1. Compare the deployed model with and without `:exacto`.
2. Compare explicit non-thinking mode against a small reasoning budget for complex multi-recipe or edit-planning turns.
3. Test Qwen's recommended starting parameters for the chosen mode.
4. If OpenRouter and the selected Qwen provider support it, test reasoning preservation across tool rounds.
5. Record selected provider, reasoning tokens, latency, and correctness in the trace.

Fast recipe questions may be better in non-thinking mode. Comparisons, multi-step adaptation, and organization may benefit from controlled reasoning. Route by evaluated task class, not intuition.

## assistant-ui recommendation

Keep assistant-ui. It is not the source of the intelligence problem.

The current `LocalRuntime` and custom model adapter are a valid fit for an application-owned Edge Function. Continue using assistant-ui for streaming UI state, composer behavior, message rendering, thread controls, and tool execution. Consider these library capabilities:

- Gate sending while external context is unresolved.
- Add a feedback adapter or equivalent trace-aware feedback integration so feedback is associated with the full run.
- Preserve thread custom metadata carefully and add tests for the first-message/new-thread metadata path.
- Consider a richer transport or external-store runtime only if server-owned agent state becomes the source of truth. Do not migrate runtimes merely to fix recipe context.

## Prioritized implementation plan

### Phase 0: stop wrong-context answers

1. Make reader-launched Ask Nosh bind to the visible recipe by default.
2. Disable sending while a focus transition is unresolved.
3. Add adapter context preflight and await the canonical graph.
4. Handle `loading`, `missing`, and `stale` without contradictory prompt text.
5. Add regression tests for immediate send, A-to-B focus change, restored thread, and deleted page.

Expected outcome: "this recipe" is deterministic, and timing cannot remove recipe context.

### Phase 1: make the collection genuinely queryable

1. Decouple `load_recipe` from focus mutation.
2. Add `browse_recipe_collection` with structured filters, aggregates, and cursor pagination.
3. Return compact, high-signal recipe cards and match reasons.
4. Add server-side history budgeting and remove duplicate full graphs.
5. Clarify the prompt boundary between saved-recipe facts and general culinary expertise.

Expected outcome: Nosh can answer what is in the books, find useful recipes, compare recipes, and give basic culinary advice without losing grounding.

### Phase 2: build the improvement loop

1. Add run IDs and privacy-safe structured traces.
2. Link response reports to traces.
3. Create the initial agent eval dataset from the scenarios above and real reported failures.
4. Add CI or a scheduled eval run for prompt, tool-schema, retrieval, provider, and model changes.
5. Establish release gates for wrong-recipe rate, tool accuracy, retrieval recall, latency, and cost.

Expected outcome: agent changes become measurable rather than anecdotal.

### Phase 3: personalize and improve recall

1. Add explicit cooking preference memory.
2. Add session compaction and durable preference injection with precedence tests.
3. Use eval failures to decide whether hybrid semantic retrieval is justified.

Expected outcome: Nosh remembers useful stable constraints without letting memory override the current recipe or request.

### Phase 4: tune or change the model

1. Verify deployed model and provider routing.
2. Run the same eval set across model, reasoning, and sampling variants.
3. Promote a change only when it improves task success without unacceptable latency or cost.

Expected outcome: model upgrades compound a sound harness instead of masking context bugs.

## What not to do

- Do not switch models first.
- Do not inject the entire cookbook collection into every prompt.
- Do not add embeddings to solve deterministic UI focus.
- Do not add more narrowly overlapping tools without a measured use case.
- Do not let `load_recipe` or memory silently change what "this recipe" means.
- Do not retain every historical tool payload indefinitely.
- Do not fine-tune before a representative eval suite exists.

## Current research basis

The recommendations align with current primary engineering guidance:

- Anthropic recommends the smallest useful set of high-signal context, minimal tool ambiguity, and a hybrid of upfront context plus just-in-time retrieval: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
- Anthropic recommends high-signal, token-efficient tool results and tools designed around agent tasks rather than raw APIs: [Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents).
- Manus reports that production agent quality depends heavily on context engineering, stable context, controlled action spaces, and restorable external memory: [Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus).
- OpenAI recommends starting agent debugging with end-to-end traces, then moving to repeatable datasets and eval runs: [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals) and [Build an Agent Improvement Loop](https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop).
- OpenAI's current personalization example uses explicit memory capture and the precedence current input, session context, then durable memory: [Context Engineering for Personalization](https://developers.openai.com/cookbook/examples/agents_sdk/context_personalization).
- Qwen's current model card documents Qwen3.6 thinking behavior, sampling guidance, thinking preservation, and agentic tool use: [Qwen3.6-35B-A3B model card](https://huggingface.co/Qwen/Qwen3.6-35B-A3B).
- OpenRouter documents `:exacto` as quality-first routing for tool-calling reliability and exposes explicit reasoning controls: [OpenRouter FAQ](https://openrouter.ai/docs/faq) and [Reasoning Tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).
- Supabase documents combining lexical and semantic retrieval with reciprocal rank fusion when measured search needs justify it: [Hybrid search](https://supabase.com/docs/guides/ai/hybrid-search).
- assistant-ui documents runtime send gating, adapters, thread metadata, and the distinction between local and externally owned runtime state: [External Store Runtime](https://www.assistant-ui.com/docs/api-reference/external-store/runtime), [Adapters](https://www.assistant-ui.com/docs/runtimes/concepts/adapters), and [Threads](https://www.assistant-ui.com/docs/runtimes/concepts/threads).

## Final judgment

Nosh's product promise is strong because the canonical RecipeGraph already exists. Most consumer cooking assistants do not have such a clean, user-owned reasoning record. The app is failing to cash in on that advantage because context selection is currently implicit, asynchronous, and partly hidden from the user.

Make context assembly deterministic, make the visible recipe the natural mobile default, give the agent a real collection browsing surface, and evaluate the complete run. Those changes should produce a larger improvement than changing the underlying model.
