import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { ParsedRecipeDraft, StructuredIngredient, StructuredRecipe } from '@/types/cookbook';

interface RecipeReviewFormProps {
  draft: ParsedRecipeDraft;
  isGenerating?: boolean;
  onGenerate: (recipe: StructuredRecipe) => Promise<void> | void;
}

function ingredientToLine(ingredient: StructuredIngredient) {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
}

function linesFromText(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function ingredientsFromText(value: string, originalIngredients: StructuredIngredient[]) {
  const originalLines = originalIngredients.map(ingredientToLine);
  return linesFromText(value).map((line, index) => {
    const original = originalIngredients[index];
    if (original && line === originalLines[index]) {
      return original;
    }
    return { name: line };
  });
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

    await onGenerate({
      ...draft,
      id: draft.id ?? `draft-${Date.now()}`,
      title: title.trim(),
      servings: Number(servings) || 4,
      ingredients: ingredientsFromText(ingredients, draft.ingredients),
      steps: linesFromText(steps),
      tags: draft.tags ?? [],
      category: draft.category ?? 'dinner',
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Review before spending a credit</Text>

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
        <Text style={styles.buttonText}>{isGenerating ? 'Generating' : 'Generate page - 1 credit'}</Text>
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
  title: {
    ...Typography.h2,
    color: Colors.text,
  },
  input: {
    borderRadius: Radii.md,
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
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});
