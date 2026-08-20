import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { PageStyleSheet } from '@/components/cookbook/PageStyleSheet';
import { RecipeReviewForm } from '@/components/cookbook/RecipeReviewForm';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useCookbook } from '@/hooks/useCookbook';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import {
  createRecipePageWithGraph,
  fetchPageById,
  generatePageArt,
  updatePageSelectedVersion,
} from '@/utils/cookbook/api';
import {
  getOrCreateGenerationAttempt,
  type GenerationAttempt,
} from '@/utils/cookbook/generationAttempt';
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
import { fromLegacyRecipe } from '@/types/recipeGraph';
import type { CookbookStyleId, RecipeTemplateId, StructuredRecipe } from '@/types/cookbook';

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
  } = useCookbookImport();
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationAttemptRef = useRef<GenerationAttempt | null>(null);
  const generationRunRef = useRef(0);

  // Per-recipe override; falls back to the book's default page style.
  const bookDefaultTemplateId = cookbook?.pageTemplateId ?? 'clean-cream';
  const [overrideTemplateId, setOverrideTemplateId] = useState<RecipeTemplateId | null>(null);
  const [styleSheetOpen, setStyleSheetOpen] = useState(false);
  const effectiveTemplateId = overrideTemplateId ?? bookDefaultTemplateId;

  useEffect(() => {
    if (!draft) {
      router.replace(`/(book)/${cookbookId}/add`);
    }
  }, [draft, cookbookId]);

  useEffect(() => () => {
    generationRunRef.current += 1;
  }, []);

  /**
   * New-pipeline generation (Phase 4.5):
   * 1. Create the page row with the RecipeGraph stored as JSONB
   * 2. Call generate-page-art to produce the illustration
   * 3. Poll for the art asset
   * 4. When art is ready, link it to the page via selected_version_id
   * 5. Fetch the updated page and upsert it into the cache
   */
  async function generateWithNewPipeline(
    recipe: StructuredRecipe,
    attempt: GenerationAttempt,
    runId: number,
  ): Promise<void> {
    if (!cookbook) return;

    const styleId: CookbookStyleId = cookbook.coverStyle ?? 'vintage-garden';
    const graph = fromLegacyRecipe(recipe);

    // 1. Create the page row with the RecipeGraph
    const createdPage = await createRecipePageWithGraph({
      cookbookId: cookbook.id,
      recipeGraph: graph,
      styleId,
      templateId: effectiveTemplateId,
    });

    // 2–4. Poll for art generation
    const page = await pollCookbookGeneration(
      async () => {
        const result = await generatePageArt({
          cookbookId: cookbook.id,
          pageId: createdPage.id,
          recipeGraph: graph,
          styleId,
          idempotencyKey: attempt.key,
        });

        if ('artAsset' in result) {
          // Art is ready — link it to the page
          await updatePageSelectedVersion(createdPage.id, result.artAsset.id);
          const updatedPage = await fetchPageById(createdPage.id);
          if (!updatedPage) throw new Error('Page not found after art generation');
          return { status: 'ready' as const, page: updatedPage };
        }

        return result; // { status: 'processing', requestId }
      },
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
  }

  async function generateReviewedRecipe(recipe: StructuredRecipe) {
    setDraft(recipe);

    if (!cookbook) {
      Alert.alert('Cookbook not ready', 'Try again once your cookbook has loaded.');
      return;
    }

    const generationPayload = { cookbookId: cookbook.id, recipe };

    const attempt = getOrCreateGenerationAttempt(generationAttemptRef.current, generationPayload);
    generationAttemptRef.current = attempt;

    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    setGenerationError(null);
    setGenerationPhase('queued');
    try {
      await generateWithNewPipeline(recipe, attempt, runId);
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
        selectedTemplateId={effectiveTemplateId}
        isOverride={overrideTemplateId !== null}
        onOpenTemplateLibrary={() => setStyleSheetOpen(true)}
        onGenerate={generateReviewedRecipe}
      />
      <PageStyleSheet
        visible={styleSheetOpen}
        selectedId={effectiveTemplateId}
        onSelect={(id) => setOverrideTemplateId(id)}
        onClose={() => setStyleSheetOpen(false)}
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
