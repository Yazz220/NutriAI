/**
 * TextLayer — renders the recipe text as native React Native Views.
 *
 * This layer is transparent (no background) so the ArtLayer shows through.
 * It renders:
 *   - Recipe title (selectable, accessibility header)
 *   - Meta row (servings, prep time, cook time)
 *   - Accent rule (drawn as a View, matching the Skia rule position)
 *   - Ingredient groups with labels
 *   - Step groups with labels
 *   - Notes (if any)
 *
 * All text is selectable, accessible to VoiceOver/TalkBack, and respects
 * Dynamic Type. When the RecipeGraph changes, this layer re-renders
 * instantly — no art re-generation needed.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { TypesetterStyleConfig } from '@/constants/typesetterStyles';
import type { TypesetterLayoutConfig } from '@/constants/typesetterLayouts';
import type { RecipeGraph, IngredientGroup, StepGroup } from '@/types/recipeGraph';

export interface TextLayerProps {
  /** Page width in pixels. */
  width: number;
  /** Page height in pixels. */
  height: number;
  /** The recipe graph to render. */
  recipeGraph: RecipeGraph;
  /** The typesetter style config for this page's cookbook style. */
  styleConfig: TypesetterStyleConfig;
  /** The typesetter layout config for this page's recipe template. */
  layoutConfig: TypesetterLayoutConfig;
  /** The Y position where the text content should start (below the art zone). */
  contentStartY: number;
}

export const TextLayer = memo(function TextLayer({
  width,
  height,
  recipeGraph,
  styleConfig,
  layoutConfig,
  contentStartY,
}: TextLayerProps) {
  const margin = width * styleConfig.marginRatio;
  const sectionGap = height * layoutConfig.sectionGapRatio;

  const titleStyle = useMemo(
    () => ({
      fontFamily: styleConfig.titleFontFamily,
      fontSize: styleConfig.titleSize,
      lineHeight: styleConfig.titleSize * 1.2,
      color: styleConfig.inkColor,
      letterSpacing: 0,
    }),
    [styleConfig],
  );

  const metaStyle = useMemo(
    () => ({
      fontFamily: styleConfig.bodyFontFamily,
      fontSize: styleConfig.metaSize,
      lineHeight: styleConfig.metaSize * 1.5,
      color: styleConfig.mutedColor,
      letterSpacing: 0.4,
    }),
    [styleConfig],
  );

  const labelStyle = useMemo(
    () => ({
      fontFamily: styleConfig.labelFontFamily,
      fontSize: styleConfig.labelSize,
      lineHeight: styleConfig.labelSize * 1.4,
      color: styleConfig.accentColor,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
    }),
    [styleConfig],
  );

  const bodyStyle = useMemo(
    () => ({
      fontFamily: styleConfig.bodyFontFamily,
      fontSize: styleConfig.bodySize,
      lineHeight: styleConfig.bodySize * 1.65,
      color: styleConfig.inkColor,
      letterSpacing: 0,
    }),
    [styleConfig],
  );

  const quantityStyle = useMemo(
    () => ({
      ...bodyStyle,
      fontFamily: styleConfig.labelFontFamily,
      color: styleConfig.inkColor,
    }),
    [bodyStyle, styleConfig],
  );

  const preparationStyle = useMemo(
    () => ({
      ...bodyStyle,
      color: styleConfig.mutedColor,
      fontStyle: 'italic' as const,
    }),
    [bodyStyle, styleConfig],
  );

  const stepNumberStyle = useMemo(
    () => ({
      ...bodyStyle,
      fontFamily: styleConfig.labelFontFamily,
      color: styleConfig.accentColor,
    }),
    [bodyStyle, styleConfig],
  );

  const noteStyle = useMemo(
    () => ({
      ...bodyStyle,
      color: styleConfig.mutedColor,
      fontStyle: 'italic' as const,
    }),
    [bodyStyle, styleConfig],
  );

  const metaLabel = [
    `${recipeGraph.servings} serving${recipeGraph.servings === 1 ? '' : 's'}`,
    recipeGraph.prepTimeMinutes != null && recipeGraph.prepTimeMinutes > 0
      ? `Prep ${recipeGraph.prepTimeMinutes}m`
      : null,
    recipeGraph.cookTimeMinutes != null && recipeGraph.cookTimeMinutes > 0
      ? `Cook ${recipeGraph.cookTimeMinutes}m`
      : null,
    recipeGraph.cuisine ? recipeGraph.cuisine : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const hasTwoColumns = layoutConfig.twoColumnContent;

  return (
    <View style={[styles.container, { top: contentStartY, left: margin, right: margin }]}>
      {/* Title */}
      <Text
        style={titleStyle}
        selectable
        accessibilityRole="header"
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {recipeGraph.title}
      </Text>

      {/* Meta row */}
      {metaLabel ? (
        <Text style={metaStyle} selectable accessibilityLabel={metaLabel}>
          {metaLabel}
        </Text>
      ) : null}

      {/* Content: ingredients and steps */}
      {hasTwoColumns ? (
        <View style={styles.twoColumnContent}>
          <View style={styles.column}>
            {recipeGraph.ingredientGroups.map((group, index) => (
              <IngredientGroupView
                key={`${group.id || 'ingredient-group'}-${index}`}
                group={group}
                labelStyle={labelStyle}
                bodyStyle={bodyStyle}
                quantityStyle={quantityStyle}
                preparationStyle={preparationStyle}
              />
            ))}
          </View>
          <View style={styles.column}>
            {recipeGraph.stepGroups.map((group, index) => (
              <StepGroupView
                key={`${group.id || 'step-group'}-${index}`}
                group={group}
                labelStyle={labelStyle}
                bodyStyle={bodyStyle}
                stepNumberStyle={stepNumberStyle}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.singleColumnContent}>
          {recipeGraph.ingredientGroups.map((group, index) => (
            <IngredientGroupView
              key={`${group.id || 'ingredient-group'}-${index}`}
              group={group}
              labelStyle={labelStyle}
              bodyStyle={bodyStyle}
              quantityStyle={quantityStyle}
              preparationStyle={preparationStyle}
            />
          ))}
          <View style={{ height: sectionGap }} />
          {recipeGraph.stepGroups.map((group, index) => (
            <StepGroupView
              key={`${group.id || 'step-group'}-${index}`}
              group={group}
              labelStyle={labelStyle}
              bodyStyle={bodyStyle}
              stepNumberStyle={stepNumberStyle}
            />
          ))}
        </View>
      )}

      {/* Notes */}
      {recipeGraph.notes && recipeGraph.notes.length > 0 ? (
        <View style={{ marginTop: sectionGap }}>
          <Text style={labelStyle}>Notes</Text>
          {recipeGraph.notes.map((note, i) => (
            <Text key={i} style={noteStyle} selectable>
              {'\u2022'} {note}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
});

/** Render a single ingredient group with optional label. */
function IngredientGroupView({
  group,
  labelStyle,
  bodyStyle,
  quantityStyle,
  preparationStyle,
}: {
  group: IngredientGroup;
  labelStyle: Record<string, unknown>;
  bodyStyle: Record<string, unknown>;
  quantityStyle: Record<string, unknown>;
  preparationStyle: Record<string, unknown>;
}) {
  return (
    <View>
      {group.label ? <Text style={labelStyle as object} selectable>{group.label}</Text> : null}
      {group.ingredients.map((ingredient, i) => (
        <Text key={i} style={bodyStyle as object} selectable>
          {ingredient.quantity || ingredient.unit ? (
            <Text style={quantityStyle as object}>
              {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')}
            </Text>
          ) : null}
          {ingredient.quantity || ingredient.unit ? ' ' : null}
          <Text>{ingredient.name}</Text>
          {ingredient.preparation ? (
            <Text style={preparationStyle as object}>, {ingredient.preparation}</Text>
          ) : null}
        </Text>
      ))}
    </View>
  );
}

/** Render a single step group with optional label. */
function StepGroupView({
  group,
  labelStyle,
  bodyStyle,
  stepNumberStyle,
}: {
  group: StepGroup;
  labelStyle: Record<string, unknown>;
  bodyStyle: Record<string, unknown>;
  stepNumberStyle: Record<string, unknown>;
}) {
  return (
    <View>
      {group.label ? <Text style={labelStyle as object} selectable>{group.label}</Text> : null}
      {group.steps.map((step, i) => (
        <Text key={`${step.id || 'step'}-${i}`} style={bodyStyle as object} selectable>
          <Text style={stepNumberStyle as object}>{i + 1}.</Text>
          {' '}
          {step.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
  },
  singleColumnContent: {
    flexDirection: 'column',
  },
  twoColumnContent: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
});
