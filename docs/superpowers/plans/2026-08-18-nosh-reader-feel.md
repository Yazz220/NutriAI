# Nosh reader feel: physical book polish plan

Date: 2026-08-18
Status: in progress (Phases 1–4 complete, Phase 5 remaining)
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

### Phase 1 — shared turn physics core + native gesture rebuild [complete]

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

### Phase 2 — native curling leaf [complete]

The turning leaf is rendered as a Skia `Vertices` mesh (30×12 grid) deformed by
`buildPageCurlCurve` with per-row progress modulation (`computeRowTurnProgress`)
for corner grabs. The mesh uses fixed texture coordinates mapped to the page
image via `ImageShader`.

A fragment shader approach was attempted (per-pixel GLSL RuntimeShader that
computes source UV independently for each pixel, eliminating texture stretching)
but produced a "tube-like" crawl that didn't match the feel of the vertex mesh.
The shader code is kept in the codebase for future reference but the vertex mesh
is the active renderer.

Files:
- `components/cookbook/TurningLeafSkia.tsx` — active vertex mesh renderer
- `utils/cookbook/pageCurlShader.ts` — fragment shader (experimental, not active)
- `components/cookbook/TurningLeafShader.tsx` — shader component (experimental, not active)
- `Cookbook3DScene.tsx` uses `TurningLeafSkia` in both spread and one-page modes

Known limitation: the vertex mesh stretches textures slightly on diagonal corner
grabs due to fixed UV interpolation across sheared triangles. This is acceptable
for now — the fragment shader approach can be revisited later with better tuning.

### Phase 3 — open/close animation (native) [complete]

- Cover pivots open around the spine with `rotateY` + perspective (980ms,
  `Easing.bezier(0.22, 0.72, 0.24, 1)`), fading out as it opens.
- Stage reveals with a scale + translate animation (0.93→1.0, 12px→0).
- Close reverses the same motion (620ms, `Easing.bezier(0.5, 0, 0.75, 0.2)`).
- No instant conditional swap — cover and stage stay mounted through the
  animation and unmount after the settle completes.

### Phase 4 — kill static zones [complete]

- Turn gesture is available in both browse/spread mode and one-page reading
  mode. The `TurningLeafShader` renders in both branches of
  `Cookbook3DScene.tsx`.
- Mode transitions use zoom entering/exiting animations (280ms enter, 220ms
  exit) instead of FadeIn/FadeOut crossfades. Entering view scales up from 0.94
  (feels like coming toward you); exiting view scales down to 0.94.
- Focused page opens with the same zoom motion from the spread view.

### Phase 5 — bug fixes and presence polish [remaining]

- Web contents: render all pages (or paginate) and make entries jump
  consistently with native. Currently the web contents texture lists only 8
  pages and is not interactive.
- Web Suspense fallback: render the closed book immediately, not blank.
- Native turn handoff: pin the landing frame until React commits (mirror web).
  The display-index lag system (`displaySpreadIndex` / `displayLeafIndex`)
  mitigates this but may need further verification on device.
- Counter semantics unified across modes.
- Chrome auto-hide on native.
- Haptics at grab and cancel — done (Haptics.selectionAsync at grab,
  Haptics.impactAsync(Light) at cancel, Haptics.selectionAsync at commit).

### Phase 6 — verification pass [ongoing]

- Jest coverage for physics core — 69 tests passing.
- Typecheck, lint — clean.
- Manual feel pass on device and web against the benchmark demo — ongoing.

## Verification commands

```bash
npm test
npm run typecheck
npm run lint
npx expo start --port 8081
npx expo start --web --port 8081
```

## Shader tuning parameters

If the curl needs adjustment, these constants live in
`components/cookbook/TurningLeafShader.tsx`:

- `BASE_RADIUS` (0.09) — cylinder radius at mid-turn. Larger = looser curl,
  smaller = tighter curl.
- `TILT_STRENGTH` (0.28) — vertical tilt of curl direction for corner grabs.
  Larger = more pronounced diagonal peel.
- `BACK_OPACITY` (0.7) — back face visibility. Higher = back face more visible.

And in `utils/cookbook/pageCurlShader.ts`:

- Shadow width (`r * 4.0`) and opacity (`0.35`) in the "beyond the curl" branch.
- Specular highlight position (`PI * 0.35`) and width (`PI * 0.3`) on the
  cylinder surface.
- Back face darkening (`0.55`–`0.82`) and desaturation (`0.3`).
