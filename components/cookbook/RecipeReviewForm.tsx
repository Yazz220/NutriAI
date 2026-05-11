import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  ingredientToLine,
  structuredRecipeFromDraft,
} from '@/utils/cookbook/draft';
import type { ParsedRecipeDraft, StructuredRecipe } from '@/types/cookbook';

interface RecipeReviewFormProps {
  draft: ParsedRecipeDraft;
  isGenerating?: boolean;
  onGenerate: (recipe: StructuredRecipe) => Promise<void> | void;
}

export function RecipeReviewForm({ draft, isGenerating = false, onGenerate }: RecipeReviewFormProps) {
  const [title, setTitle] = useState(draft.title);
  const [servings, setServings] = useState(String(draft.servings ?? 4));
  const [ingredients, setIngredients] = useState(draft.ingredients.map(ingredientToLine).join('\n'));
  const [steps, setSteps] = useState(draft.steps.join('\n'));

  const canGenerate = useMemo(
    () => title.trim().length > 0 && ingredients.trim().length > 0 && steps.trim().length > 0 && !isGenerating,
    [title, ingredients, steps, isGenerating],
  );

  async function submit() {
    if (!canGenerate) return;

    await onGenerate(structuredRecipeFromDraft(draft, { title, servings, ingredients, steps }));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Review recipe</Text>
        <Text style={styles.title}>Make sure this recipe reads the way you want.</Text>
        <Text style={styles.helper}>
          Nosh will turn this into a cookbook page after you confirm it.
        </Text>
      </View>

      {typeof draft.confidence === 'number' ? (
        <Text style={styles.confidence}>
          Import confidence: {Math.round(draft.confidence * 100)}%
        </Text>
      ) : null}

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Recipe title"
        placeholderTextColor={Colors.textMuted}
        editable={!isGenerating}
      />
      <TextInput
        style={styles.input}
        value={servings}
        onChangeText={setServings}
        keyboardType="number-pad"
        placeholder="Servings"
        placeholderTextColor={Colors.textMuted}
        editable={!isGenerating}
      />
      <TextInput
        style={[styles.input, styles.block]}
        value={ingredients}
        onChangeText={setIngredients}
        multiline
        placeholder="Ingredients, one per line"
        placeholderTextColor={Colors.textMuted}
        editable={!isGenerating}
      />
      <TextInput
        style={[styles.input, styles.block]}
        value={steps}
        onChangeText={setSteps}
        multiline
        placeholder="Directions, one per line"
        placeholderTextColor={Colors.textMuted}
        editable={!isGenerating}
      />

      <TouchableOpacity style={[styles.button, !canGenerate && styles.disabled]} disabled={!canGenerate} onPress={submit}>
        <Text style={styles.buttonText}>{isGenerating ? 'Creating page' : 'Create cookbook page - 1 credit'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
  },
  helper: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  confidence: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: Colors.cardSecondary,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    fontSize: 12,
    fontFamily: Fonts.ui.medium,
  },
  input: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: Spacing.md,
  },
  block: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
  },
  disabled: {
    opacity: 0.45,
  },
});
