# Nosh context-aware interaction model

> Partially superseded by ADR 0002. The single Nosh identity and context model remain current. Review, approval, pending-page, and split typesetter/art guidance is historical.

**Date:** 2026-08-21
**Status:** Partially superseded
**Scope:** Interaction behavior before further pipeline work

## Purpose

Nosh is one cooking assistant presented through purpose-built interactions. The user should meet the same voice, intelligence, collection knowledge, and future memory everywhere, but the entry point must make the current job clear.

Nosh has three top-level jobs:

1. Capture recipes.
2. Help the user cook and adapt recipes.
3. Help the user find and organize recipes across the collection.

The app must not collapse those jobs into one empty chat box. ChatGPT needs a general input because its scope is unbounded. Nosh has a narrower promise and can offer a clearer start.

## Core rules

### One Nosh, different wrappers

Nosh is the same assistant in every wrapper. Identity, behavioral rules, collection access, and future memory remain consistent. The wrapper controls the active task, available actions, and presentation.

The same model may reason inside every wrapper. A guided wrapper is not a less intelligent assistant. It is a clearer way to collect inputs, show state, and request approval.

### Conversation for reasoning, guided UI for commitment

Use conversation when the user needs explanation, interpretation, troubleshooting, comparison, adaptation, or open-ended cooking help.

Use guided UI when Nosh needs a source, destination, correction to structured fields, explicit approval, or another action that changes cookbook state. Conversation may produce a guided card when reasoning reaches a commitment.

### Entry points establish a task contract

An entry point does more than set placeholder text. It starts a task with a known purpose. Nosh may recognize a request that belongs to another task, but it must show the transition rather than silently changing jobs.

Example: if the user pastes a new recipe into a cooking conversation, Nosh can offer to capture it. Accepting that action opens a capture while preserving the conversation.

### Active context supplies focus, not access

The visible recipe, cookbook, capture, or shelf gives Nosh its first interpretation of words such as "this" and "here." It does not limit what Nosh can know.

Every approved recipe across every cookbook belongs to the searchable recipe collection. Nosh can retrieve another recipe, compare several recipes, create a shopping list, or shift focus when the user's request calls for it.

### Keep consequential state visible

Nosh must show what it is working on, which recipe or capture is in focus, what changed, and whether the user still needs to approve something. A prose response is not enough when data or cookbook state will change.

## Interaction map

| Entry point | Starting context | Wrapper | Primary outcome |
|---|---|---|---|
| Share to Nosh from another app | Shared source, optional default cookbook | Lightweight capture receipt followed by capture review | A pending capture ready for approval |
| Add recipe inside a cookbook | Shared or entered source plus known cookbook | Guided capture | A pending page in that cookbook |
| Ask Nosh from a recipe | Visible recipe plus its cookbook | Collection-aware conversation seeded with that recipe | An answer, adaptation, action, or shift to another recipe |
| Nosh from the shelf | Entire recipe collection | Collection conversation with explicit starting choices | Find, compare, organize, or act across cookbooks |
| Walk me through this | Focused recipe | Conversational walkthrough with step controls when useful | On-demand cooking guidance |

Nosh should not use a universal floating launcher on screens where no meaningful context or job is available. Launchers should name the job they start.

## Capture interaction

### Starting capture

Capture may begin from the operating-system share sheet, inside a cookbook, or from a collection-level Nosh interaction. Supported sources include links, pasted text, recipe photos, screenshots, and video links.

Sharing from another app should show a small receipt confirming that Nosh secured the source. Processing continues without forcing the user to remain in Nosh. The receipt may offer an explicit Open Nosh action.

### Capture locations

A destination is known only when one of these conditions is true:

- The user started capture inside a cookbook.
- The user selected a cookbook.
- The user configured a default cookbook.

A recent cookbook or a similarity guess is a suggestion, not a known destination.

When the destination is known, Nosh creates a pending page inside that cookbook. When the destination is unknown, Nosh places the capture in Recent imports. Recent imports is an inbox, not a cookbook.

### Capture states

The user-facing states are:

1. **Saved.** Nosh secured the original source.
2. **Reading.** Nosh is extracting and producing the recipe.
3. **Ready to review.** The complete pending result is available.
4. **Needs help.** Nosh could not finish without another source or a correction.
5. **Added.** The user approved the result and it became a recipe page.

Navigation may group unfinished states under Pending, but each capture must show its actual state.

Several captures may process at once. Capture work does not block a cooking conversation or become turns in its transcript.

### Production before approval

Nosh completes extraction, typesetting, and artwork generation before final approval. A pending page may therefore look finished, but it remains visibly provisional.

Approval is the commitment that adds the recipe to the cookbook. For a pending page, approval converts it into a recipe page in place. For a Recent imports item, approval includes choosing a cookbook and creates the recipe page there.

### Review

The default review is compact. It shows the source, recipe title, destination, ingredient and step counts, and fields where Nosh is uncertain. A clean extraction should require one approval action, not a field-by-field inspection.

The user can open detailed editing when needed. Review supports both direct edits and an Ask Nosh to fix this action. A correction conversation remains attached to the capture and returns the user to the same approval point.

If extraction fails, Nosh keeps the original source and marks the capture Needs help. Recovery may request screenshots, pasted text, missing details, or a retry. Nosh must not discard the source because a model call failed.

## Collection-aware conversation

### Starting focus

Ask Nosh from a recipe seeds the conversation with that recipe. Nosh from the shelf begins with the collection and offers concrete starting choices such as:

- Find something to cook
- Review pending captures
- Organize recipes
- Create or curate a cookbook

These choices prevent an empty general-purpose box without limiting what the conversation can become.

### Resolving recipe references

Nosh resolves a recipe reference in this order:

1. Use the active recipe when the user clearly refers to "this" or the visible page.
2. Consider recipes already referenced in the conversation.
3. Search the full recipe collection.
4. Ask a short question when several candidates remain plausible.

When Nosh retrieves a recipe, it need not navigate to that page. A request to open or show the recipe navigates. A request for ingredients, comparison, or a shopping list may answer inline with an optional Open action.

Examples:

- "Scale this for two" uses the visible recipe.
- "Open the noodle recipe I saved" searches, resolves, and opens it.
- "What do I need for my cheesecake?" loads the saved cheesecake and answers from its ingredient data.
- "Combine the shopping lists for the cheesecake and lasagna" retrieves both recipes.
- "Use the cheesecake from Mom's book" uses the cookbook name to disambiguate.

### Conversation continuity

A general Nosh conversation belongs to Nosh, not to one recipe. The thread tracks which recipes it has referenced and which one is currently in focus. It may move between recipes as the user asks.

Opening Ask Nosh from another recipe must not silently change the meaning of an already active conversation. The interface should offer to focus the current thread on the new recipe or start another conversation.

Past threads remain available without combining every capture and cooking task into one transcript. Capture correction history stays with its capture. General collection and cooking conversations may be opened from the shelf or reader with their current focus shown.

## Cooking and adaptation

### Conversation is the default

Cooking help should sound like a capable chef, not a scripted wizard. Nosh answers questions, explains techniques, suggests substitutions, troubleshoots failures, and reasons about adaptations in conversation.

Nosh starts a walkthrough only when the user asks for step-by-step guidance. A walkthrough may add progress, timers, and step controls, but it remains conversational and the user can deviate at any time.

### Commitment rules

Nosh may perform these actions immediately:

- Answer or explain.
- Calculate quantities.
- Guide the next step.
- Start a requested temporary timer.
- Prepare a temporary cooking-session adaptation.

Nosh must show a preview and request confirmation before it:

- Saves changed servings, ingredients, or instructions to a recipe page.
- Moves a recipe between cookbooks.
- Replaces an original recipe or applies several persistent edits.
- Finalizes a capture.

Scaling for the current cooking session does not rewrite the saved recipe. The user may choose to save the adaptation as an update or a new version.

### Text and artwork changes

Recipe quantities and wording belong to the Recipe Graph. Nosh updates structured data and the typesetter reflows the page without regenerating artwork.

Visual changes use image editing or regeneration. The user may ask Nosh to change the dish illustration, create another option, or regenerate unsatisfactory art. When a visual change accompanies a recipe adaptation, Nosh may generate an updated illustration and present the complete page for selection.

## Retrieval contract

The collection is Nosh's private retrieval corpus. A large model context window does not justify sending every full Recipe Graph on every turn.

The first implementation should expose two read-only tools:

- `search_recipe_collection` returns a small ranked set of recipe summaries from all of the authenticated user's cookbooks.
- `load_recipe` returns the canonical Recipe Graph for one selected page.

The active recipe and cookbook act as ranking hints. The database enforces ownership. The model decides when to retrieve, but it cannot choose rows outside the authenticated user's collection.

Start with structured filters, weighted Postgres full-text search, and title matching tolerant of voice transcription errors. Add embeddings only after real queries expose meaningful semantic misses. The detailed implementation research lives in [2026-08-21-nosh-collection-retrieval-research.md](./2026-08-21-nosh-collection-retrieval-research.md).

## Memory boundary

Nosh will eventually share long-term memory across every wrapper. Allergies, diets, household size, and stable preferences are important to a cooking assistant.

This specification does not decide memory storage, inference, consent, correction, deletion, or precedence. Those decisions require a separate architecture session. Until then, current conversation context must not be mistaken for permanent memory.

## Experience scenarios

### Share while browsing social media

The user shares a cooking video to Nosh. A lightweight receipt confirms Saved and returns them to the source app. Nosh processes it in the background. With a default cookbook, the result appears there as a pending page. Without one, it appears in Recent imports. The user later reviews the finished recipe and artwork, makes one correction through Nosh, and approves it.

### Ask from an open recipe

The user opens a noodle recipe and asks, "Can I make this without peanuts?" Nosh treats the visible recipe as "this," explains the substitution, previews the adapted ingredients, and asks whether the change is temporary or should be saved.

### Refer to another saved recipe

While the noodle recipe remains visible, the user says, "Actually, open the ramen I saved last month." Nosh searches the collection. If one result is clear, it opens that page. If two are plausible, Nosh asks which one using their titles and cookbook names.

### Shop without opening a cookbook

The user opens Nosh from the shelf at a supermarket and asks for the ingredients in their cheesecake recipe. Nosh retrieves the saved recipe and produces a grounded shopping list. It asks which cheesecake only when the collection contains plausible alternatives.

### Request a walkthrough

The user says, "Walk me through this." Nosh begins with the first relevant step, offers timers when the recipe calls for them, and answers deviations conversationally. Closing and reopening during the same cooking session resumes progress.

### Process several captures

The user shares three recipes, then returns to a cooking conversation. All captures continue independently and appear with their own states. None of their extraction messages pollute the cooking transcript.

## Current implementation conflicts

The existing code provides useful foundations but does not yet implement this model:

- `NoshConversationContext` distinguishes only `chat` and `intake`.
- Both intents render the same sheet, transcript, suggestions, and composer.
- The composer combines both promises with "Drop a recipe link or ask Nosh."
- Reader intake may show recipe-help suggestions because suggestions depend on page presence rather than intent.
- The server prompt says conversation is the main interface and discourages separate forms.
- Nosh receives only a capped list of titles from the active cookbook rather than retrieval across the collection.
- The app has outbound page sharing but no inbound Share to Nosh integration.

Implementation should preserve the existing Recipe Graph, tool-calling loop, root availability, and live page context while replacing the single-wrapper assumption.

## Non-goals

This specification does not define:

- Long-term memory architecture.
- Embedding infrastructure before retrieval evidence requires it.
- A mandatory guided cooking mode.
- A universal transcript containing captures and every conversation.
- Silent automatic merging of duplicate captures.
- Native share-extension implementation details.
- A top-level shopping or meal-planning product area.

## Product acceptance criteria

The interaction model is correctly implemented when:

1. A user can identify the active job before typing.
2. Sharing a source starts capture, not an empty chat.
3. Capture state and approval remain visible until completion.
4. Ask Nosh starts with relevant context but can retrieve any saved recipe.
5. Nosh asks before changing persistent cookbook state.
6. Cooking help remains conversational unless the user requests a walkthrough.
7. Concurrent captures do not block or pollute conversations.
8. No model request receives the full recipe collection without retrieval need.
9. Every collection query remains scoped to the authenticated user.
