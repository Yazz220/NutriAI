# Nosh 3D Interactive Bookshelf & Creation Studio — Implementation Plan

## Goal

Replace the flat shelf grid (`app/(book)/index.tsx` + `CookbookShelf`) and the flat creation screen (`app/(book)/library.tsx` + `BookLibraryGrid` + `AddCookbookSheet`) with:

1. A **3D Interactive Bookshelf** — cookbooks stand on a shelf as physical clothbound volumes; swiping angles neighbors 25–35° to reveal spine binding and contact shadows; tapping pulls a book forward and hands off into the 3D reader.
2. A **3D Cover Creation Studio** — luxury binding presets (linen/cloth/leather, gold/copper/silver foil) with live-updating embossed cover typography, and a create animation that slides the new volume onto the shelf.

Benchmark: [MengTo/complete-shelf](https://github.com/MengTo/complete-shelf) (clothbound construction, foil stamping, procedural spine curvature, contact shadows, deterministic shelf→detail transitions). Reading benchmark: Apple Books tactile handoff.

## Hard Constraints (from repo reality)

- **No WebGL on native.** `three`/`@react-three/fiber` are already web-only (`Cookbook3DScene.web.tsx`). The shelf must not add WebGL bloat — use **Skia 2.4.21 for materials + Reanimated 4.1.1 for all motion**, matching the reader's proven stack.
- **JS-only changes.** Dev client `35540ebe` already has Skia/worklets. Everything in this plan ships via Metro fast refresh; no new native deps, no EAS rebuild, no `app.json` plugin changes.
- **Provider order in `app/_layout.tsx` is untouched.** Shelf state stays in `useCookbooks`; no new providers.
- **Worklet math goes in `utils/cookbook/` with `'worklet'` directives and Jest tests**, following the `physicalBook.ts` + `__tests__/utils/cookbook/physicalBook.test.ts` pattern.
- **Handoff continuity.** `Cookbook3DScene.tsx` renders the closed cover via `BookCover` (line ~851) and pivots it open (980 ms, rotateY 0→−102°, perspective 1200). The shelf's pull-out animation must land on a visually identical cover so the reader's cover-open reads as one continuous motion.

## Rendering Architecture

### The physical book model (2.5D layer stack, no preserve-3d)

RN flattens child transforms (no `transform-style: preserve-3d`), so each book is a **stack of sibling layers, each computing its own transform from one shared `rotationY` shared value**:

```text
PhysicalBook (Animated.View group: perspective + rotateY + translateX + scale)
├─ BackBoardLayer      — darker board, offset −3px, visible at extreme angles
├─ PageBlockLayer      — cream block with striation lines on top/right/bottom edges
│                        (width interpolates with |rotateY| on the fore-edge side)
├─ SpineLayer          — curved spine face on the hinge edge; its own
│                        rotateY(rotation − 90°)·translateX chain so it foreshortens
│                        like a real spine as the book angles away
└─ FrontCoverLayer     — Skia canvas: cloth material, foil ornaments, board edges
                         + RN Text overlay: foil-stamped title (letterpress emboss)
ContactShadow          — Skia blurred ellipse under the book; softness/spread
                         interpolates with lift (resting vs. pulled-out)
```

Why this works at 60/120fps: every layer's transform is a pure function of shared values inside `useAnimatedStyle` — **zero JS-thread work per frame**. Skia canvases are static textures per (style, size, title); they re-render only when the book's style or title changes, never during the carousel pan.

### Materials in Skia (`SkiaBookCover`)

- **Cloth (linen/cloth):** vertical 3-stop `LinearGradient` (light→base→shade) + fine crosshatch weave (the existing `BookCover` hatch idea, drawn as Skia paths at higher density) + a small **SkSL grain shader** (`Skia.RuntimeEffect`) modulating luminance by ±2% — the difference between "flat card" and "clothbound".
- **Leather:** same base + lower-frequency SkSL pebble grain, deeper edge burnish (dark inset `Rect` stroke), no weave.
- **Procedural spine curvature:** spine face shaded with a horizontal gradient whose highlight sits ~35% across, simulating the round of a bound spine; two **raised hub bands** + **headband** strip (top/bottom 6px in `bandColor`).
- **Foil:** metallic 3-stop ramp (`#6e4f1a → #e8c56a → #f7e8b0` for gold; copper/silver equivalents) used for the title, rule lines, corner marks, and the cover emblem. RN `Text` can't gradient-fill, so foil typography uses the **letterpress trick**: base foil color + `textShadow` dark offset (0,1) + a light offset copy (0,−1) layered underneath — reads as embossed foil under the shelf's top-down light. (Stretch goal: Skia `Text` with shader fill via `matchFont({ fontFamily: 'Georgia' })`; not required for v1.)
- **Contact shadows:** Skia `Oval` + `BlurMask` per slot, driven by the carousel shared value (active book's shadow tightens/darkens; a pulled book's shadow softens, spreads, and drops in opacity).

### Carousel motion model

One `scrollX`-style shared value (`shelfOffset`, in book-slot units) drives everything; a pan gesture translates it; release snaps with `withSpring` (velocity-aware, damping ~26, stiffness ~180). Each slot derives its pose from `offset = index − shelfOffset`:

| | translateX | rotateY | scale | shadow |
|---|---|---|---|---|
| active (offset 0) | center | 0° | 1.00 | tight, dark |
| neighbor (offset ±1) | ±spacing·0.82 | ∓30° (toward viewer's edge) | 0.92 | soft |
| far (|offset| ≥ 2) | compressed | ∓34° cap | 0.86 | faintest |

Spine visibility is free: the hinge-side spine layer's foreshortening falls out of the same `rotateY`. All of this math lives in **`utils/cookbook/physicalShelf.ts`** (`'worklet'` functions: `resolveShelfPose`, `resolveShadowPose`, `resolveSnapTarget` with velocity projection, `clampShelfOffset` with rubber-band at ends) + `__tests__/utils/cookbook/physicalShelf.test.ts`.

**z-ordering caveat:** RN has no true depth; each slot's `zIndex` is derived from `−|offset|` (active book renders on top) inside the animated style — standard RN 3D-carousel technique. Android needs `overflow: 'visible'` on the stage and `renderToHardwareTextureAndroid` off to avoid clipping perspective transforms.

## Component & File Map

New code (all under existing conventions, `@/` imports):

| File | Purpose |
|---|---|
| `components/physical-book/PhysicalBook.tsx` | Shared posed book: layer stack + animated pose inputs. Used by shelf, studio, and (later) the reader's closed cover |
| `components/physical-book/SkiaBookCover.tsx` | Skia canvas: material shader, spine curvature, hub bands, foil ornaments, board edges |
| `components/physical-book/FoilStampedTitle.tsx` | RN Text letterpress-emboss foil title (live-updatable) |
| `components/physical-book/PageBlockEdges.tsx` | Cream page block + striations on fore-edges |
| `components/physical-book/ContactShadow.tsx` | Skia blurred ellipse, lift-aware |
| `components/shelf/ShelfScene.tsx` | Replaces `CookbookShelf`: backdrop (wall gradient + shelf board), carousel, header/menu (reuse existing modal), stale notice, empty state |
| `components/shelf/ShelfCarousel.tsx` | RNGH pan + snap + per-slot layout; renders `ShelfBookSlot`s |
| `components/shelf/ShelfBookSlot.tsx` | One slot: pose derivation + `PhysicalBook` + tap handling |
| `components/shelf/CreateBookVolume.tsx` | "+ Create New Cookbook" placeholder volume (dashed boards, plus emblem) at shelf end |
| `components/create/CreationStudio.tsx` | Replaces library screen body: large `PhysicalBook` preview, style rail, title field |
| `components/create/BindingStyleRail.tsx` | Horizontal snap-carousel of binding presets as mini `PhysicalBook`s (replaces `BookLibraryGrid`) |
| `constants/cookbookBindings.ts` | Binding archetypes: material (linen/cloth/leather), cloth color, foil ramp, band color, grain params |
| `utils/cookbook/physicalShelf.ts` | Worklet carousel/shadow/snap math |
| `__tests__/utils/cookbook/physicalShelf.test.ts` | Unit tests mirroring `physicalBook.test.ts` |

Modified files:

| File | Change |
|---|---|
| `app/(book)/index.tsx` | Render `ShelfScene` instead of `CookbookShelf`; pass pull-out completion into navigation |
| `app/(book)/library.tsx` | Render `CreationStudio`; keep `createCookbook` call; create-and-shelve animation replaces `AddCookbookSheet` |
| `constants/cookbookStyles.ts` | Extend presets with `binding` archetype reference; expand `COOKBOOK_CREATION_STYLE_ORDER` |
| `types/cookbook.ts` | Extend `CookbookStyleId` union (see Open Decisions) |
| `components/cookbook/Cookbook3DScene.tsx` | Swap its closed-cover `BookCover` for `PhysicalBook` so the handoff cover is pixel-continuous |
| `app/(book)/_layout.tsx` | `[cookbookId]` screen gets `animation: 'fade'` so the push doesn't fight the pull-out choreography |

`CookbookShelf`, `BookLibraryGrid`, `AddCookbookSheet`, and `BookCover` remain on disk (BookCover still used by `BookCoverReaderPage`); removal is a separate cleanup once the new screens are verified.

## Transitions

1. **Shelf browse:** pan → `shelfOffset`; rubber-band at ends; haptic `selectionAsync` on each snap detent. Tapping a non-active neighbor scrolls it to center (does not open).
2. **Pull-to-open handoff (shelf → reader):** tap active book → timed 3-phase UI-thread sequence: (a) lift 160 ms (translateY −18, scale 1.06, shadow softens), (b) pivot-to-front + draw toward viewer 260 ms (rotateY→0, scale→1.14), (c) `runOnJS(router.push)` fired at ~60% of (b); the pushed `[cookbookId]` screen fades in over 200 ms showing the closed cover in the matching centered pose (same `PhysicalBook` rendering), then the existing 980 ms cover-open plays. Reads as one continuous "pull from shelf, open cover" motion — no shared-element infrastructure required.
3. **Create-and-shelve (studio → shelf):** `createCookbook` mutation resolves (cache already updated by `useCookbooks.onSuccess`) → studio preview animates up-and-away along a shelf-ward arc (translateY −40% screen, scale 0.55, 380 ms) → `router.back()` lands on the shelf auto-scrolled to the new book, which settles into its slot with a spring. 
4. **Reduced motion:** `AccessibilityInfo.isReduceMotionEnabled()` → snaps become instant, pull-out collapses to a fade, cover-open keeps (it's the reader's core affordance) but shortens to 400 ms.

## Cover Archetypes (`constants/cookbookBindings.ts`)

Each archetype = `{ material, cloth, foil: [dark, mid, light], band, grain }`. Launch set:

| Archetype | Material | Cloth | Foil |
|---|---|---|---|
| Sage Linen | linen | `#7d8471` sage | gold ramp |
| Terracotta Cloth | cloth | `#a7422b` (existing `peach`) | copper ramp |
| Navy Leather | leather | `#2f3b52` | silver ramp |
| Charcoal Cloth | cloth | `charcoal` | butterscotch ramp |
| Alabaster Linen | linen | `alabaster` | copper ramp |
| Umber Leather | leather | `warmUmber` | gold ramp |

Presets in `cookbookStyles.ts` gain a `binding` key referencing an archetype; `getCookbookStyle` stays backward-compatible (legacy IDs keep their current flat `BookCover` look elsewhere). **Spine thickness scales with `pageCount`** (min 18px ≈ the current fixed spine, up to ~15% of cover width) — authentic thickness per the benchmark.

## Performance Budget

- One shared value drives the carousel; slot styles are derived, not re-rendered. `PhysicalBook` and Skia canvases wrapped in `React.memo` keyed on (styleId, title, pageCount, width).
- No layout-property animation (transform/opacity only). No per-frame JS: snap target computed in a worklet.
- Skia grain shader compiled once per module (`Skia.RuntimeEffect.Make` lazily, cached); canvases are static — dirty only on style/title/size change.
- Shelf capped at rendering `active ± 3` slots (others render as empty spacers) if the collection grows past ~12 books.

## Phasing

1. **Phase 0 — Foundations:** `physicalShelf.ts` + tests; `cookbookBindings.ts`; preset/type extension. Gates: `npm test`, `npm run typecheck`.
2. **Phase 1 — PhysicalBook:** static posed book (Skia cover, foil title, page block, spine, shadow) rendered standalone in the studio-sized pose. Visual review on device.
3. **Phase 2 — Shelf:** `ShelfScene` + carousel + gestures + snap + create volume; wire `index.tsx`. Gates: typecheck, lint, tests.
4. **Phase 3 — Handoff:** pull-out choreography, stack fade animation, `Cookbook3DScene` cover swap for continuity.
5. **Phase 4 — Studio:** `CreationStudio` + style rail + live foil title + create-and-shelve.
6. **Phase 5 — Polish:** haptics, reduced motion, empty/stale states, a11y labels (44pt targets, `accessibilityRole="button"`, book titles announced), final gates.

## Open Decisions (need product sign-off before Phase 0)

1. **`CookbookStyleId` extension.** Creation is currently locked to `['handwritten']` ("signature Nosh book"). This plan adds 6 binding archetypes. Options: (a) extend the union + presets (keeps page-generation prompts per style), or (b) keep 6 styles and add an orthogonal `bindingId` field (new DB column via migration). Recommendation: **(a)** for v1 — no migration, `coverStyle` column already stores a string, old values remain valid.
2. **Templates menu entry.** Current shelf header links to Page templates; new shelf keeps the same ellipsis menu — unchanged.
3. **Web parity.** Shelf v1 targets native (where the dev client + Skia already run). The web renderer keeps the existing flat grid until a follow-up ports `ShelfScene` poses to the three.js scene.
