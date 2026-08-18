# Nosh reader feel: physical book polish plan

Date: 2026-08-18
Status: in progress
Benchmark: StPageFlip / react-pageflip (https://nodlik.github.io/react-pageflip/)

## Goal

Make reading and flipping a Nosh cookbook feel physical and delightful.
Pages are assumed to exist; this plan excludes generation, data pipelines, and
assistant work. Scope is the visual reading experience only.

## Benchmark mechanics we are targeting

1. Corner grab: the leaf corner tracks the pointer position (not accumulated drag distance).
2. Soft-page deformation: the leaf curls while turning and shows its back face.
3. Momentum-aware release: flick velocity carries into the settle animation.
4. Interruptibility: a turning page can be re-grabbed mid-flight; drags reverse naturally.
5. Continuous presence: shadows deepen with lift, cover opens with weight, no dead zones.

## Current-state audit summary

- Native runs a weak renderer (`Cookbook3DScene.tsx`): rigid rotateY card pivot,
  no curl, no back face, distance-based progress, fixed spring settle, input
  dead during settle, instant cover swap on open/close.
- Web runs a full three.js book (`Cookbook3DScene.web.tsx`) with curl and stacks,
  but drag progress is window-size-based (leaf lags cursor on wide screens) and
  settle duration ignores flick velocity.
- Static zones: native tilted/browse mode has no turn gesture or animation;
  mode switches and focused page are crossfades/hard cuts.
- Bugs: web contents texture lists only 8 pages and is not interactive;
  Suspense fallback is blank; native turn handoff can flicker; counter
  semantics change between modes.

## Phases

### Phase 1 — shared turn physics core + native gesture rebuild

Deliverables:

- `utils/cookbook/physicalBook.ts` gains pure, worklet-safe functions:
  - `resolveTurnProgress(grab)`: pointer-position-driven progress, anchored at
    the grab point, reversible (finger back = page follows back), edge
    resistance when no page exists in that direction.
  - `resolveTurnRelease({...})`: commit decision (velocity projection, shared
    with existing `shouldCommitPageTurn`) plus `settleVelocity` in
    progress-units/sec so release speed enters the animation.
  - `estimateTurnSettleDuration(progress, target, velocity)`: for the web
    timed-settle path; faster flicks settle faster, clamped.
- Native `Cookbook3DScene.tsx` gesture rewired:
  - progress from `event.x` position instead of `translationX` distance,
  - vertical tolerance relaxed (diagonal pulls do not fail the pan),
  - `withSpring` receives release `velocity`,
  - `isSettling` no longer blocks a new grab (cancelAnimation + take over).
- Web `Cookbook3DScene.web.tsx` drag handlers consume the same core:
  progress anchored to grab point and measured against the book spine
  (canvas center), fixing window-width coupling; settle duration from
  `estimateTurnSettleDuration`.
- Unit tests for all new pure functions; existing tests stay green.

### Phase 2 — native curling leaf (Skia)

- Render the turning leaf as a Skia mesh (grid ~40x4) deformed by the existing
  `buildPageCurlCurve` (already shared with web) driven by a Reanimated shared
  value; page image via Skia image shader.
- Back face: mirrored image with paper tint; lift-following gradient shadow
  cast onto the resting page.
- Replaces the rigid rotateY stack for `isPhysicalPageReading`.

### Phase 3 — open/close animation (native)

- Animate the existing `opening` shared value into a cover pivot (rotateY from
  the spine with perspective) or a shared zoom from cover to open spread.
- Close reverses the same motion. No more instant conditional swap.

### Phase 4 — kill static zones

- Turn gesture available in browse mode (or unify modes).
- Animated tilted/topdown transitions instead of FadeIn/FadeOut.
- Focused page opens with shared motion from the leaf instead of a modal cut.

### Phase 5 — bug fixes and presence polish

- Web contents: render all pages (or paginate) and make entries jump
  consistently with native.
- Web Suspense fallback: render the closed book immediately, not blank.
- Native turn handoff: pin the landing frame until React commits (mirror web).
- Counter semantics unified; chrome auto-hide on native; haptics at grab and
  cancel in addition to commit.

### Phase 6 — verification pass

- Jest coverage for physics core; typecheck, lint, full test run.
- Manual feel pass on device and web against the benchmark demo.

## Verification commands

```bash
npm test
npm run typecheck
npm run lint
npx expo start --web --port 8081
```
