import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SelectedRecipeTemplateCard } from '@/components/cookbook/SelectedRecipeTemplateCard';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  ingredientToLine,
  structuredRecipeFromDraft,
} from '@/utils/cookbook/draft';
import type { ParsedRecipeDraft, RecipeTemplateId, StructuredRecipe } from '@/types/cookbook';
import type { GenerationPhase } from '@/utils/cookbook/generationPolling';

interface RecipeReviewFormProps {
  draft: ParsedRecipeDraft;
  confidence: number;
  needsReview: boolean;
  reviewReasons: string[];
  generationPhase?: GenerationPhase;
  generationError?: string | null;
  selectedTemplateId: RecipeTemplateId;
  isOverride?: boolean;
  onOpenTemplateLibrary: () => void;
  onGenerate: (recipe: StructuredRecipe) => Promise<void> | void;
}

export function RecipeReviewForm({
  draft,
  confidence,
  needsReview,
  reviewReasons,
  generationPhase = 'idle',
  generationError = null,
  selectedTemplateId,
  isOverride = false,
  onOpenTemplateLibrary,
  onGenerate,
}: RecipeReviewFormProps) {
  const [title, setTitle] = useState(draft.title);
  const [servings, setServings] = useState(String(draft.servings ?? 4));
  const [ingredients, setIngredients] = useState(draft.ingredients.map(ingredientToLine).join('\n'));
  const [steps, setSteps] = useState(draft.steps.join('\n'));
  const isGenerating = generationPhase === 'queued' || generationPhase === 'running';

  const canGenerate = useMemo(
    () => title.trim().length > 0 && ingredients.trim().length > 0 && steps.trim().length > 0 && !isGenerating,
    [title, ingredients, steps, isGenerating],
  );
  const sourceLabel = useMemo(() => {
    if (draft.sourceUrl) {
      try {
        return `Imported from ${new URL(draft.sourceUrl).hostname.replace(/^www\./, '')}`;
      } catch {
        return 'Imported from the original link';
      }
    }
    if (draft.sourceType === 'image') return 'Imported from an image';
    if (draft.sourceType === 'video') return 'Imported from a video';
    return 'Imported from pasted text';
  }, [draft.sourceType, draft.sourceUrl]);

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
          {isOverride
            ? 'Using a different page style for this recipe.'
            : 'Nosh will use this book\u2019s page style after you confirm the recipe.'}
        </Text>
      </View>

      {Number.isFinite(confidence) ? (
        <Text style={styles.confidence}>
          Import confidence: {Math.round(confidence * 100)}%
        </Text>
      ) : null}

      <Text style={styles.source}>{sourceLabel}</Text>

      {needsReview && reviewReasons.length > 0 ? (
        <View style={styles.reviewNotice}>
          <Text style={styles.reviewNoticeTitle}>Check these details</Text>
          {reviewReasons.map((reason) => (
            <Text key={reason} style={styles.reviewReason}>• {reason}</Text>
          ))}
        </View>
      ) : null}

      {generationPhase !== 'idle' && generationPhase !== 'succeeded' ? (
        <View style={[styles.generationNotice, generationPhase === 'failed' && styles.generationNoticeFailed]}>
          <Text style={styles.generationNoticeTitle}>
            {generationPhase === 'queued'
              ? 'Page queued'
              : generationPhase === 'running'
                ? 'Creating your page'
                : 'Page creation paused'}
          </Text>
          <Text style={styles.generationNoticeBody}>
            {generationPhase === 'queued'
              ? 'Nosh saved this generation and is preparing the artwork.'
              : generationPhase === 'running'
                ? 'You can leave this screen; retrying will check the same generation without another charge.'
                : generationError ?? 'Try again to continue safely.'}
          </Text>
        </View>
      ) : null}

      <SelectedRecipeTemplateCard
        selectedTemplateId={selectedTemplateId}
        isOverride={isOverride}
        onOpenTemplateLibrary={onOpenTemplateLibrary}
        label="Page style"
      />

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
        <Text style={styles.buttonText}>
          {isGenerating
            ? generationPhase === 'queued' ? 'Page queued' : 'Creating page'
            : generationPhase === 'failed' ? 'Try again safely' : 'Create cookbook page - 1 credit'}
        </Text>
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.xs,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
  },
  helper: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  confidence: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: Colors.parchment,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    fontSize: 12,
    fontFamily: Fonts.ui.medium,
  },
  source: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  reviewNotice: {
    gap: Spacing.xs,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.parchment,
    padding: Spacing.md,
  },
  reviewNoticeTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },
  reviewReason: {
    color: Colors.slate,
    fontSize: 13,
    lineHeight: 18,
  },
  generationNotice: {
    gap: Spacing.xs,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.parchment,
    padding: Spacing.md,
  },
  generationNoticeFailed: {
    borderColor: Colors.error,
  },
  generationNoticeTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  generationNoticeBody: {
    color: Colors.slate,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    color: Colors.text,
    padding: Spacing.md,
  },
  block: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    borderWidth: 0,
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
