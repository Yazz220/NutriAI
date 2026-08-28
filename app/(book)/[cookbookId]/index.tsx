import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BookReader } from '@/components/cookbook/BookReader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Colors } from '@/constants/colors';
import { getCookbookPageStyleReferences } from '@/constants/cookbookCustomization';
import { COOKBOOK_PAGES_QUERY_KEY, useCookbook } from '@/hooks/useCookbook';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';
import { useToast } from '@/contexts/ToastContext';
import { exportCookbookPageImage, shareCookbookPage } from '@/utils/cookbook/share';
import { exportCookbookPdf } from '@/utils/cookbook/cookbookExport';
import { openRecipeSource } from '@/utils/cookbook/readerActions';
import {
  createCollectionActionRequestKey,
  organizeRecipePage,
  removeRecipePage,
} from '@/utils/cookbook/collectionActions';
import { isSampleCookbookId } from '@/utils/cookbook/sampleCookbook';
import {
  applyRecipePageRevision,
  fetchPageById,
  updatePageSelectedVersion,
} from '@/utils/cookbook/api';
import { finishRecipePageCandidate } from '@/utils/cookbook/pageProduction';
import type { Cookbook, CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

export default function BookReaderScreen() {
  const { showToast } = useToast();
  const { requestConsent } = useAiDataConsent();
  const queryClient = useQueryClient();
  const { cookbookId, pageId } = useLocalSearchParams<{
    cookbookId: string;
    pageId?: string | string[];
  }>();
  const normalizedPageId = Array.isArray(pageId) ? pageId[0] : pageId;
  const {
    cookbook,
    pages,
    setSelectedPageId,
    isLoading,
    cookbookError,
    pagesError,
    hasPageData,
    isStale,
    refresh,
  } = useCookbook(cookbookId);

  // The shelf already has the cookbook metadata cached. Use it to render
  // the cover instantly while useCookbook fetches pages — eliminates the
  // white flash on navigation from the shelf.
  const {
    cookbooks: shelfCookbooks,
    deleteCookbook,
    updateCookbookTitle,
  } = useCookbooks();
  const shelfCookbook = shelfCookbooks.find((book) => book.id === cookbookId);
  const effectiveCookbook = cookbook ?? shelfCookbook ?? null;
  const movableCookbooks = shelfCookbooks.filter((book) => !isSampleCookbookId(book.id));

  const removePageFromReader = (removedPageId: string) => {
    const removedIndex = pages.findIndex((page) => page.id === removedPageId);
    const remainingPages = pages.filter((page) => page.id !== removedPageId);
    const fallbackPage = remainingPages[Math.min(Math.max(removedIndex, 0), remainingPages.length - 1)];

    queryClient.setQueryData<CookbookPage[]>(COOKBOOK_PAGES_QUERY_KEY(cookbookId), remainingPages);
    setSelectedPageId(fallbackPage?.id ?? null);
  };

  const refreshRecipeCollections = async (destinationCookbookId?: string) => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: COOKBOOK_PAGES_QUERY_KEY(cookbookId) }),
      queryClient.invalidateQueries({ queryKey: ['cookbook-shelf'] }),
      queryClient.invalidateQueries({ queryKey: ['recipe-captures'] }),
    ];
    if (destinationCookbookId) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: COOKBOOK_PAGES_QUERY_KEY(destinationCookbookId) }),
      );
    }
    await Promise.all(invalidations);
  };

  const handleShare = async (page: CookbookPage) => {
    try {
      await shareCookbookPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'This page is not ready to share yet.';
      Alert.alert('Share unavailable', message);
    }
  };

  const handleExportPage = async (page: CookbookPage) => {
    try {
      await exportCookbookPageImage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'This page is not ready to export yet.';
      Alert.alert('Export unavailable', message);
    }
  };

  const handleVisitSource = async (page: CookbookPage) => {
    try {
      await openRecipeSource(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The original source could not be opened.';
      Alert.alert('Source unavailable', message);
    }
  };

  const handleRenameCookbook = async (title: string) => {
    await updateCookbookTitle({ cookbookId, title });
    showToast({ message: 'Cookbook name updated.', type: 'success' });
  };

  const handleExportCookbook = async () => {
    if (!effectiveCookbook) throw new Error('Cookbook not found.');
    await exportCookbookPdf(effectiveCookbook, pages);
  };

  const handleMoveRecipe = async (page: CookbookPage, destination: Cookbook) => {
    const result = await organizeRecipePage({
      action: 'move',
      pageId: page.id,
      destinationCookbookId: destination.id,
      idempotencyKey: createCollectionActionRequestKey(),
    });

    removePageFromReader(page.id);
    await refreshRecipeCollections(result.destinationCookbookId);
    showToast({
      message: `Moved to ${result.destinationCookbookTitle}.`,
      type: 'success',
      action: {
        label: 'Open',
        onPress: () => router.push({
          pathname: '/(book)/[cookbookId]',
          params: {
            cookbookId: result.destinationCookbookId,
            pageId: result.resultPageId,
          },
        }),
      },
    });
  };

  const handleRemoveRecipe = (page: CookbookPage) => {
    Alert.alert(
      'Remove recipe?',
      `This permanently removes ${page.title} from ${effectiveCookbook?.title ?? 'this cookbook'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove recipe',
          style: 'destructive',
          onPress: () => {
            void removeRecipePage(page.id)
              .then(async () => {
                removePageFromReader(page.id);
                await refreshRecipeCollections();
                showToast({ message: `${page.title} was removed.`, type: 'success' });
              })
              .catch((error) => {
                const message = error instanceof Error ? error.message : 'The recipe could not be removed.';
                Alert.alert('Remove failed', message);
              });
          },
        },
      ],
    );
  };

  const handleGeneratePageCandidate = async (
    page: CookbookPage,
    recipeGraph: RecipeGraph,
    instruction: string | undefined,
    idempotencyKey: string,
  ): Promise<GeneratedRecipePage> => {
    if (!effectiveCookbook) throw new Error('Cookbook not found.');
    const allowed = await requestConsent();
    if (!allowed) throw new Error('AI processing permission is required to create a new recipe page.');
    const styleReferences = effectiveCookbook.pageStyleReferences?.length
      ? effectiveCookbook.pageStyleReferences
      : getCookbookPageStyleReferences(effectiveCookbook.pageStyleId);

    return finishRecipePageCandidate({
      cookbookId,
      pageId: page.id,
      recipeGraph,
      styleId: effectiveCookbook.pageStyleId,
      styleRevision: effectiveCookbook.styleRevision,
      styleReferences: styleReferences?.length ? [...styleReferences] : undefined,
      idempotencyKey,
      artDirection: instruction,
      referenceArtUrl: page.pageImage?.imageUrl ?? page.artAsset?.artUrl,
    });
  };

  const handleUsePageCandidate = async (
    page: CookbookPage,
    candidate: GeneratedRecipePage,
    recipeGraph?: RecipeGraph,
  ) => {
    if (recipeGraph) {
      await applyRecipePageRevision(page.id, recipeGraph, candidate.id);
    } else {
      await updatePageSelectedVersion(page.id, candidate.id);
    }

    const updatedPage = await fetchPageById(page.id);
    if (!updatedPage) throw new Error('Recipe page not found after the update.');
    queryClient.setQueryData<CookbookPage[]>(
      COOKBOOK_PAGES_QUERY_KEY(cookbookId),
      (current = []) => current.map((item) => item.id === updatedPage.id ? updatedPage : item),
    );
    showToast({
      message: recipeGraph ? 'Recipe and page updated.' : 'New page design applied.',
      type: 'success',
    });
  };

  const handleDeleteCookbook = () => {
    Alert.alert(
      'Delete cookbook?',
      `This permanently deletes ${effectiveCookbook?.title ?? 'this cookbook'} and all of its recipe pages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete cookbook',
          style: 'destructive',
          onPress: () => {
            void deleteCookbook(cookbookId)
              .then(() => router.dismissTo('/(book)'))
              .catch((error) => {
                const message = error instanceof Error ? error.message : 'The cookbook could not be deleted.';
                Alert.alert('Delete failed', message);
              });
          },
        },
      ],
    );
  };

  // Only show the full-screen spinner if we have NO cookbook metadata at
  // all (not even from the shelf). If we have the cookbook, render the
  // reader immediately — the cover shows instantly and pages stream in.
  if (isLoading && !effectiveCookbook) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if ((cookbookError && !cookbook) || (pagesError && !hasPageData && !effectiveCookbook)) {
    return (
      <LoadErrorState
        title="Could not open this cookbook"
        message="The book could not be loaded. Check your connection and try again."
        onRetry={() => {
          void refresh();
        }}
        onBack={() => router.replace('/(book)')}
      />
    );
  }

  if (!effectiveCookbook) {
    return (
      <LoadErrorState
        title="Cookbook not found"
        message="This cookbook may have been removed or is no longer available."
        onBack={() => router.replace('/(book)')}
      />
    );
  }

  return (
    <BookReader
      cookbook={effectiveCookbook}
      pages={pages}
      initialPageId={normalizedPageId}
      onSelectPage={setSelectedPageId}
      onShare={handleShare}
      onExportPage={handleExportPage}
      onVisitSource={handleVisitSource}
      availableCookbooks={movableCookbooks}
      onMoveRecipe={handleMoveRecipe}
      onRemoveRecipe={handleRemoveRecipe}
      onGeneratePageCandidate={handleGeneratePageCandidate}
      onUsePageCandidate={handleUsePageCandidate}
      onRenameCookbook={handleRenameCookbook}
      onExportCookbook={handleExportCookbook}
      onDeleteCookbook={handleDeleteCookbook}
      readOnly={isSampleCookbookId(cookbookId)}
      isStale={isStale}
      onRefresh={() => {
        void refresh();
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
