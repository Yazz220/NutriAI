import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { TypesetterPage } from '@/components/cookbook/typesetter/TypesetterPage';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography, Shadows } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { DEFAULT_COOKBOOK_STYLE } from '@/constants/cookbookStyles';
import { COOKBOOK_GEOMETRY } from '@/constants/cookbookGeometry';
import { isCreationPageStyleId } from '@/constants/cookbookCustomization';
import { DEFAULT_RECIPE_TEMPLATE_ID } from '@/constants/recipeTemplates';
import type { CookbookPage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

interface PageCanvasProps {
  page: CookbookPage;
  bookMode?: boolean;
  onRenderReady?: () => void;
}

function PageSkeleton({ page }: { page: CookbookPage }) {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonInner}>
        <Text style={styles.skeletonTitle} numberOfLines={2} adjustsFontSizeToFit>
          {page.title}
        </Text>
        <View style={styles.skeletonRule} />
        <Text style={styles.skeletonHint}>Page artwork is being prepared.</Text>
      </View>
    </View>
  );
}

function formatRecipeTime(minutes?: number): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0
    ? `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainder} minutes`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function buildRecipePageAccessibilityLabel(page: CookbookPage): string {
  const graph: RecipeGraph | undefined = page.recipeGraph;
  if (!graph) return `${page.title}. Designed cookbook page.`;

  const details = [
    `${graph.title}.`,
    graph.description,
    graph.servings ? `Serves ${graph.servings}.` : null,
    formatRecipeTime(graph.prepTimeMinutes)
      ? `Prep time ${formatRecipeTime(graph.prepTimeMinutes)}.`
      : null,
    formatRecipeTime(graph.cookTimeMinutes)
      ? `Cook time ${formatRecipeTime(graph.cookTimeMinutes)}.`
      : null,
    'Ingredients.',
    ...graph.ingredientGroups.flatMap((group) => [
      group.label ? `${group.label}.` : null,
      ...group.ingredients.map((ingredient) => {
        const amount = [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ');
        const preparation = ingredient.preparation ? `, ${ingredient.preparation}` : '';
        const optional = ingredient.isOptional ? ', optional' : '';
        return `${[amount, ingredient.name].filter(Boolean).join(' ')}${preparation}${optional}.`;
      }),
    ]),
    'Instructions.',
    ...graph.stepGroups.flatMap((group) => [
      group.label ? `${group.label}.` : null,
      ...group.steps.map((step, index) => `Step ${index + 1}. ${step.heading ? `${step.heading}. ` : ''}${step.text}`),
    ]),
    ...(graph.notes?.length ? ['Notes.', ...graph.notes] : []),
  ];

  return details.filter((detail): detail is string => Boolean(detail)).join(' ');
}

export function resolveFocusedPageWidth(viewportWidth: number, viewportHeight: number): number {
  const horizontalInset = viewportWidth < 390 ? Spacing.md : Spacing.xl;
  const availableWidth = viewportWidth - horizontalInset * 2;
  const availableHeight = Math.max(240, viewportHeight - 210);
  return Math.min(availableWidth, availableHeight * COOKBOOK_GEOMETRY.page.aspectRatio, 560);
}

export function PageCanvas({ page, bookMode = false, onRenderReady }: PageCanvasProps) {
  const { width, height } = useWindowDimensions();
  const pageWidth = bookMode ? '100%' : resolveFocusedPageWidth(width, height);
  const maxHeight = bookMode ? undefined : Math.max(240, height - 210);

  const completePageSource = page.pageImage?.imageUrl
    ? { uri: page.pageImage.imageUrl }
    : page.imageAsset
      ?? (!page.recipeGraph && page.imageUrl ? { uri: page.imageUrl } : null);

  if (completePageSource) {
    const accessibilityLabel = buildRecipePageAccessibilityLabel(page);
    return (
      <View style={[styles.frame, bookMode && styles.bookFrame, { width: pageWidth, maxHeight }]}>
        <Image
          source={completePageSource}
          style={styles.image}
          resizeMode="contain"
          onLoad={onRenderReady}
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  // Compatibility while existing split-art pages are regenerated.
  if (page.recipeGraph) {
    return (
      <View style={[styles.frame, bookMode && styles.bookFrame, { width: pageWidth, maxHeight }]}>
        <TypesetterPage
          recipeGraph={page.recipeGraph}
          artAsset={page.artAsset ?? null}
          styleId={
            page.styleId && !isCreationPageStyleId(page.styleId)
              ? page.styleId
              : DEFAULT_COOKBOOK_STYLE
          }
          templateId={page.templateId ?? DEFAULT_RECIPE_TEMPLATE_ID}
          bookMode={bookMode}
          onRenderReady={onRenderReady}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, bookMode && styles.bookFrame, { width: pageWidth, maxHeight }]}>
      <PageSkeleton page={page} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: COOKBOOK_GEOMETRY.page.aspectRatio,
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.ash,
    overflow: 'hidden',
    boxShadow: Colors.book.paperShadow,
  },
  bookFrame: {
    height: '100%',
    aspectRatio: undefined,
    borderRadius: Radii.numeric[0],
    borderWidth: 0,
    boxShadow: Shadows.level0.boxShadow,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skeleton: {
    flex: 1,
    backgroundColor: Colors.alabaster,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonInner: {
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 320,
  },
  skeletonEyebrow: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  skeletonTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight30,
    letterSpacing: Typography.metrics.letterSpacing0,
    textAlign: 'center',
  },
  skeletonRule: {
    width: 64,
    height: 1,
    backgroundColor: Colors.ash,
  },
  skeletonHint: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
