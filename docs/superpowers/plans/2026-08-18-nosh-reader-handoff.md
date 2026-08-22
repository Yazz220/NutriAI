# Nosh Reader Feel — Session Handoff

> Historical handoff. It describes an earlier reader state and is not a current implementation brief.

## Goal

Make the digital cookbook feel like a real physical book — tactile, immersive, delightful to flip through. The benchmark is [react-pageflip/StPageFlip](https://nodlik.github.io/react-pageflip/): corner-grab page curl, soft paper deformation, momentum-aware release, interruptible mid-turn.

**Sole focus:** the visual reading experience. Not recipe generation, data pipelines, or backend. We assume pages exist.

## Architecture

- **React Native (Expo SDK 54)** with a dev client build (not Expo Go — Skia needs native C++)
- **`@shopify/react-native-skia` 2.4.21** (pinned exact) for the page curl mesh (Vertices + ImageShader)
- **`react-native-reanimated` ~4.1.1** + **`react-native-worklets` 0.7.1** (pinned exact) for UI-thread gestures
- Two renderers: `Cookbook3DScene.tsx` (native) and `Cookbook3DScene.web.tsx` (three.js). Current focus is native only.
- Shared physics in `utils/cookbook/physicalBook.ts` — all functions have `'worklet'` directive (required for worklets 0.7.1)

## Key Files

| File | What it does |
|---|---|
| `components/cookbook/BookReader.tsx` | Reader shell — open/close, chrome, page state, view mode |
| `components/cookbook/Cookbook3DScene.tsx` | Native book scene — cover, spread layout, gesture handler, Skia leaf mounting |
| `components/cookbook/TurningLeafSkia.tsx` | Skia curl mesh — deformed Vertices with front/back faces, fold shadow, crest highlight |
| `components/cookbook/OpenBookSpread.tsx` | Two-page spread layout (gutter, binding, page block). Centers spread with 10px/12px padding. |
| `utils/cookbook/physicalBook.ts` | Curl math (`buildPageCurlCurve`), turn progress, release physics — all `'worklet'`-annotated |
| `utils/cookbook/reader.ts` | Spread building, page-to-spread mapping, touch paging breakpoint (600px) |
| `utils/cookbook/pageImage.ts` | `getCookbookPageImageSource` — resolves page image for Skia `useImage` |
| `jest.setup.js` | Worklets mock: `jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))` |
| `eas.json` | EAS dev build profile with `EXPO_PUBLIC_DEV_BYPASS_AUTH=true` and `EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=true` baked in |

## What's Done (All Verified Working on iPhone)

1. **Skia curl mesh** — page deforms with a curl curve, front/back face swap at edge-on, fold shadow + crest highlight
2. **Two-page spread** as default on phone (was single-page only)
3. **Top-down flat view** — removed the 18° tilt that made it look like a skewed card
4. **Book stays still during turns** — removed `spreadSwipeStyle` that translated the whole book
5. **Browse rail removed** — was clutter, will rebuild later
6. **Cover open animation** — cover pivots open around the spine (980ms)
7. **Gesture physics** — position-based (not distance-based), reversible mid-drag, velocity-aware release, re-grab mid-turn
8. **Backward turn mirroring** — left page curls right toward spine (vertex mirroring: `x = width - point.x`)
9. **Canvas clipping fixed** — 50% vertical padding on Skia canvas, `overflow: 'visible'` on stage
10. **4-page model** — underneath pages show destination spread, back face shows destination page, zero pop on commit
11. **Boundary flick fixed** — spring velocity always directed back to 0 when `!canTurn`
12. **Gesture conflict fixed** — turn gesture disabled during cover opening (`!coverMounted`)
13. **View toggle on phone** — "Read/Browse" button visible on all devices
14. **Double-inversion fixed** — `pageProgress = turn` for both directions (not `1 - turn` for backward)
15. **Symmetrical travel** — `travel = 2 * |targetX - grabX|` prevents oversensitive turns near spine
16. **Mid-turn re-grab** — preserves current progress instead of snapping to 0

## Current State

- **Uncommitted changes** in 5 files (the fixes from the last round):
  - `__tests__/utils/cookbook/physicalBook.test.ts`
  - `components/cookbook/BookReader.tsx`
  - `components/cookbook/Cookbook3DScene.tsx`
  - `components/cookbook/TurningLeafSkia.tsx`
  - `utils/cookbook/physicalBook.ts`
- **Last commit:** `040d3a2d7` — Pin Skia/worklets exact versions, add bypass env vars to EAS dev profile
- **Dev client build:** `35540ebe` (Skia 2.4.21, worklets 0.7.1, bypass auth + demo cookbook)
- **Metro running** at `exp://192.168.0.245:8081`
- **All gates green:** typecheck, lint, 65 tests (19 suites)
- **JS-only changes push via Metro fast refresh** — no rebuild needed for JS changes
- **Native changes require EAS rebuild:** `npx eas-cli build --profile development --platform ios --non-interactive --clear-cache`

## What's Next (Priority Order)

### 1. ToC/Bookplate Blank Turn
Non-recipe pages (Table of Contents, Bookplate) turn as blank cream pages because they're RN components, not image assets. `getLeafPage` returns `undefined` for `type: 'contents'` and `type: 'bookplate'`, so `getCookbookPageImageSource` returns `null`, and the Skia mesh renders with no texture. Fix: either snapshot these pages to images, or render them as Skia-drawn content.

### 2. Page Weight & Stacks
The book currently looks flat — two pages with nothing behind them. Real books have visible page stacks on each side that thin as you read forward and grow as you read back. This gives the book physical weight. The web renderer has this (`Cookbook3DScene.web.tsx` uses dynamic page stacks); native doesn't.

### 3. Corner Grab Affordance
The benchmark lifts the page corner on touch-down (before drag starts). Ours doesn't react until you've already dragged 4-8px. Adding a subtle corner lift on touch makes the page feel alive under your finger. StPageFlip calls this `fold_corner` state.

### 4. Shadow/Crest Tracking
Currently the fold shadow and crest highlight track the page tip (the free outer edge), not the fold peak (where the paper bends most sharply). The shadow should sit at the apex of the curl, not the trailing edge.

## Known Limitations

- No page stacks yet (book looks flat, no weight)
- No corner lift on touch-down (page only reacts after 4-8px drag)
- Non-recipe pages (ToC, Bookplate) turn as blank cream pages
- Web renderer (`Cookbook3DScene.web.tsx`) has separate issues (drag distance, flick speed) — not the current focus
- `boxShadow` CSS string syntax in styles is web-only but doesn't crash on Old Architecture native
- The back face of the curling leaf uses `Colors.book.pageAlt` (white) as its color — could be warmer

## Testing Setup

- Metro: `npx expo start --lan --clear` (running at `exp://192.168.0.245:8081`)
- Dev client: install from `https://expo.dev/accounts/yaz12/projects/nosh/builds/35540ebe-c6f7-43c3-ab08-e004058553b9`
- Shake phone to reload after JS changes
- All gates: `npm run typecheck && npm run lint && npm test`
- Install deps: `npm install --legacy-peer-deps`
- Node: `20.19.4`

## Important Technical Notes

- **All physics functions in `physicalBook.ts` MUST have `'worklet'` as the first line** — Reanimated 4 / worklets 0.7.1 requires this. Without it, the UI thread tries to call JS-thread functions and crashes with "tried to synchronously call an unworklet function."
- **Skia and worklets versions must be pinned exact** (no `^`) — EAS can resolve different patch versions on the build server vs locally, causing native crashes.
- **`expo-gl` must NOT be installed** — it conflicts with Skia's Metal renderer on iOS.
- **`OpenBookSpread` centers the spread with 10px horizontal and 12px vertical padding** — Skia canvas offsets must account for this (`forwardOffsetX = leafWidth + 10`, `offsetY = 12`).
- **The `pageProgress` in `TurningLeafSkia` must be `turn` for both directions** — the vertex mirroring (`width - point.x` for backward) and texture swapping handle the spatial reflection. Inverting progress would double-invert.
- **The `travel` in `resolveTurnProgress` is `2 * |targetX - grabX|`** — symmetrical across the spine, prevents oversensitive turns when grabbing near the center.

## Original Audit (From Session Start)

The original audit identified these issues (all now fixed except where noted):

- A. Opening moment missing on native ✅
- B. Two divergent implementations ✅ (native now uses Skia)
- C. Gesture mapping fights the finger ✅
- D. Large static zones ✅ (browse rail removed, spread is default)
- E. Actual bugs ✅ (turn handoff, counter semantics, chrome auto-hide)
- F. Presence and texture gaps (partially fixed — curl richness done, page stacks and corner affordance pending)
