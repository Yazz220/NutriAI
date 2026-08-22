# Nosh Course-Correction Plan

> Historical plan. The book-first direction remains, but current capture and page generation are defined by `docs/PRODUCT_FLOW.md` and ADR 0002.

**Status:** Superseded implementation record
**Product:** A book-first personal cookbook builder  
**North star:** Every import should feel like placing a finished page into a book you own.

This plan supersedes older implementation direction where it conflicts with the current product. Historical plans remain useful context, but they are not the active roadmap.

## Execution Priority Update — 2026-08-09

The e-book experience is the selling point. Further image-generation and extraction-pipeline refinement is paused unless it blocks the book demo or risks user data/credits.

The active sequence is now:

1. Complete the product hierarchy and book-scoped navigation reset.
2. Build and validate the signature shelf, cover-opening, reader, page-turn, and page-insertion experience using deterministic fixtures or existing pages.
3. Refine the deterministic recipe-page layouts inside the proven book shell.
4. Return to import breadth, generated imagery, placement, and provider-pipeline optimization after the book concept works seamlessly.

Remaining Phase 0 fixture and validation work is deferred, not discarded. Completed reliability safeguards remain the baseline.

## Context-aware Nosh roadmap, 2026-08-21

Assistant context, collection retrieval, and capture wrappers now follow [the context-aware interaction roadmap](./2026-08-21-nosh-context-aware-interaction-roadmap.md). That roadmap supersedes the assistant and universal-capture sections below where they conflict, while preserving the completed reader, typesetter, generation-safety, and credit work.

## Product Principles

1. **The cookbook is the product.** AI supports capture, organization, illustration, and cooking; it is not the primary shell.
2. **Trust before magic.** Exact ingredients and instructions, resilient drafts, truthful errors, and safe credit handling take priority over visual effects.
3. **One continuous object.** Shelf, cover, reader, table of contents, and inserted pages should feel like states of the same book.
4. **Deterministic content, generative art.** Critical recipe text is rendered by the app. AI can generate imagery, texture, and art direction.
5. **Motion explains change.** Opening, turning, and inserting pages deserve choreography. Forms and cooking controls remain fast.
6. **Progressive ambition.** Each phase has an exit gate. Later polish cannot conceal an unfinished reliability phase.

## Foundation Decision

Retain:

- Supabase private-schema/RLS architecture and Edge Function provider boundaries.
- Cookbook, page, structured-recipe, section, version, and credit-ledger domain models.
- Expo Router's shelf -> book -> add -> review -> generation route shape.
- React Query server state and AsyncStorage cache direction.
- Separate shelf, book, import, generation, and assistant responsibilities.

Rework:

- Query and mutation error contracts.
- Import draft lifetime, extraction grounding, and proofing UI.
- Generation job safety, retry behavior, and credit idempotency.
- Reader navigation, gestures, and transition architecture.
- Navigation hierarchy and template placement.
- Assistant conversation state and structured cooking actions.

Replace:

- AI-generated full-page raster images as the authoritative recipe text.
- The flat card/slider reader as the final reading experience.
- Generic persistent application navigation that competes with the shelf/book hierarchy.

## Phase 0 — Recovery, Truth, and Guardrails

**Outcome:** The existing golden journey is trustworthy before visual redesign begins.

### 0A. Truthful client states and continuity

- [x] Distinguish shelf/book load failures from genuinely empty data.
- [x] Keep source input and attachments alive during parsing, failure, and temporary route changes.
- [x] Route “View in book” to the generated page instead of resetting to the cover.
- [x] Add focused regression coverage for these state contracts.
- [x] Add explicit mutation error surfaces instead of Alert-only recovery for the cookbook journey (create, import, and generate actions retain retryable in-context state).
- [x] Persist safe text-source drafts across app restarts; define attachment persistence limits (text only, scoped to the signed-in user; images remain memory-only).
- [x] Reconcile offline cache states with “stale but usable” messaging in the shelf and reader, including a manual refresh action.

### 0B. Safe generation and credits

- [x] Add bounded request timeouts and cancellation to authenticated Edge Function calls.
- [x] Generate and reuse a client idempotency key for each page-generation attempt.
- [x] Make server creation and credit reservation idempotent under retries and lost responses.
- [x] Apply the generation-request migration and deploy the paired Edge Function when the linked project is active.
- [x] Separate queued/running/succeeded/failed generation state from a single synchronous request.
- [x] Prove duplicate claims spend once and duplicate failures refund once with a rollback-only live database test.
- [x] Add deterministic compensation coverage for image-provider, storage, version-write, and completion failure stages.
- [x] Prove with stage-specific compensation tests and a rollback-only live database matrix that storage, image-provider, version-write, and completion failures refund exactly once and clean generated resources once.

### 0C. Extraction trust

- [x] Preserve model category/tags and validate them against supported cookbook sections.
- [x] Prioritize Recipe/JSON-LD and source metadata before noisy page text.
- [x] Remove URL-only video inference that can fabricate ungrounded recipes.
- [x] Wire confidence, review reasons, and provenance into the proofing screen.
- [x] Preserve structured quantity/unit/name fields through common edits.
- [ ] Define acceptance fixtures for URL, text, screenshot, and grounded video-link imports.

### 0D. Repeatable validation

- [ ] Restore deterministic sample cookbooks and imported-recipe fixtures.
- [ ] Add integration coverage for shelf -> book -> add -> review -> generate -> opened page.
- [ ] Add failure tests for offline, auth expiry, parser failure, generation timeout, and retry.
- [ ] Add lightweight visual snapshots for critical states.
- [ ] Reconcile architecture documentation with the active implementation.

### Phase 0 exit gate

- No transient failure is presented as an empty library or empty cookbook.
- User-entered source text survives retry and ordinary back/forward movement.
- A retry cannot double-charge or create duplicate pages.
- Generated recipe content can be traced to reviewed structured data.
- The generated-page CTA opens the intended page.
- The golden journey and its important failure paths are covered by automated tests.

## Phase 1 — Product Hierarchy and Navigation Reset

**Outcome:** The application feels organized around owned cookbooks rather than generic tabs.

- Remove the persistent bottom navigation from the product core.
- Make the shelf the authenticated home and settings a shelf-level utility.
- Move templates into cookbook creation and add-page/page-style flows.
- Define book-scoped navigation for contents, pages, adding, and the assistant.
- Consolidate design tokens and remove compatibility remnants from the abandoned migration.
- Establish the information architecture for cookbook customization, rename, reorder, and delete.

### Phase 1 exit gate

A user can explain the hierarchy as “my shelf -> my book -> its pages” without encountering a competing app model.

## Phase 2 — Deterministic Recipe Page System

**Outcome:** Recipe pages are beautiful, editable, accessible, and exact.

- Build a native/Skia/SVG composition pipeline for recipe pages.
- Keep title, metadata, ingredients, and steps as live deterministic text.
- Use AI only for optional illustration, food imagery, texture, and ornaments.
- Create a small set of responsive page templates for short, normal, and long recipes.
- Support reflow, accessibility scaling, export/share rendering, and versioned regeneration.
- Make page preview reflect exactly what will be inserted into the book.

### Phase 2 exit gate

No critical cooking instruction depends on image-model typography, and the same reviewed recipe renders consistently across supported devices.

## Phase 3 — Signature Book Experience

**Outcome:** Nosh has a distinctive, coherent, tactile reading experience.

- Create materially distinct covers with spine, page-block, edge, and depth cues.
- Choreograph shelf press -> book reveal -> cover opening -> reader settlement.
- Implement a restrained page turn with curvature, layered shadows, and stack movement.
- Support swipe, edge tap, explicit controls, and reduced-motion behavior.
- Animate a generated page inserting and settling into its cookbook.
- Add a fast, distraction-free cooking mode where novelty motion is minimized.
- Validate gestures and frame pacing on mid-range physical iPhones.

### Phase 3 exit gate

Opening, turning, and inserting a page feel authored and continuous without delaying practical cooking tasks.

## Phase 4 — Universal Capture

**Outcome:** Users can reliably turn discoveries from anywhere into reviewable recipes.

- Unify paste, share, URL, text, image, camera, uploaded video, and audio capture.
- Auto-detect source type while keeping an explicit override.
- Add resumable upload/background processing for large media.
- Show source previews and real processing stages.
- Retain source provenance and link back to the original discovery.
- Design clear privacy, retention, and deletion behavior for uploaded media.

### Phase 4 exit gate

Each advertised source type has a grounded extraction path, retry behavior, progress state, and fixture-based acceptance test.

## Phase 5 — Cooking Utility and Nosh Assistant

**Outcome:** The assistant becomes genuinely useful inside the active cookbook.

- Send conversation history and reset/scope it deliberately when pages change.
- Distinguish assistant errors from generated responses and provide retry.
- Implement scaling, substitutions, timers, and shopping lists as structured actions.
- Keep current-page context primary and cookbook context secondary.
- Add safety rules for allergies and ambiguous ingredient substitutions.

### Phase 5 exit gate

Follow-up questions are truly conversational, context is never silently switched, and common cooking actions have deterministic results.

## Phase 6 — Ship Hardening

**Outcome:** A measured, accessible, supportable release candidate.

- Run end-to-end flows on supported iOS devices and representative network conditions.
- Meet accessibility targets for labels, contrast, dynamic type, focus, and reduced motion.
- Instrument import success, correction rate, generation success, time to first page, and crash-free sessions.
- Review storage visibility, account deletion, source-media retention, and public sharing boundaries.
- Add release monitoring, migration rollback notes, and support diagnostics.
- Complete App Store privacy, permission, and purchase/credit disclosures.

### Phase 6 exit gate

The release candidate passes the golden journey, failure matrix, accessibility review, performance budget, privacy review, and account/credit lifecycle tests.

## Execution Rule

Work in vertical, reviewable slices. Every slice must include:

1. A user-visible or system-level acceptance statement.
2. A regression test at the lowest useful level.
3. Typecheck, lint, and relevant test verification.
4. A short update to this plan marking completed and remaining work.

Do not begin Phase 2 or Phase 3 implementation while Phase 0's trust and credit-safety exit gate remains unresolved.

> **Status update — 2026-08-20:** Phase 2 (deterministic recipe page system) and
> Phase 3 (signature book experience) have been substantially implemented via the
> 3D shelf, creation studio, and Skia-based reader (see
> `2026-08-18-nosh-reader-feel.md` and `2026-08-18-nosh-reader-handoff.md`). The
> reader is now in maintenance/polish mode. The remaining open Phase 0 item is
> **0D — Repeatable validation**: integration coverage for the persisted
> shelf → book → add → review → generate → opened-page journey is still missing.
> That validation work is the next priority now that the bypass-auth mock has been
> removed and the real Supabase journey is reachable again.

## Signature Book Rebuild — 2026-08-09 Direction Reset

The book experience is now the product priority. Import extraction and generated-image pipeline refinement are intentionally deferred until the book object, reader, and page interactions are visually convincing and reliable.

### Reference principles retained

- Treat the cookbook as one continuous object from closed cover through open spreads.
- Use camera-like focus, material depth, page-block cues, and delayed controls to create anticipation.
- Keep the surrounding interface quiet so the book owns the screen.
- Preserve a true two-page browsing mode, then provide a focused single-page mode for legible cooking on phones.
- Use an in-book table of contents for orientation and direct access.

### Reference effects not copied directly

- Do not make WebGL a hard requirement for every platform during direction validation; prove the physical scene on web, then port the approved interaction to Expo GL.
- Do not make full-spread raster art or a magnifying glass the primary recipe-reading interaction.
- Do not sacrifice text legibility or accessibility to preserve a desktop showcase composition on phones.

### 3D implementation decision — 2026-08-09

- The browser reader now uses React Three Fiber and Three.js for a real perspective scene rather than layered 2D transforms.
- The signature cookbook is the only built-in creation option and the development shelf shows only that canonical book while its interaction is refined.
- The scene includes separate cover, back cover, spine, page block, elastic, ribbon, content leaves, lighting, and ground-shadow geometry.
- Cover opening uses a physical hinge and camera settlement; page navigation uses a segmented, deforming, two-sided turning leaf.
- Native currently retains the earlier 2.5D fallback. Port the approved scene to React Three Fiber Native/Expo GL only after drag behavior and art direction are accepted on web.

### Rebuild phases

#### Book phase 1 — Physical scene foundation

- [x] Replace the flat horizontal card pager with a deterministic spread model.
- [x] Keep bookplate, contents, recipe leaves, and final blank leaf in stable left/right pairs.
- [x] Make the real cover animate into the same open-book object.
- [x] Add page block, cover edge, gutter shading, cast shadow, and quiet staged controls.
- [x] Add a focused single-page reading view for recipe legibility.
- [x] Restore a development-only deterministic sample cookbook with real page artwork.
- [x] Validate closed, opening, open contents, recipe spread, focused page, and narrow-screen states in the browser.

#### Book phase 2 — Tactile page turns

- [ ] Replace the temporary settle transition with drag-driven page-turn progress.
- [x] Add a hinged turning leaf, real mesh curvature, moving shadow, and page-stack transfer for button/tap navigation.
- [ ] Support swipe, drag-following edge interaction, explicit buttons, cancel/snap-back, and velocity-based completion.
- [ ] Add reduced-motion behavior and haptic milestones on native devices.

#### Book phase 3 — Recipe spread system

- [ ] Define intentional left/right recipe pairings rather than merely pairing by order.
- [ ] Create live-text recipe layouts for book browsing and cooking focus modes.
- [ ] Add page overflow/reflow rules for short, normal, and long recipes.
- [ ] Make contents, page numbering, section openings, and empty leaves style-aware.

#### Book phase 4 — Shelf and insertion continuity

- [ ] Carry the selected shelf book geometry into the reader reveal.
- [ ] Add close-to-shelf choreography and retained reader position.
- [ ] Animate a newly generated page entering the page block and settling into its spread.
- [ ] Add recipe reorder and page-style controls inspired by Fieldbook's editor, adapted to cookbook tasks.

#### Book phase 5 — Device polish

- [ ] Profile frame pacing on representative iPhones and Android devices.
- [ ] Tune scale, safe areas, shadows, and typography across phone, tablet, and web widths.
- [ ] Verify screen-reader order, touch targets, contrast, dynamic type, and reduced motion.

### Book rebuild exit gate

The phase is complete when opening, browsing, focusing, closing, and inserting pages feel like operations on one authored cookbook; recipe content remains legible while cooking; and motion stays responsive on supported native devices.
