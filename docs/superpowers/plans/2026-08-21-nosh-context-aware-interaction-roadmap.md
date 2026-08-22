# Nosh context-aware interaction implementation roadmap

> Historical implementation record. Context-aware Nosh remains current, but the capture approval phases and split typesetter/art pipeline were replaced by ADR 0002.

**Date:** 2026-08-21
**Status:** Superseded roadmap
**Product source:** [Nosh context-aware interaction model](../specs/2026-08-21-nosh-context-aware-interaction-model.md)
**Technical source:** [Nosh collection retrieval research](../specs/2026-08-21-nosh-collection-retrieval-research.md)

## What this roadmap changes

This roadmap implements one collection-aware Nosh through purpose-built wrappers. It supersedes the assistant and universal-capture sections of `2026-08-03-nosh-course-correction.md` where that plan assumes current-page-only context, one conversational import interface, or a default guided cooking mode. It does not replace the book reader, typesetter, generation safety, or credit work already completed.

The sequence protects the parts that work:

- Keep the shelf and reader as the product shell.
- Keep `RecipeGraph` as canonical recipe data.
- Keep deterministic live text and isolated generated artwork.
- Keep the root-mounted assistant runtime and tool-calling loop until replacement wrappers prove equivalent behavior.
- Keep Supabase ownership checks, RLS, generation idempotency, and credit compensation.
- Replace the single-sheet assumption in controlled slices.

## Phase dependency map

```text
Phase 0  Contracts and baseline
   |
Phase 1  Collection retrieval
   |
Phase 2  Interaction context and focus
   |
Phase 3  Purpose-built conversation wrappers
   |
Phase 4  Persisted capture lifecycle
   |
Phase 5  In-app capture and approval
   |
Phase 6  Native Share to Nosh
   |
Phase 7  Cooking, adaptation, and artwork actions
   |
Phase 8  Collection organization
   |
Phase 9  Hardening, rollout, and cleanup

Separate gate: long-term memory architecture
```

Do not start native sharing before the capture lifecycle is persisted. Do not add embeddings before lexical retrieval has a measured evaluation set. Do not add permanent preference memory through an incidental chat feature.

## Module seams

The current `NoshAssistantChat.tsx` owns runtime setup, context, extraction, page creation, thread history, tool execution, navigation, and every wrapper. The implementation should deepen four modules and keep their interfaces small.

| Module | Interface callers should learn | Implementation hidden behind it |
|---|---|---|
| Recipe collection retrieval | `search(query, hints)` and `load(pageId)` | SQL ranking, RLS, full-text search, typo tolerance, JSONB projection, ambiguity scores |
| Nosh interaction session | `open(entryPoint, focus)`, `requestFocus(focus)`, `close()` | thread restoration, route context, focus changes, wrapper selection, scratch state |
| Capture lifecycle | `start(source, destination?)`, `resume(captureId)`, `approve(captureId, destination?)`, `retry(captureId)` | persistence, state transitions, extraction, typesetting, artwork jobs, idempotency, failure recovery |
| Recipe action preview | `propose(action, recipe)`, `commit(proposal, mode)` | scaling, substitutions, graph patches, temporary session state, saved versions, artwork refresh |

Tests should exercise these interfaces. Avoid exposing internal provider calls or React state setters merely to make tests easier.

## Execution rules

Every implementation slice must include:

1. One observable acceptance statement from the interaction specification.
2. A test at the lowest useful level and an integration test when the slice crosses a seam.
3. `npm run typecheck`, `npm run lint`, and targeted Jest verification.
4. Deno or SQL tests for changed Edge Functions, database functions, RLS, or idempotency behavior.
5. A plan update marking completed work and any changed assumptions.
6. No unrelated cleanup on the shared working branch.

Use feature flags until the replacement flow covers restoration, failure, and accessibility. Remove old behavior only after the new path passes its exit gate.

## Phase 0: freeze contracts and establish a baseline

**Outcome:** The team can change assistant behavior without losing current extraction, generation, thread restoration, or reader behavior.

### Product and architecture contracts

- [x] Confirm the interaction specification as the implementation source of truth and change its status from Proposed to Decided.
- [x] Keep the wrapper ADR accepted and link it from `docs/ARCHITECTURE.md`.
- [x] Add a short roadmap reference to the active direction section of the older course-correction plan without rewriting its history.
- [x] Record the memory architecture as a separate future session, not a task hidden in an implementation phase.

### Baseline verification

- [x] Run the existing targeted tests for `noshChatAdapter`, thread storage, add-page flow, `BookReader`, page production, and Supabase Edge calls.
- [x] Record existing failures before changing code. The working tree already contains unrelated edits, so do not attribute pre-existing failures to this roadmap.
- [x] Add or repair a fixture that represents two cookbooks with overlapping recipe names and complete Recipe Graphs.
- [x] Add a fixture for a voice-transcription error such as "cheesecake" becoming "cheese cake" or a similar near-match.

Baseline recorded on 2026-08-21: all 6 targeted suites and 13 tests passed before Phase 0 edits.

### Compatibility switch

- [x] Add one client feature flag for the context-aware interaction model.
- [x] Keep the existing sheet as the default while the new flag remains off. Phase 3 will consume the enabled branch.
- [x] Do not fork extraction or generation provider code. Both wrappers must call the same underlying modules.

### Primary file areas

- `docs/ARCHITECTURE.md`
- `docs/superpowers/specs/2026-08-21-nosh-context-aware-interaction-model.md`
- `utils/cookbook/sampleCookbook.ts` or dedicated test fixtures
- Existing Nosh, reader, and add-page tests

### Phase 0 exit gate

- Current behavior has a recorded green or known-failure baseline.
- Two-book retrieval and ambiguity fixtures exist.
- The new work can be enabled or disabled without duplicating provider pipelines.
- The accepted product contract is linked from architecture documentation.

**Phase 0 status:** Complete on 2026-08-21. The rollout flag defaults off, so this phase does not change the visible Nosh experience. Post-change verification passed with 8 suites, 17 tests, typecheck, and lint.

## Phase 1: collection retrieval tracer slice

**Outcome:** From the shelf, Nosh can resolve a saved recipe from any cookbook and answer from its canonical Recipe Graph.

This phase proves the central product idea before wrapper refactoring.

### Phase 1A: database retrieval

- [x] Create a migration with `supabase migration new recipe_collection_search` after installing or locating the project CLI.
- [x] Treat `cookbook_pages.recipe_graph` as canonical. Do not search the flattened `recipes` row because later Nosh edits update the page graph.
- [x] Build one weighted search document per approved recipe page from title, description, cuisine, tags, dietary tags, ingredient names, notes, equipment, source attribution, and low-weight step text.
- [x] Keep cookbook-title matching in the ranked query or update it when a cookbook is renamed. Do not leave a denormalized title stale.
- [x] Add a GIN index for stored full-text search when the migration stores a `tsvector`.
- [x] Keep existing pages searchable through a generated stored vector (Postgres computes it for existing rows when the column is added).
- [x] Search approved recipe pages by default. Pending pages do not exist until Phase 4 adds their lifecycle status; all current pages are approved.
- [x] Add `nutriai.search_recipe_collection` as a `SECURITY INVOKER` database function.
- [x] Use `websearch_to_tsquery` for raw user wording and return no more than five candidates.
- [x] Return `page_id`, `cookbook_id`, cookbook title, recipe title, category, tags, ingredient preview, update time, and a relevance score.
- [x] Do not accept a trusted user ID parameter. Run with the authenticated caller and preserve RLS.
- [x] Revoke function execution from `PUBLIC` and `anon`; grant only the required authenticated role.
- [x] Add title trigram matching because weighted full-text search tokenizes `cheesecake` and voice-spaced `cheese cake` differently.

### Phase 1B: retrieval module

- [x] Add a recipe collection retrieval module under `utils/cookbook/` with `search` and `load` as its interface.
- [x] Use the authenticated Supabase client as the production adapter.
- [x] Test ranking and ambiguity against in-memory candidate fixtures only where database behavior is not under test.
- [x] Make `load(pageId)` return the current canonical Recipe Graph plus the minimum navigation metadata.
- [x] Return typed empty, ambiguous, and resolved outcomes rather than throwing for ordinary no-match cases.

### Phase 1C: Nosh tools

- [x] Add `search_recipe_collection` and `load_recipe` definitions to `nosh-chat`.
- [x] Validate tool arguments on the server like the existing tools.
- [x] Register both as read-only frontend tools in `noshToolkit`.
- [x] Execute retrieval through the authenticated client so RLS sees the user's JWT.
- [x] Teach the system prompt to prefer the active recipe for "this," search for named or described saved recipes, load the graph before answering factual recipe questions, and ask when candidates are close.
- [x] Add an `open_recipe` navigation action only for explicit open or show requests. Retrieval alone does not navigate.
- [x] Stop treating the first 20 titles in the active cookbook as Nosh's collection knowledge after the new tools pass their tests.

### Phase 1 tests

- [x] SQL proof covers direct selection and RPC ownership isolation (execution awaits an authenticated Supabase CLI session).
- [x] SQL proof ranks an exact recipe title above ingredient-only matches (execution awaits an authenticated Supabase CLI session).
- [x] SQL proof covers cookbook title, ingredient, tag, voice-spaced title, and recency hints (execution awaits an authenticated Supabase CLI session).
- [x] Client tests cover search execution, canonical load, no match, ambiguous match, clear resolution, and failed tool execution.
- [ ] Scenario test covers "Open the noodle recipe I saved."
- [ ] Scenario test covers "Give me the ingredients for my cheesecake recipe."
- [ ] Scenario test with two cheesecakes requires clarification.
- [ ] Scenario test confirms a shopping list uses loaded ingredient quantities rather than model recall.

### Primary file areas

- `supabase/migrations/`
- `supabase/tests/`
- `supabase/functions/nosh-chat/index.ts`
- `utils/cookbook/noshChatAdapter.ts`
- `utils/cookbook/noshToolkit.tsx`
- New `utils/cookbook/recipeCollection.ts`
- `__tests__/utils/cookbook/`

### Phase 1 exit gate

- Nosh can find and load an approved recipe across all of the signed-in user's cookbooks.
- Ambiguous matches ask instead of guessing.
- Search and load cannot cross user ownership.
- No normal chat request includes every full Recipe Graph.
- Exact title and ingredient journeys pass without embeddings.

**Phase 1 status:** Implemented locally on 2026-08-21. Jest, TypeScript, and lint verification are green. The migration and rollback-only SQL proof are ready, but the linked-project dry run returned `401 Unauthorized`; apply the migration and run `supabase/tests/recipe_collection_search.sql` from an authenticated Supabase CLI session before treating the database gate as deployed.

## Phase 2: interaction context and focus

**Outcome:** Entry point, active task, visible route, conversation focus, and collection access are distinct concepts in code.

### Context model

- [x] Add `types/noshInteraction.ts` with canonical entry-point, task, and focus types.
- [x] Replace the overloaded `chat | intake` intent with explicit share, cookbook add, recipe ask, shelf Nosh, and walkthrough entry points.
- [x] Represent focus as collection, cookbook, recipe, or capture with stable IDs.
- [x] Keep the visible route context separate from the conversation's current focus.
- [x] Add a single interaction envelope to the chat adapter containing entry point, task, focus, and visible-context hints.
- [x] Do not send wrapper-specific React state or route objects to the Edge Function.

### Session module

- [x] Deepen `NoshConversationContext` into a Nosh interaction session module with `open`, `requestFocus`, and `close` as its primary interface.
- [x] Preserve the root-mounted runtime so navigation does not destroy an active conversation.
- [x] Store the focused recipe or collection scope in each thread's custom metadata.
- [x] Keep capture scratch state out of restored general thread metadata.
- [x] When Ask Nosh opens from a different recipe, offer to focus the current thread on that recipe or start another thread.
- [x] Never change the meaning of "this recipe" because the reader swiped while a conversation remained open.
- [x] Restore focus safely when a saved thread reopens and handle deleted recipes as a recoverable missing-focus state.

### Server context

- [x] Rewrite the system prompt so conversation focus supplies the first interpretation while collection retrieval remains available.
- [x] Remove the rule that conversation is the main interface.
- [x] Keep tool availability based on the active task, not merely the current route.
- [x] Bound prompt size by sending one focused Recipe Graph and compact focus and visible-context metadata.

### Phase 2 tests

- [x] Opening Ask Nosh on a recipe seeds that focus.
- [x] Swiping the reader does not silently rebind the open thread.
- [x] Explicit focus change updates the header and the next request.
- [x] A shelf retrieval can promote the resolved recipe to conversation focus.
- [x] A deleted focused recipe produces an unavailable header state and server recovery instruction.
- [x] Thread restoration preserves focus without restoring capture scratch state.

### Primary file areas

- New `types/noshInteraction.ts`
- `contexts/NoshConversationContext.tsx`
- `components/cookbook/BookReader.tsx`
- `components/cookbook/NoshAssistantChat.tsx`
- `utils/cookbook/noshChatAdapter.ts`
- `utils/cookbook/noshThreadStorage.ts`
- `supabase/functions/nosh-chat/index.ts`

### Phase 2 exit gate

- Tests can state entry point, task, visible context, and conversation focus independently.
- An open conversation never changes recipe focus without an explicit user action.
- A thread may retrieve and focus a recipe outside the visible cookbook.
- Route changes do not reset Nosh identity or destroy the active thread.

**Phase 2 status:** Complete locally on 2026-08-21. The interaction model, session focus, thread metadata, task-scoped tools, missing-focus recovery, and focus-change choice are implemented. Full Jest, TypeScript, and lint verification passed.

## Phase 3: purpose-built conversation wrappers

**Outcome:** Shelf Nosh and recipe Ask Nosh feel purpose-built without splitting Nosh into separate assistants.

### Split the monolith

- [x] Keep assistant-ui runtime creation in one host module.
- [x] Extract conversation display, composer, focus header, history, and launcher behavior from `NoshAssistantChat.tsx` into focused modules under `components/nosh/`.
- [x] Do not create pass-through wrappers. Each extracted module must hide state or behavior that would otherwise spread across callers.
- [x] Preserve existing tool result cards while moving their ownership to the correct wrapper.
- [x] Keep one thread-list adapter for general Nosh conversations.

Suggested organization:

```text
components/nosh/
  NoshHost.tsx
  conversation/
    NoshConversationSheet.tsx
    NoshComposer.tsx
    NoshFocusHeader.tsx
    NoshThreadHistory.tsx
  collection/
    NoshCollectionStart.tsx
  recipe/
    AskNoshButton.tsx
    RecipeFocusPrompt.tsx
```

The final names may change. Preserve the module seams, not this exact folder tree.

### Shelf Nosh

- [x] Replace the icon-only empty-chat launch with a visible collection entry.
- [x] Start with choices for finding food, reviewing pending captures, organizing recipes, and creating or curating a cookbook.
- [x] Let the conversation become open-ended after the user selects a job.
- [x] Keep the full recipe collection available through retrieval.

### Recipe Ask Nosh

- [x] Seed focus from the visible recipe and show it in the conversation header.
- [x] Use recipe-specific starter prompts only when the thread is empty.
- [x] Support search and focus changes without forcing navigation.
- [x] Show an explicit focus action when the reader has moved to another page.

### Remove the everything box

- [x] Remove "Drop a recipe link or ask Nosh" from the general conversation composer.
- [x] Remove recipe capture attachments from the general composer after the capture wrapper exists behind the feature flag.
- [x] Keep cross-task understanding. If a recipe source appears in conversation, Nosh offers an explicit Start capture action.

### Phase 3 tests

- [x] Shelf entry renders collection choices before an empty composer.
- [x] Recipe entry shows the focused recipe.
- [x] Shelf and recipe wrappers use the same assistant identity and thread runtime.
- [x] A cross-task request offers a handoff instead of silently starting capture.
- [x] History remains accessible and displays the current focus.
- [x] Screen-reader labels and focus order identify Nosh, the focused recipe, and close/history actions.

### Phase 3 exit gate

- A user can tell whether Nosh opened for collection help or recipe help before typing.
- General conversation no longer advertises capture as a mixed input mode.
- Existing conversation restoration and tool cards still work.
- The old sheet remains available behind the compatibility flag until Phase 5.

**Phase 3 status:** Complete locally on 2026-08-21. Shelf, recipe, and capture conversations now have purpose-built starts and composers while sharing one Nosh runtime, identity, focus model, and thread history. General conversation offers an explicit human-approved handoff before recipe capture. The compatibility flag still restores the old entry and mixed composer behavior.

## Phase 4: persisted capture lifecycle

**Outcome:** A capture survives app closure and progresses through Saved, Reading, Ready to review, Needs help, and Added.

### Database model

- [x] Add a user-owned `recipe_captures` table in the private `nutriai` schema.
- [x] Store source type, safe source reference, optional destination cookbook, state, extracted Recipe Graph, confidence and notes, pending page reference, failure details, idempotency key, and timestamps.
- [x] Store large images or media in private Storage and keep paths in the row. Do not persist base64 payloads in Postgres.
- [x] Add RLS for authenticated ownership and indexes on user plus state, destination cookbook plus state, and idempotency key.
- [x] Add `lifecycle_status` and optional `capture_id` to `cookbook_pages` so a known-destination result can exist as a pending page.
- [x] Backfill existing pages as approved.
- [x] Keep `capture_id` unique where present so retries cannot create several pending pages.
- [x] Update cookbook counts and collection retrieval to distinguish pending and approved pages.

### State machine

- [x] Put transition rules in one capture lifecycle module. UI code must not assign arbitrary status strings.
- [x] Allow Saved to move to Reading.
- [x] Allow Reading to move to Ready to review or Needs help.
- [x] Allow Needs help to retry through Reading while preserving the source.
- [x] Allow Ready to review to become Added only through approval.
- [x] Treat Added as terminal for the capture while allowing later recipe edits through normal recipe actions.
- [x] Make every transition idempotent.

### Processing orchestration

- [x] Add a `capture-recipe` Edge Function or equivalent server-owned orchestrator.
- [x] Return after the source is durably Saved.
- [x] Reuse the existing extraction and art modules rather than copying prompts or provider calls.
- [x] Follow the current generation-request pattern with persisted processing state, an idempotency key, `EdgeRuntime.waitUntil`, polling, stale-job recovery, and exact-once credit handling.
- [x] For a known destination, create one pending page and finish its typesetting and artwork before Ready to review.
- [ ] For an unknown destination, retain the complete produced capture without creating a cookbook page until approval.
- [x] Preserve the original source when extraction or art generation fails.
- [x] Define whether artwork failure yields Needs help or Ready to review with a missing-art warning. Pick one rule and test it before UI work.

### Cache and synchronization

- [x] Add user-scoped capture query keys and cache helpers.
- [x] Reconcile pending pages into the per-book page cache without counting them as approved recipes.
- [x] Resume polling for unfinished captures after cold launch.
- [x] Show stale cached capture state honestly while offline.

### Phase 4 tests

- [x] SQL tests cover RLS, allowed transitions, forbidden transitions, and idempotent pending-page creation.
- [ ] Edge tests cover extraction failure, artwork failure, retry, stale processing recovery, and duplicate requests.
- [x] Credit tests prove retries cannot spend twice and failure compensation remains exact once.
- [x] Cache tests cover cold restoration of pending captures and pending pages.
- [x] Existing approved pages remain visible and searchable after migration.

### Primary file areas

- `supabase/migrations/`
- `supabase/tests/`
- New `supabase/functions/capture-recipe/`
- Existing extraction, art, and generation shared modules
- New `utils/cookbook/captureLifecycle.ts`
- `utils/cookbook/api.ts`
- `utils/cookbook/cache.ts`
- `hooks/useCookbook.ts`
- `hooks/useCookbooks.ts`
- `hooks/useCookbookImport.ts`

### Phase 4 exit gate

- A saved capture survives app termination.
- Known destination produces one pending page; unknown destination remains in Recent imports.
- Processing may continue after the initiating UI closes.
- Retry cannot duplicate pages or credits.
- Failure never discards the original source.

**Phase 4 status:** Implemented locally on 2026-08-21. Known-destination captures persist, create one provisional page, generate artwork with a stable request key, and become ready for review. Unknown-destination captures persist in Recent imports with artwork deferred until Phase 5 collects a destination. Jest, TypeScript, and lint pass. The rollback-only SQL proof is authored, but local Docker is unavailable and the linked Supabase CLI session returns 401, so migration execution and full Edge integration tests remain deployment gates.

## Phase 5: in-app capture, review, and approval

**Outcome:** Adding a recipe inside Nosh uses a guided capture wrapper and final approval creates an approved recipe page.

### Capture wrapper

- [x] Build a capture wrapper separate from general conversation.
- [x] Reuse one source composer for link, text, photo, screenshot, and video link input.
- [x] Make destination visible and collect it before approval when unknown.
- [x] Inside a cookbook, seed the destination as known.
- [x] From the shelf, keep the destination unknown and use Recent imports; only cookbook-scoped entry points seed a destination.
- [x] Show the actual Saved, Reading, Ready to review, Needs help, or Added state.
- [x] Support several concurrent captures without blocking Nosh conversations.

### Pending pages and Recent imports

- [x] Show pending pages in the known cookbook's table of contents and reader with a clear Needs review treatment.
- [x] Do not include pending pages in approved recipe counts or ordinary collection search.
- [x] Add a Recent imports entry from the shelf and collection Nosh start choices.
- [x] Let Recent imports filter by Ready to review, Needs help, and Reading.
- [x] Keep navigation stable when a pending page becomes approved in place.

### Compact review

- [x] Show source attribution, title, destination, ingredient count, step count, confidence notes, and uncertain fields.
- [x] Allow one-action approval for a clean extraction.
- [x] Offer detailed direct editing without requiring it.
- [x] Offer Ask Nosh to fix this for reasoning-heavy corrections.
- [x] Keep the correction point durable so the same approval can be resumed from Recent imports.
- [x] Reproduce the finished typeset page and artwork before approval.

### Approval

- [x] Approving a known-destination pending page changes it to approved in place.
- [x] Approving a Recent imports item requires or confirms a destination and creates one approved page.
- [x] Approval is idempotent and resumes correctly after a lost response.
- [x] Navigate to the approved page only after the server confirms the state change.
- [x] Keep artwork regeneration available after approval without reopening capture.

### Compatibility cleanup

- [x] Route the current add screen through the capture lifecycle module.
- [x] Remove the straight-to-book bypass that creates an approved page before review.
- [x] Keep retired review and generation routes only while deep links or unfinished legacy jobs still need them.
- [x] Remove capture tools from the general chat composer once cross-task handoff works.

### Phase 5 tests

- [x] Add inside cookbook uses the correct destination and opens only after confirmed approval.
- [x] Shelf capture without destination is retained by the Recent imports query and UI.
- [x] Clean extraction approves in one action.
- [ ] Detailed edit and Ask Nosh correction both return to the same review.
- [x] Lost approval response retries without creating another page.
- [ ] Three simultaneous captures retain independent state.
- [ ] Pending pages are excluded from approved search and counts.

### Primary file areas

- New `components/nosh/capture/`
- `app/(book)/[cookbookId]/add.tsx`
- `app/(book)/[cookbookId]/review.tsx`
- `app/(book)/[cookbookId]/index.tsx`
- `app/(book)/index.tsx`
- `components/cookbook/BookReader.tsx`
- `components/cookbook/BookTableOfContentsPage.tsx`
- `components/cookbook/UnifiedIntakeComposer.tsx`
- `utils/cookbook/noshToolkit.tsx`

### Phase 5 exit gate

- Capture has its own wrapper and never depends on an empty general chat.
- Every capture remains provisional until approval.
- Pending pages and Recent imports have honest, recoverable state.
- Approval produces exactly one approved recipe page.
- General conversation remains available while captures process.

**Phase 5 status:** Implemented locally on 2026-08-21. Cookbook Add, shelf Save a recipe, the Nosh capture task, and Recent imports now share one durable guided workspace. Known destinations produce pending pages; unknown destinations wait in Recent imports. The completed typeset page and artwork are shown before a database-confirmed, idempotent approval publishes the existing page in place. TypeScript, lint, and Jest pass locally. Migration execution and the rollback-only SQL approval proof remain deployment checks because the local Supabase server was intentionally skipped.

## Phase 6: native Share to Nosh

**Outcome:** A user can share a recipe source from another app, receive a durable Saved receipt, and return to the source app while Nosh processes it.

This is a native-integration phase. It requires development or preview builds and cannot be validated in Expo Go.

### Native feasibility gate

- [x] Research current Expo SDK 54 support for iOS Share Extensions and Android `ACTION_SEND` before selecting a package or config plugin.
- [x] Confirm the package is maintained, supports Expo modules under the project's architecture, and keeps the handoff inside an App Group.
- [x] Keep authentication in the main app; the iOS extension hands the payload through a private App Group.
- [x] Accept single `text/*` and `image/*` Android shares through `ACTION_SEND` intent filters.
- [ ] Build a small development-build spike before modifying the production capture UI.

### Share ingestion

- [x] Accept URLs, selected text, and images in the first native slice.
- [x] Normalize native payloads into the same `CaptureSource` used by in-app capture.
- [x] Upload private media before reporting Saved.
- [x] Leave destination unknown instead of guessing from recency.
- [x] Use the persisted capture lifecycle and idempotency key.
- [x] Handle signed-out, expired-session, and offline cases without clearing the handoff or falsely reporting Saved. The OS omits Nosh when it is not installed.

### Share receipt

- [x] Show a lightweight receipt with Saved state and an Open Nosh action.
- [x] Complete the native handoff after durable save so Android Back or app switching returns to the source app.
- [x] Do not wait for extraction or artwork inside the share extension.
- [x] Badge Recent imports in Nosh when a capture becomes Ready to review or Needs help.

### Phase 6 tests

- [ ] iOS device test shares a URL, text selection, and image from representative apps.
- [ ] Android device test sends the same supported source types.
- [ ] Offline share retains a recoverable local handoff or clearly states that saving failed.
- [ ] Duplicate OS delivery creates one capture.
- [ ] Signed-out share preserves the source long enough to complete after authentication without exposing it to another user.
- [ ] Returning to the source app does not cancel processing.

### Primary file areas

- `app.json`
- Native config plugin or package configuration selected by the feasibility gate
- New share payload adapter under `utils/cookbook/`
- Capture lifecycle module and Edge Function
- EAS development and preview build configuration

### Phase 6 exit gate

- Share to Nosh works on physical iOS and Android devices for the advertised source types.
- The extension reports Saved only after durable handoff.
- Processing continues after the share UI closes.
- Authentication, offline behavior, privacy, and duplicate delivery have tested outcomes.

**Phase 6 status:** The cross-platform native configuration, app-level ingestion, private image upload, signed-out and offline recovery, durable receipt, duplicate-delivery key, and in-app badge are implemented locally. Expo generated and verified the Android `ACTION_SEND` filters. Windows cannot generate the iOS Xcode target, and no physical-device development build was started, so the device tests and Phase 6 exit gate remain open.

## Phase 7: cooking, adaptation, and artwork actions

**Outcome:** Nosh remains conversational while structured previews make persistent recipe and artwork changes safe.

### Recipe action preview module

- [x] Move scaling, substitutions, and graph patch behavior behind one proposal interface.
- [x] Separate temporary cooking-session adaptations from persistent recipe updates.
- [x] Show a page-level preview and a compact action card before persistent changes.
- [x] Offer Use for this session, Save update, Save as new version, and Cancel when those choices apply.
- [x] Keep graph updates deterministic and typeset without artwork regeneration when only quantities or wording change.
- [x] Load another recipe through collection retrieval before modifying it.

### Conversational cooking

- [x] Keep open conversation as the default cooking help.
- [x] Support technique explanations, substitutions, troubleshooting, comparisons, and shopping lists through normal reasoning plus structured data.
- [x] Start walkthrough state only when the user asks to be guided step by step.
- [x] Resume progress during the same cooking session without treating it as permanent recipe state.
- [x] Keep timers temporary and device-owned.

### Artwork

- [x] Add regenerate-art as an explicit recipe action.
- [x] Add instruction-based image editing only after confirming the selected provider endpoint and input-image contract.
- [x] Preserve prior art as a selectable version until the user chooses the replacement.
- [x] Do not regenerate art for serving-count or wording changes unless the user asks for a visual change.
- [x] Keep generation credits idempotent and show cost before a paid regeneration commitment.

### Phase 7 tests

- [x] "Scale this for two" previews a temporary adaptation and leaves the stored graph unchanged.
- [ ] Save update persists once and retypesets the page.
- [ ] Save as new version preserves the original.
- [x] A substitution preview shows exactly which fields change.
- [x] Walkthrough begins only after an explicit request.
- [x] Art regeneration preserves the current page until a new version succeeds.
- [x] Failed art editing does not corrupt the Recipe Graph or selected art.

### Primary file areas

- New `utils/cookbook/recipeActions.ts`
- `utils/cookbook/noshToolkit.tsx`
- `components/nosh/recipe/`
- `components/cookbook/typesetter/TypesetterPage.tsx`
- `utils/cookbook/pageProduction.ts`
- `supabase/functions/generate-page-art/index.ts`
- Generation and credit SQL tests

### Phase 7 exit gate

- Conversational requests can propose structured changes without silently saving them.
- Temporary cooking adaptations do not rewrite the cookbook.
- Walkthrough remains optional.
- Text changes retype without art generation.
- Artwork changes preserve versions and credit safety.

**Phase 7 status:** Implemented locally on 2026-08-21. Scaling, substitutions, and graph patches now open one confirmation card instead of saving immediately. Temporary choices appear on the live page as a Session preview; saved updates persist only after confirmation, and saved copies leave the original untouched. Walkthrough mode starts only from an explicit user request. Artwork generation shows its one-credit cost, sends the current artwork as an image-editing reference when available, stores the result as an unselected candidate, and changes the selected version only after approval. TypeScript, lint, and focused Jest tests pass. The new migration and rollback-only SQL proof still require an authenticated Supabase environment; no local server or Docker was started.

## Phase 8: collection organization

**Outcome:** Shelf Nosh can help find and organize recipes across books, with guided confirmation for collection changes.

### Collection reasoning

- [x] Use retrieval results to find recipes by title, ingredient, tag, diet, category, cookbook, and recency.
- [x] Support comparison across several loaded recipes without putting the full collection into the prompt.
- [x] Let Nosh propose a cookbook destination or grouping while making clear when it is a suggestion.

### Collection actions

- [x] Add read-only cookbook listing as compact context or a tool.
- [x] Add move and copy now; keep existing cookbook creation and defer conversational reorder until a demonstrated need.
- [x] Render every available persistent organization proposal as guided UI. Conversational delete and bulk tools remain unavailable.
- [x] Require explicit confirmation before move or copy changes.
- [x] Make mutations idempotent and update React Query plus AsyncStorage caches from server-confirmed results.

### Phase 8 tests

- [x] "Move my cheesecake to Desserts" resolves the recipe and previews the move.
- [x] Ambiguous recipe or cookbook names require clarification.
- [x] Cancel leaves collection state unchanged.
- [x] Confirm updates the correct caches and reader route.
- [ ] Bulk proposals show the complete affected set before commitment. Bulk actions are intentionally not exposed in this phase.
- [x] Cross-user cookbook IDs are rejected by RLS or ownership validation.

### Primary file areas

- Recipe collection retrieval module
- `hooks/useCookbooks.ts`
- `hooks/useCookbook.ts`
- `utils/cookbook/api.ts`
- `utils/cookbook/noshToolkit.tsx`
- `components/nosh/collection/`
- Supabase ownership and mutation tests

### Phase 8 exit gate

- Nosh can reason across the collection and propose organization without guessing targets.
- Every persistent collection mutation has a visible confirmation.
- Cache, navigation, and database state agree after confirmed actions.

**Phase 8 status:** Implemented locally on 2026-08-21. Nosh can resolve recipes across the collection, load several selected graphs for comparison, list compact cookbook destinations, and present exact move or copy cards. Cancel performs no write. Confirmed actions use an ownership-checked, idempotent RPC, refresh both affected book queries and device caches from the server, update the shelf, and open the resulting page. Delete, bulk organization, and conversational reorder are deliberately unavailable until the product needs them. TypeScript, lint, and focused Jest tests pass. The migration and rollback-only SQL proof still require an authenticated Supabase environment; no local server or Docker was started.

## Separate memory architecture gate

Memory is important but not part of the phases above. Schedule a focused design session after Phase 2 establishes interaction context and before any feature stores inferred personal facts.

That session must decide:

- Which facts qualify as durable memory.
- How allergies and dietary restrictions differ from preferences.
- Whether Nosh may infer memory or must request confirmation.
- How users inspect, correct, forget, and temporarily override memory.
- Precedence between account memory, conversation instructions, recipe facts, and temporary cooking-session choices.
- Storage, encryption, retention, RLS, audit, and deletion behavior.
- How memory enters model context without loading an unbounded profile.

Until that design is accepted, use conversation context only. Do not silently write permanent preferences.

## Phase 9: hardening, rollout, and cleanup

**Outcome:** The context-aware model replaces the combined chat without losing reliability, privacy, accessibility, or recoverability.

### End-to-end verification

- [x] Automate the core journeys from the interaction specification.
- [x] Test shelf retrieval, active-recipe context, focus switching, several captures, pending approval, share handoff, adaptation preview, and collection organization.
- [ ] Add failure coverage for expired auth, offline state, extraction failure, art failure, lost responses, duplicate delivery, and stale jobs.
- [ ] Test representative small and large personal collections.

### Security and privacy

- [ ] Run Supabase advisors and review every new table, function, policy, index, Storage path, and function grant.
- [ ] Prove retrieval, capture, pending pages, and collection actions cannot cross user ownership.
- [x] Review source-media retention and account deletion coverage.
- [x] Keep service-role access out of the mobile client and share extension.
- [x] Confirm generated tool arguments cannot bypass database ownership checks.

### Performance and cost

- [ ] Measure retrieval latency and prompt tokens before considering embeddings.
- [ ] Measure cold restoration with several pending captures.
- [x] Track extraction, art generation, retry, and regeneration credit outcomes.
- [ ] Profile the conversation sheet and pending-page updates on representative devices.
- [x] Set a limit for candidate summaries and loaded Recipe Graphs per model turn.

### Accessibility and product quality

- [ ] Verify dynamic type, screen-reader order, touch targets, reduced motion, and status announcements.
- [x] Ensure Saved, Reading, Ready to review, Needs help, and Added do not rely on color alone.
- [ ] Verify timers and walkthrough controls remain usable while cooking.
- [x] Check every wrapper has a clear close, back, resume, and retry path.

### Rollout

- [ ] Release retrieval to internal builds first.
- [ ] Release context and wrapper changes behind the feature flag.
- [ ] Release persisted in-app capture before native sharing.
- [ ] Release native sharing by platform after physical-device acceptance.
- [ ] Monitor no-match rate, ambiguity rate, correction rate, capture completion, approval, processing failures, and duplicate prevention.
- [x] Define rollback behavior for client flags and database migrations before each production deploy.

### Cleanup

- [ ] Remove the old combined composer and stale intent code after the new path is stable.
- [x] Remove capped current-book title injection.
- [ ] Remove compatibility routes only after old deep links and unfinished jobs no longer require them.
- [ ] Delete tests that inspect replaced shallow implementation details once interface-level tests cover the behavior.
- [x] Reconcile `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and development documentation.

### Phase 9 exit gate

- All product acceptance criteria in the interaction specification pass.
- Retrieval and every mutation remain user-scoped.
- The replacement flow handles cold start, offline state, retries, and lost responses.
- Physical-device sharing works on supported platforms.
- The feature flag can be removed without restoring the old everything box.
- Documentation describes the shipped system rather than the migration path.

**Phase 9 status:** Local hardening implemented on 2026-08-21. The complete Jest suite (45 suites, 167 tests), strict TypeScript, and zero-warning lint pass. The context-aware web preview loads without console errors and shows separate collection conversation and recipe-capture wrappers. Phase 9 is not production-complete: pending migrations and Edge Functions have not been deployed, staging SQL proofs and post-migration advisors have not run, client analytics still needs a production sink, and the physical iOS/Android sharing, accessibility, cold-restoration, and representative-device performance matrix remains open. See `docs/PHASE9_RELEASE_RUNBOOK.md`.

## Milestone releases

### Milestone A: collection-aware Nosh

Phases 0 through 3. Nosh can find any recipe, keep explicit focus, and present different shelf and recipe conversation starts.

### Milestone B: trustworthy capture

Phases 4 and 5. Captures persist, process independently, appear as pending pages or Recent imports, and require approval.

### Milestone C: Share to Nosh

Phase 6. Native share handoff works on physical iOS and Android devices.

### Milestone D: capable cookbook agent

Phases 7 and 8. Nosh adapts recipes, offers optional walkthroughs, manages artwork versions, and proposes collection organization through confirmations.

### Milestone E: production replacement

Phase 9. The context-aware model is measured, documented, accessible, secure, and no longer depends on the old combined interface.

## First executable slice

Begin with Phase 0 baseline work, then implement one Phase 1 journey end to end:

> From shelf Nosh, the user asks, "Give me the ingredients for my cheesecake recipe." Nosh searches only that user's collection, loads the clear match, and answers from the stored ingredient groups. With two plausible cheesecakes, Nosh asks which one.

That slice should include the migration, RLS proof, retrieval module, two Nosh tools, adapter loop, focused UI result, and tests. It is small enough to review and strong enough to prove the product model.
