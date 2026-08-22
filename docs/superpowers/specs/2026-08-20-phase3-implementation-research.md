# Phase 3 Implementation Research — Native Typesetter

> Superseded research. The typesetter is now legacy compatibility only; new recipes use complete generated page images. See ADR 0002.

**Date:** 2026-08-20
**Purpose:** Research the best approach for building the native typesetter that renders cookbook pages from RecipeGraph + art asset + style preset, before writing any code.

---

## 1. The Core Decision: Pure Skia vs Hybrid

The spec says "React Native/Skia page renderer" but that's ambiguous. There are two possible architectures:

### Option A: Pure Skia (everything in a Canvas)

All rendering — art asset, text, decorative elements — happens inside a single `<Canvas>` from `@shopify/react-native-skia`. Text is drawn via the Skia Paragraph API.

**Pros:**
- Full control over compositing, masks, blend modes
- Single render surface — no layering complexity
- Can apply Skia effects (blur, shadows, gradients) to text
- Pixel-perfect positioning

**Cons:**
- **No native text selection** — Skia text is drawn pixels, not native text views. Users cannot long-press to select, copy, or look up words. This is confirmed by multiple sources.
- **No accessibility** — Skia text is invisible to VoiceOver and TalkBack. Screen readers cannot read Skia-drawn text.
- **No Dynamic Type** — Skia text doesn't respect the user's system font size settings.
- **Manual text wrapping** — Must use Paragraph API's `layout(width)` and `getHeight()` for measurement, but wrapping around art assets requires manual exclusion paths (complex, platform-specific).
- **Font registration complexity** — Must use `useFonts()` to register TTF files with Skia's font manager separately from expo-font. The fonts loaded by `expo-font` are NOT automatically available to Skia.

### Option B: Hybrid (Skia art + React Native Views for text) ← RECOMMENDED

A Skia `<Canvas>` renders the art asset (absolutely positioned behind), and React Native `<View>` + `<Text>` components render the recipe text on top. The two layers are composited via z-index.

**Pros:**
- **Native text selection** — RN `<Text selectable>` supports long-press selection, copy, drag handles (iOS PR #56236 adds full native selection).
- **Full accessibility** — VoiceOver/TalkBack can read the text, navigate by element, announce headings.
- **Dynamic Type support** — RN Text respects system font size settings.
- **Instant reflow** — When the RecipeGraph changes, React re-renders the text Views. No manual relayout needed.
- **Existing font system works** — Inter is already loaded via `expo-font` and available to RN Text components. No separate Skia font registration needed for text.
- **Simpler implementation** — Use the existing `<Text>` component, `Typography` constants, `Colors`, `Spacing` — all already defined.
- **Art compositing still works** — Skia Canvas renders the art PNG behind the text layer. Can use Skia's `Image` component with `fit="contain"` or `"cover"`, plus opacity, blend modes, and decorative drawing (borders, rules, ornaments).

**Cons:**
- Cannot apply Skia effects (blur, shaders) to the text layer
- Two render surfaces (Skia Canvas + RN Views) — slight complexity in sizing/alignment
- Cannot do text-as-mask effects (e.g., image-filled text)

### Decision: Option B (Hybrid)

The spec's core motivation is "crisp, selectable vector text" and "non-interactive text was frozen in pixels — unselectable, unscalable, inaccessible." Pure Skia text would reproduce exactly these problems. The hybrid approach delivers on all four goals:

1. **Selectable text** — RN `<Text selectable>` ✓
2. **Scalable text** — Dynamic Type via `allowFontScaling` ✓
3. **Accessible text** — VoiceOver/TalkBack via `accessibilityLabel` ✓
4. **Instant reflow** — React re-render on graph change ✓

The art asset is already a no-text PNG — it's just an illustration to composite behind/around the text. Skia handles this perfectly via the `Image` component.

---

## 2. Architecture — The Typesetter Component

```
┌─────────────────────────────────────────┐
│  TypesetterPage (View)                  │  ← Outer container, page aspect ratio
│  ┌───────────────────────────────────┐  │
│  │  ArtLayer (Skia Canvas)           │  │  ← Absolute fill, z-index: 0
│  │  ┌─────────────────────────────┐  │  │     Renders art PNG + decorative
│  │  │  Image (art asset)          │  │  │     elements (borders, rules,
│  │  │  + decorative drawing       │  │  │     ornaments, accent color
│  │  └─────────────────────────────┘  │  │     touches from style preset)
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  TextLayer (ScrollView/View)      │  │  ← Absolute fill, z-index: 1
│  │  ┌─────────────────────────────┐  │  │     Renders recipe text via
│  │  │  Title                      │  │  │     RN <Text> components
│  │  │  Meta row (servings, time)  │  │  │     Selectable, accessible
│  │  │  ─── accent rule ───        │  │  │     Reflows on graph change
│  │  │  Ingredients section        │  │  │
│  │  │  Steps section              │  │  │
│  │  │  Notes (if any)             │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Key design properties

1. **ArtLayer is purely visual** — it renders the art asset and style-preset decorative elements (borders, accent rules, ornaments). It contains NO text and NO interactive elements.

2. **TextLayer is purely textual** — it renders the recipe graph as native text. It's transparent (no background) so the art shows through. It handles all scrolling, selection, and accessibility.

3. **Both layers are absolutely positioned** within the page container, filling the same space. The TextLayer is on top (z-index: 1) and has a transparent background.

4. **The page container has a fixed aspect ratio** (2:3 for portrait cookbook pages, matching the legacy `PageCanvas` frame).

---

## 3. Skia Art Layer — Implementation Details

### Loading the art asset

```typescript
import { Canvas, Image, useImage, Rect, RoundedRect, Path } from '@shopify/react-native-skia';

const artImage = useImage(artAsset?.artUrl);  // loads from Supabase Storage URL
```

`useImage` accepts:
- `require('./asset.png')` → number (local asset)
- `'https://...'` → string (network URL) — this is what we use for Supabase Storage URLs
- `'AssetName'` → string (bundle name)

Returns `SkImage | null`. Returns null while loading, then triggers re-render.

### Rendering the art

```tsx
<Canvas style={StyleSheet.absoluteFill}>
  {/* Page background color from style preset */}
  <Rect x={0} y={0} width={pageWidth} height={pageHeight} color={palette.paper} />

  {/* Art asset — positioned in top portion of page, contained */}
  {artImage && (
    <Image
      image={artImage}
      fit="contain"
      x={artRect.x}
      y={artRect.y}
      width={artRect.width}
      height={artRect.height}
    />
  )}

  {/* Decorative elements from style preset */}
  {/* Accent rule under title area */}
  <Rect x={margin} y={titleRuleY} width={pageWidth - margin * 2} height={1} color={palette.accent} opacity={0.6} />

  {/* Optional border for vintage styles */}
  {hasBorder && (
    <RoundedRect x={borderInset} y={borderInset} width={pageWidth - borderInset * 2} height={pageHeight - borderInset * 2} r={0} style="stroke" strokeWidth={1} color={palette.ink} opacity={0.15} />
  )}
</Canvas>
```

### Art positioning strategy

The art asset is a 3:4 portrait illustration. It should occupy the top portion of the page (above the ingredients), not the full page. The text flows below and around it.

**Layout regions (top to bottom):**
1. **Art zone** (top ~35-40% of page) — the illustration
2. **Title zone** (below art, ~8% of page) — recipe title + meta
3. **Content zone** (bottom ~52-57% of page) — ingredients and steps

For `layoutDensity: 'sparse'` — art is larger, content has more whitespace.
For `layoutDensity: 'dense'` — art is smaller, content is more compact.

### No-font-needed for art layer

The art layer only draws images, rectangles, and paths. It does NOT render text. Therefore we do NOT need to register fonts with Skia's font manager. This eliminates the `useFonts` complexity entirely.

---

## 4. Text Layer — Implementation Details

### Using existing design system

The text layer uses the existing Nosh design system:
- `Typography` from `constants/typography.ts` — h1, h2, h3, body, bodySmall, caption, overline
- `Colors` from `constants/colors.ts` — text, textSecondary, textMuted, book.ink, book.accent
- `Fonts` from `utils/fonts.ts` — Inter (UI) and Georgia/serif (display)
- `Spacing` from `constants/spacing.ts` — xs, sm, md, lg, xl

### Text structure

```tsx
<View style={styles.textLayer}>
  {/* Title */}
  <Text style={styles.title} selectable accessibilityRole="header">
    {graph.title}
  </Text>

  {/* Meta row */}
  <View style={styles.metaRow}>
    <Text style={styles.metaText} selectable>
      {graph.servings} servings
    </Text>
    {graph.prepTimeMinutes != null && (
      <Text style={styles.metaText} selectable>
        Prep {graph.prepTimeMinutes}m
      </Text>
    )}
    {graph.cookTimeMinutes != null && (
      <Text style={styles.metaText} selectable>
        Cook {graph.cookTimeMinutes}m
      </Text>
    )}
  </View>

  {/* Accent rule */}
  <View style={[styles.accentRule, { backgroundColor: palette.accent }]} />

  {/* Ingredients */}
  {graph.ingredientGroups.map((group) => (
    <View key={group.id}>
      {group.label && <Text style={styles.sectionLabel}>{group.label}</Text>}
      {group.ingredients.map((ingredient, i) => (
        <Text key={i} style={styles.ingredientText} selectable>
          <Text style={styles.quantity}>{ingredient.quantity} {ingredient.unit}</Text>
          {' '}
          <Text>{ingredient.name}</Text>
          {ingredient.preparation && <Text style={styles.preparation}>, {ingredient.preparation}</Text>}
        </Text>
      ))}
    </View>
  ))}

  {/* Steps */}
  {graph.stepGroups.map((group) => (
    <View key={group.id}>
      {group.label && <Text style={styles.sectionLabel}>{group.label}</Text>}
      {group.steps.map((step, i) => (
        <Text key={step.id} style={styles.stepText} selectable>
          <Text style={styles.stepNumber}>{i + 1}.</Text>
          {' '}
          {step.text}
        </Text>
      ))}
    </View>
  ))}

  {/* Notes */}
  {graph.notes && graph.notes.length > 0 && (
    <View>
      <Text style={styles.sectionLabel}>Notes</Text>
      {graph.notes.map((note, i) => (
        <Text key={i} style={styles.noteText} selectable>• {note}</Text>
      ))}
    </View>
  )}
</View>
```

### Selectable text

Set `selectable={true}` on all text components. This enables:
- iOS: Long-press to select, drag handles, copy menu (enhanced in RN 0.78+ via PR #56236)
- Android: Long-press to select, copy menu
- Web: Native browser text selection

### Accessibility

- `accessibilityRole="header"` on the title
- `accessibilityLabel` on meta row: `"4 servings, 15 minutes prep, 30 minutes cook"`
- Each ingredient and step is a separate accessibility element
- Screen reader navigates by element, not by visual position

### Dynamic Type

Set `allowFontScaling={true}` (default) on all Text components so they respect the user's system font size settings. The layout uses Flexbox, so text reflows automatically when font size changes.

---

## 5. Style Preset Mapping

Each of the 12 `CookbookStyleId` presets maps to typesetter parameters:

```typescript
interface TypesetterStyleConfig {
  // Colors (from the preset's palette)
  paperColor: string;        // palette.paper — page background
  inkColor: string;          // palette.ink — text color
  accentColor: string;       // palette.accent — rules, section labels, meta
  mutedColor: string;        // palette.spine or duskGrey — captions, notes

  // Layout
  margin: number;            // page margin in px (scaled to page size)
  artHeightRatio: number;    // art zone height as fraction of page (0.35-0.42)
  showBorder: boolean;       // decorative border (vintage styles)
  borderInset: number;       // border inset from edge

  // Typography
  titleFontFamily: string;   // Fonts.display.bold (serif) or Fonts.ui.bold (sans)
  bodyFontFamily: string;    // Fonts.ui.regular
  titleSize: number;         // 24-28
  bodySize: number;          // 13-14
  metaSize: number;          // 10-11

  // Decorative
  accentRuleOpacity: number; // 0.4-0.7
  showArtOrnament: boolean;  // small decorative element near art
}
```

### Style-specific configurations

| Style | Art ratio | Border | Title font | Accent opacity |
|---|---|---|---|---|
| vintage-garden | 0.38 | yes (thin) | serif | 0.6 |
| handwritten | 0.40 | no | serif | 0.5 |
| editorial | 0.35 | no | serif | 0.7 |
| watercolor | 0.42 | no | serif | 0.4 |
| rustic | 0.36 | yes (notebook) | serif | 0.5 |
| minimal | 0.32 | no | sans | 0.3 |
| sage-linen | 0.38 | no | serif | 0.6 |
| terracotta-cloth | 0.36 | no | serif | 0.7 |
| navy-leather | 0.34 | no | serif | 0.6 |
| charcoal-cloth | 0.32 | yes (thin gold) | serif | 0.7 |
| alabaster-linen | 0.38 | no | serif | 0.5 |
| umber-leather | 0.36 | yes (thin) | serif | 0.6 |

---

## 6. Recipe Template Mapping

The 3 `RecipeTemplateId` presets (`clean-cream`, `ink-sketch`, `modern-editorial`) define the layout structure, not the visual style. They map to layout configurations:

| Template | Layout | Art position | Columns |
|---|---|---|---|
| clean-cream | Stacked | Top, centered | Single column |
| ink-sketch | Stacked with border | Top, full width | Single column |
| modern-editorial | Magazine grid | Top-right, asymmetric | Two column (ingredients left, steps right) |

The template controls the spatial arrangement; the style preset controls the colors, fonts, and decorative elements. They compose: any template can be used with any style.

---

## 7. Integration with Existing Components

### What changes

| Component | Change |
|---|---|
| `PageCanvas` | Add a new `TypesetterPage` render path. When a page has `artAsset` + `recipeGraph`, render `TypesetterPage` instead of the legacy `<Image>`. |
| `CookbookLeafPage` | Pass `recipeGraph` and `artAsset` to `PageCanvas` for new-pipeline pages. |
| `BookReader` | The focused page view (`focusedPage` modal) uses `TypesetterPage` for new pages. |
| `Cookbook3DScene` | The 3D leaf rendering uses `TypesetterPage` for new-pipeline pages. |

### What stays the same

- Legacy pages (with `imageUrl` but no `artAsset`/`recipeGraph`) continue to render via the existing `<Image>` path.
- The 3D scene, page-turn animations, spread/page navigation — all unchanged.
- The `BookReader` chrome (top bar, controls, Nosh button) — unchanged.

### Backward compatibility

The `CookbookPage` type already has `imageUrl` (legacy) and we added `artAsset` + `recipeGraph` via `CookbookPageV2`. The typesetter checks which fields are present and renders accordingly:

```typescript
function PageCanvas({ page }: { page: CookbookPage | CookbookPageV2 }) {
  if ('recipeGraph' in page && page.recipeGraph) {
    return <TypesetterPage page={page} />;
  }
  // Legacy: render the full-page PNG
  return <LegacyPageImage page={page} />;
}
```

---

## 8. Performance Considerations

### Art layer (Skia Canvas)

- `useImage(artUrl)` caches the image after first load — subsequent renders are instant.
- The Canvas only redraws when its props change (art URL, page dimensions, style config).
- Use `React.memo` on the art layer component so it doesn't redraw when only the text changes.
- The art layer has NO text, so there's no font registration overhead.

### Text layer (React Native Views)

- Standard React rendering — re-renders when the RecipeGraph changes.
- Use `React.memo` with a custom comparator to skip re-renders when the graph hasn't changed.
- `selectable` text has a small performance cost on iOS (creates a UITextView), but only for visible text.
- The text layer is a Flexbox layout — no manual measurement needed.

### Page-turn animations

The 3D scene renders pages as textures on book leaves. For new-pipeline pages, we need to render the `TypesetterPage` to a texture. Two options:

1. **Render as a View** — The `TypesetterPage` renders as a normal React Native View inside the leaf. This works for the spread view (static pages) but may not work for the 3D curl animation (which needs a texture).

2. **Render to image** — Use `react-native-view-shot` to capture the `TypesetterPage` as a PNG, then use that PNG as the leaf texture. This adds a capture step but works with the 3D animation.

**Recommendation:** Start with option 1 (render as View) for the spread/page reading view. The 3D curl animation can continue using the captured texture approach if needed. This is a Phase 3.5 concern — the typesetter itself doesn't need to solve the 3D texture problem.

---

## 9. Nosh Agent Integration (Phase 5 preview)

The typesetter is designed to support live updates from the Nosh agent:

- **`scale_servings`** → Client updates the RecipeGraph's ingredient quantities → React re-renders the text layer → text reflows instantly.
- **`substitute_ingredient`** → Client updates the ingredient name/quantity → React re-renders → instant.
- **`update_page_data`** → Client applies JSON patches to the RecipeGraph → React re-renders → instant.
- **`guide_next_step`** → Client highlights a step ID → the typesetter scrolls to it and applies a highlight style.
- **`start_timer`** → Client starts a native timer (not a typesetter concern).

No art re-generation is needed for any of these operations. The art layer is untouched; only the text layer re-renders.

---

## 10. Implementation Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Hybrid (Skia art + RN Views text) | Selectable, accessible, scalable text — the core spec requirement |
| Art rendering | Skia Canvas with `useImage` + `Image` component | Already installed, handles PNG from URL, supports fit modes |
| Text rendering | React Native `<Text selectable>` | Native selection, VoiceOver, Dynamic Type, instant reflow |
| Font registration | Not needed for Skia (art layer has no text) | Eliminates `useFonts` complexity; text uses existing expo-font fonts |
| Page aspect ratio | 2:3 portrait (matches legacy PageCanvas) | Consistency with existing book geometry |
| Art positioning | Top 35-40% of page, contained | Illustration is a header element, not a full-page background |
| Style preset mapping | `TypesetterStyleConfig` per CookbookStyleId | 12 presets → colors, layout, typography, decorative elements |
| Template mapping | Layout structure per RecipeTemplateId | 3 templates → spatial arrangement (stacked, grid, bordered) |
| Backward compatibility | Check for `recipeGraph` field; fall back to legacy `<Image>` | Legacy pages keep working; new pages use typesetter |
| Performance | `React.memo` on art and text layers independently | Art doesn't redraw when text changes; text doesn't redraw when art changes |
| 3D scene integration | Render TypesetterPage as a View in leaves (Phase 3.5 for texture capture) | Spread/page reading view works immediately; 3D curl is a follow-up |

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Skia Canvas and RN Views may not align pixel-perfectly | Both use the same absolute-fill container; measure with `onLayout` |
| Art asset URL may not be loaded yet (null from `useImage`) | Show a placeholder/skeleton while loading; art fades in when ready |
| Text may overflow the page at large Dynamic Type sizes | Use `ScrollView` for the text layer; page is scrollable when content exceeds height |
| 3D page-turn animation needs a texture, not a live View | Phase 3.5: use `react-native-view-shot` to capture the typesetter as PNG for the 3D scene |
| Style preset colors may not match the generated art | Art is style-conditioned (same preset), so colors should harmonize; accent rules use the same palette |
| Performance with many ingredients/steps on a single page | Use `React.memo` and virtualized lists if needed; most recipes have <20 ingredients and <10 steps |
| `selectable` text may interfere with page-turn gestures | Set `pointerEvents` appropriately; selectable text captures long-press, not swipe |
| Skia Canvas cold start on first render | Pre-warm the Canvas by rendering it off-screen on book open (existing pattern in Cookbook3DScene) |
