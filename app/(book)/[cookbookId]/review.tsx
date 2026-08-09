import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { RecipeReviewForm } from '@/components/cookbook/RecipeReviewForm';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useCookbook } from '@/hooks/useCookbook';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { generateCookbookPage } from '@/utils/cookbook/api';
import {
  getOrCreateGenerationAttempt,
  type GenerationAttempt,
} from '@/utils/cookbook/generationAttempt';
import { buildCookbookPagePromptPayload } from '@/utils/cookbook/pagePrompt';
import {
  GenerationPollingCancelledError,
  GenerationPollingTimeoutError,
  pollCookbookGeneration,
  type GenerationPhase,
} from '@/utils/cookbook/generationPolling';
import {
  FunctionNetworkError,
  FunctionResponseError,
  FunctionTimeoutError,
} from '@/utils/supabaseEdge';
import type { StructuredRecipe } from '@/types/cookbook';

export default function RecipeReviewScreen() {
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const { cookbook, refresh, upsertPage } = useCookbook(cookbookId);
  const {
    draft,
    setDraft,
    confidence,
    needsReview,
    reasons,
    clearSourceDraft,
    selectedTemplateId,
    favoriteTemplateIds,
  } = useCookbookImport();
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationAttemptRef = useRef<GenerationAttempt | null>(null);
  const generationRunRef = useRef(0);

  useEffect(() => {
    if (!draft) {
      router.replace(`/(book)/${cookbookId}/add`);
    }
  }, [draft, cookbookId]);

  useEffect(() => () => {
    generationRunRef.current += 1;
  }, []);

  async function generateReviewedRecipe(recipe: StructuredRecipe) {
    setDraft(recipe);

    if (!cookbook) {
      Alert.alert('Cookbook not ready', 'Try again once your cookbook has loaded.');
      return;
    }

    const promptPayload = buildCookbookPagePromptPayload({
      recipe,
      cookbook,
      recipeTemplateId: selectedTemplateId,
    });
    const generationPayload = {
      cookbookId: cookbook.id,
      recipe,
      promptPayload,
    };
    const attempt = getOrCreateGenerationAttempt(generationAttemptRef.current, generationPayload);
    generationAttemptRef.current = attempt;

    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    setGenerationError(null);
    setGenerationPhase('queued');
    try {
      const page = await pollCookbookGeneration(
        () => generateCookbookPage({
          ...generationPayload,
          idempotencyKey: attempt.key,
        }),
        {
          onPhase: setGenerationPhase,
          isCancelled: () => generationRunRef.current !== runId,
        },
      );
      if (generationRunRef.current !== runId) return;
      setGenerationPhase('succeeded');
      generationAttemptRef.current = null;
      upsertPage(page);
      clearSourceDraft();
      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Cookbook refresh failed after page generation', refreshError);
      }
      router.replace(`/(book)/${cookbookId}/generation/${page.id}`);
    } catch (err) {
      if (err instanceof GenerationPollingCancelledError) return;
      const requestMayStillBeRunning =
        err instanceof FunctionTimeoutError ||
        err instanceof FunctionNetworkError ||
        err instanceof GenerationPollingTimeoutError ||
        (err instanceof FunctionResponseError && err.status === 500);
      if (!requestMayStillBeRunning) generationAttemptRef.current = null;
      const message = err instanceof Error ? err.message : 'Could not generate this page.';
      setGenerationError(message);
      setGenerationPhase('failed');
    }
  }

  if (!draft) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Sending you back to add a recipe.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RecipeReviewForm
        draft={draft}
        confidence={confidence}
        needsReview={needsReview}
        reviewReasons={reasons}
        generationPhase={generationPhase}
        generationError={generationError}
        selectedTemplateId={selectedTemplateId}
        favoriteTemplateIds={favoriteTemplateIds}
        onOpenTemplateLibrary={() => router.push(`/(book)/${cookbookId}/templates`)}
        onGenerate={generateReviewedRecipe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.slate,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
