/**
 * TypesetterPage — the native typesetter that renders a cookbook page from
 * a RecipeGraph + art asset + style preset.
 *
 * Architecture (hybrid approach):
 *   ┌─────────────────────────────────┐
 *   │  TypesetterPage (View)          │  ← Fixed 2:3 aspect ratio
 *   │  ┌───────────────────────────┐  │
 *   │  │  ArtLayer (Skia Canvas)   │  │  ← z-index 0, absolute fill
 *   │  │  Art PNG + decorative     │  │     No text, purely visual
 *   │  └───────────────────────────┘  │
 *   │  ┌───────────────────────────┐  │
 *   │  │  TextLayer (RN Views)     │  │  ← z-index 1, absolute fill
 *   │  │  Selectable, accessible   │  │     Transparent background
 *   │  │  recipe text from graph   │  │     Instant reflow on edit
 *   │  └───────────────────────────┘  │
 *   └─────────────────────────────────┘
 *
 * The art layer renders the generated illustration and style-preset
 * decorative elements (borders, accent rules, ornaments).
 * The text layer renders the recipe as native, selectable, accessible text.
 * Both layers are absolutely positioned within the page container.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArtLayer } from '@/components/cookbook/typesetter/ArtLayer';
import { TextLayer } from '@/components/cookbook/typesetter/TextLayer';
import { getTypesetterStyleConfig } from '@/constants/typesetterStyles';
import { getTypesetterLayoutConfig } from '@/constants/typesetterLayouts';
import { Spacing } from '@/constants/spacing';
import type { CookbookStyleId, RecipeTemplateId, PageArtAsset } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

export interface TypesetterPageProps {
  /** The recipe graph to render (the canonical culinary data). */
  recipeGraph: RecipeGraph;
  /** The generated art asset (illustration only, no text). Null while generating. */
  artAsset?: PageArtAsset | null;
  /** The cookbook style preset id. */
  styleId: CookbookStyleId;
  /** The recipe template id (controls layout structure). */
  templateId?: RecipeTemplateId;
  /** Whether to fill the parent (book mode) or use a framed card (standalone). */
  bookMode?: boolean;
  /** Fixed width override (for 3D scene rendering). If omitted, uses window size. */
  fixedWidth?: number;
}

/** Standard cookbook page aspect ratio (portrait). */
const PAGE_ASPECT_RATIO = 2 / 3;

export const TypesetterPage = memo(function TypesetterPage({
  recipeGraph,
  artAsset,
  styleId,
  templateId,
  bookMode = false,
  fixedWidth,
}: TypesetterPageProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const pageWidth = useMemo(() => {
    if (fixedWidth) return fixedWidth;
    if (bookMode) return windowWidth;
    const horizontalInset = windowWidth < 390 ? Spacing.md : Spacing.xl;
    return Math.min(windowWidth - horizontalInset * 2, 430);
  }, [fixedWidth, bookMode, windowWidth]);

  const pageHeight = useMemo(() => {
    if (bookMode) return pageWidth / PAGE_ASPECT_RATIO;
    return Math.max(500, Math.min(pageWidth / PAGE_ASPECT_RATIO, windowHeight - 220));
  }, [pageWidth, bookMode, windowHeight]);

  const styleConfig = useMemo(() => getTypesetterStyleConfig(styleId), [styleId]);
  const layoutConfig = useMemo(() => getTypesetterLayoutConfig(templateId), [templateId]);

  // The text content starts below the art zone + gap
  const contentStartY = useMemo(() => {
    const margin = pageWidth * styleConfig.marginRatio;
    const artHeight = pageHeight * styleConfig.artHeightRatio;
    const gap = pageHeight * layoutConfig.artTextGapRatio;
    return margin * 0.6 + artHeight + gap + 8;
  }, [pageWidth, pageHeight, styleConfig, layoutConfig]);

  const artUrl = artAsset?.artUrl ?? null;

  return (
    <View
      style={[
        styles.page,
        bookMode && styles.pageBookMode,
        { width: pageWidth, height: pageHeight },
      ]}
    >
      {/* Art layer (z-index 0) — Skia Canvas with art + decorative elements */}
      <ArtLayer
        width={pageWidth}
        height={pageHeight}
        artUrl={artUrl}
        styleConfig={styleConfig}
        layoutConfig={layoutConfig}
      />

      {/* Text layer (z-index 1) — native RN Views with selectable text */}
      <TextLayer
        width={pageWidth}
        height={pageHeight}
        recipeGraph={recipeGraph}
        styleConfig={styleConfig}
        layoutConfig={layoutConfig}
        contentStartY={contentStartY}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    aspectRatio: PAGE_ASPECT_RATIO,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  pageBookMode: {
    width: '100%',
    height: '100%',
    aspectRatio: undefined,
  },
});
