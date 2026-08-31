/**
 * The persistent Nosh conversation.
 *
 * The runtime is mounted once at the app root. Routes only update its active
 * cookbook/page context, so creating a page never resets the conversation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from '@assistant-ui/react-native';
import { Sheet } from '@/components/ui/Sheet';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { NoshHeaderActions, NoshHeaderIdentity } from '@/components/nosh/conversation/NoshConversationHeader';
import { NoshThreadHistory } from '@/components/nosh/conversation/NoshThreadHistory';
import { NoshInteractionStateSync } from '@/components/nosh/conversation/NoshInteractionStateSync';
import {
  NoshCaptureWorkspace,
  type NoshCaptureHandoffSource,
} from '@/components/nosh/capture/NoshCaptureWorkspace';
import { NoshConversationDisplay } from '@/components/nosh/conversation/NoshConversationDisplay';
import { isDesignedPageLimitReachedError } from '@/components/subscription/subscriptionErrors';
import { Colors } from '@/constants/colors';
import { getCookbookPageStyleReferences } from '@/constants/cookbookCustomization';
import { isNoshContextModelV2Enabled } from '@/constants/featureFlags';
import { Spacing } from '@/constants/spacing';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';
import { useAuth } from '@/hooks/useAuth';
import { COOKBOOK_PAGES_QUERY_KEY } from '@/hooks/useCookbook';
import { SHELF_QUERY_KEY, useCookbooks } from '@/hooks/useCookbooks';
import type { Cookbook, CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';
import type { NoshFocus, NoshInteractionSession } from '@/types/noshInteraction';
import {
  createRecipePageWithGraph,
  fetchPageById,
  fetchCookbookPages,
  getCookbook,
  listCookbooks,
  updatePageRecipeGraph,
  updatePageSelectedVersion,
} from '@/utils/cookbook/api';
import { saveCachedPages, saveCachedShelf } from '@/utils/cookbook/cache';
import {
  loadCollectionActionPreview,
  organizeRecipePage,
  type CollectionActionResult,
} from '@/utils/cookbook/collectionActions';
import { createNoshChatAdapter } from '@/utils/cookbook/noshChatAdapter';
import { createNoshThreadListAdapter } from '@/utils/cookbook/noshThreadStorage';
import { useNoshToolkit } from '@/utils/cookbook/noshToolkit';
import {
  finishRecipePageCandidate,
  finishRecipePageImage,
} from '@/utils/cookbook/pageProduction';
import type {
  RecipeActionCommitMode,
  RecipeActionProposal,
} from '@/utils/cookbook/recipeActions';
import {
  browseRecipeCollection,
  loadRecipeFromCollection,
  searchRecipeCollection,
  type LoadedCollectionRecipe,
} from '@/utils/cookbook/recipeCollection';
import { saveCookingPreference } from '@/utils/cookbook/cookingPreferences';
import { SAMPLE_COOKBOOK_ID } from '@/utils/cookbook/sampleCookbook';
import { normalizeCaptureDestinationCookbookId } from '@/utils/cookbook/captureLifecycle';

const COLLECTION_SESSION: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

function pageStyleReferences(cookbook: Cookbook): string[] | undefined {
  const references = cookbook.pageStyleReferences?.length
    ? cookbook.pageStyleReferences
    : getCookbookPageStyleReferences(cookbook.pageStyleId, cookbook.styleRevision);
  return references?.length ? [...references] : undefined;
}

/** Mounted once in app/_layout.tsx so the transcript survives navigation. */
export function NoshConversationHost() {
  const contextModelEnabled = isNoshContextModelV2Enabled();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { cookbooks } = useCookbooks();
  const conversation = useNoshConversation();
  const { requestConsent } = useAiDataConsent();
  const captureScrollRef = useAnimatedRef<Animated.ScrollView>();
  const {
    visible,
    interaction,
    visibleBookContext,
    pendingImageBase64,
    recipePreview,
    open,
    close,
    requestFocus,
    restoreInteraction,
    updateVisiblePage,
    setPendingImageBase64,
    setPendingImageMimeType,
    setRecipePreview,
    setVisibleBookContext,
  } = conversation;

  const [loadedFocus, setLoadedFocus] = useState<LoadedCollectionRecipe | null>(null);
  const [focusStatus, setFocusStatus] = useState<'ready' | 'loading' | 'missing' | 'stale'>('ready');
  const recipeFocus = interaction.focus.kind === 'recipe' ? interaction.focus : null;
  const visibleFocusedPage = recipeFocus
    ? visibleBookContext.pages.find((page) => page.id === recipeFocus.pageId) ?? null
    : null;
  const canonicalFocusedRecipeGraph = visibleFocusedPage?.recipeGraph
    ?? (recipeFocus && loadedFocus?.pageId === recipeFocus.pageId
      ? loadedFocus.recipeGraph
      : null);
  const focusedRecipeGraph = recipeFocus && recipePreview?.pageId === recipeFocus.pageId
    ? recipePreview.graph
    : canonicalFocusedRecipeGraph;
  const focusedCookbookId = interaction.focus.kind === 'recipe' || interaction.focus.kind === 'cookbook'
    ? interaction.focus.cookbookId
    : undefined;
  const focusedCookbook = cookbooks.find((book) => book.id === focusedCookbookId)
    ?? (visibleBookContext.cookbook?.id === focusedCookbookId ? visibleBookContext.cookbook : null);

  useEffect(() => {
    if (
      recipePreview
      && (interaction.focus.kind !== 'recipe' || recipePreview.pageId !== interaction.focus.pageId)
    ) {
      setRecipePreview(null);
    }
    if (interaction.focus.kind !== 'recipe') {
      setLoadedFocus(null);
      setFocusStatus('ready');
      return;
    }
    if (visibleFocusedPage?.recipeGraph) {
      setLoadedFocus(null);
      setFocusStatus('ready');
      return;
    }

    let cancelled = false;
    setFocusStatus('loading');
    void loadRecipeFromCollection(interaction.focus.pageId)
      .then((loaded) => {
        if (cancelled) return;
        setLoadedFocus(loaded);
        setFocusStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedFocus(null);
        setFocusStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [interaction.focus, recipePreview, setRecipePreview, visibleFocusedPage]);

  const interactionRef = useRef(interaction);
  interactionRef.current = interaction;
  const focusedRecipeGraphRef = useRef(focusedRecipeGraph);
  focusedRecipeGraphRef.current = focusedRecipeGraph;
  const focusedCookbookRef = useRef(focusedCookbook);
  focusedCookbookRef.current = focusedCookbook;
  const focusStatusRef = useRef(focusStatus);
  focusStatusRef.current = focusStatus;
  const visibleBookContextRef = useRef(visibleBookContext);
  visibleBookContextRef.current = visibleBookContext;
  const imageRef = useRef(pendingImageBase64);
  imageRef.current = pendingImageBase64;
  const cookbooksRef = useRef(cookbooks);
  cookbooksRef.current = cookbooks;
  const pendingRecipeCopyRef = useRef<{
    focusPageId: string;
    proposal: RecipeActionProposal;
    page: CookbookPage;
  } | null>(null);
  const [showingHistory, setShowingHistory] = useState(false);
  const [captureHandoffSource, setCaptureHandoffSource] = useState<NoshCaptureHandoffSource | null>(null);

  useEffect(() => {
    if (!visible) setShowingHistory(false);
  }, [visible]);

  useEffect(() => {
    if (interaction.task === 'capture') setShowingHistory(false);
  }, [interaction.task]);

  const clearSessionScratch = useCallback(() => {
    setCaptureHandoffSource(null);
    setPendingImageBase64(null);
    setPendingImageMimeType(null);
    setRecipePreview(null);
  }, [setPendingImageBase64, setPendingImageMimeType, setRecipePreview]);

  const resolveFocusedRecipeGraph = useCallback(async (): Promise<RecipeGraph | null> => {
    const currentInteraction = interactionRef.current;
    if (currentInteraction.focus.kind !== 'recipe') return null;

    const preview = recipePreview?.pageId === currentInteraction.focus.pageId
      ? recipePreview.graph
      : null;
    if (preview) return preview;

    const currentGraph = focusedRecipeGraphRef.current;
    if (currentGraph) return currentGraph;

    setFocusStatus('loading');
    try {
      const loaded = await loadRecipeFromCollection(currentInteraction.focus.pageId);
      if (interactionRef.current.focus.kind !== 'recipe'
        || interactionRef.current.focus.pageId !== loaded.pageId) {
        return null;
      }
      setLoadedFocus(loaded);
      setFocusStatus('ready');
      return loaded.recipeGraph;
    } catch (error) {
      setLoadedFocus(null);
      setFocusStatus('missing');
      throw error;
    }
  }, [recipePreview]);

  const persistFocusedGraph = useCallback(async (graph: RecipeGraph, idempotencyKey: string) => {
    const focus = interactionRef.current.focus;
    if (focus.kind !== 'recipe') throw new Error('No focused recipe to update');
    const cookbook = cookbooksRef.current.find((candidate) => candidate.id === focus.cookbookId)
      ?? await getCookbook(focus.cookbookId);
    if (!cookbook) throw new Error('Cookbook not found');
    const savedGraph = { ...graph, updatedAt: new Date().toISOString() };
    const candidate = await finishRecipePageCandidate({
        cookbookId: cookbook.id,
        pageId: focus.pageId,
        recipeGraph: savedGraph,
        styleId: cookbook.pageStyleId,
        styleRevision: cookbook.styleRevision,
        styleReferences: pageStyleReferences(cookbook),
        idempotencyKey,
    });
    await updatePageRecipeGraph(focus.pageId, savedGraph);
    await updatePageSelectedVersion(focus.pageId, candidate.id);
    const savedPage = await fetchPageById(focus.pageId);
    if (!savedPage) throw new Error('Recipe page not found after saving the update');
    updateVisiblePage(savedPage);
    setLoadedFocus({ pageId: focus.pageId, cookbookId: focus.cookbookId, recipeGraph: savedGraph });
    queryClient.setQueryData<CookbookPage[]>(
      COOKBOOK_PAGES_QUERY_KEY(focus.cookbookId),
      (pages = []) => pages.map((page) => page.id === focus.pageId ? savedPage : page),
    );
  }, [queryClient, updateVisiblePage]);

  const handleCommitRecipeAction = useCallback(async (
    proposal: RecipeActionProposal,
    mode: RecipeActionCommitMode,
    idempotencyKey: string,
  ): Promise<{ pageId?: string }> => {
    const focus = interactionRef.current.focus;
    if (focus.kind !== 'recipe') throw new Error('No focused recipe to change');

    if (mode === 'session') {
      setRecipePreview({ pageId: focus.pageId, graph: proposal.proposed });
      return { pageId: focus.pageId };
    }

    if (mode === 'update') {
      await persistFocusedGraph(proposal.proposed, idempotencyKey);
      setRecipePreview(null);
      return { pageId: focus.pageId };
    }

    if (!user) throw new Error('Sign in to save a new recipe version');
    const cookbook = cookbooksRef.current.find((candidate) => candidate.id === focus.cookbookId)
      ?? await getCookbook(focus.cookbookId);
    if (!cookbook) throw new Error('Cookbook not found');
    const copiedGraph = {
      ...proposal.proposed,
      provenance: {
        ...proposal.proposed.provenance,
        sourceType: proposal.proposed.provenance?.sourceType ?? 'manual',
        confidence: proposal.proposed.provenance?.confidence ?? 1,
      },
    };
    const pendingCopy = pendingRecipeCopyRef.current;
    let copiedPage = pendingCopy?.focusPageId === focus.pageId && pendingCopy.proposal === proposal
      ? pendingCopy.page
      : await createRecipePageWithGraph({
          cookbookId: cookbook.id,
          userId: user.id,
          recipeGraph: copiedGraph,
          styleId: cookbook.pageStyleId,
          templateId: cookbook.pageTemplateId,
        });
    pendingRecipeCopyRef.current = {
      focusPageId: focus.pageId,
      proposal,
      page: copiedPage,
    };
    try {
      copiedPage = await finishRecipePageImage({
        cookbookId: cookbook.id,
        pageId: copiedPage.id,
        recipeGraph: copiedGraph,
        styleId: cookbook.pageStyleId,
        styleRevision: cookbook.styleRevision,
        styleReferences: pageStyleReferences(cookbook),
        idempotencyKey,
      });
    } catch (error) {
      // The authoritative quota check deletes the unpublished page shell. A
      // post-purchase retry must create a fresh page instead of reusing that
      // now-invalid ID. Preserve the pending page for ambiguous failures,
      // where retrying the same request remains the safe idempotent behavior.
      if (isDesignedPageLimitReachedError(error)) {
        pendingRecipeCopyRef.current = null;
      }
      throw error;
    }
    pendingRecipeCopyRef.current = null;
    queryClient.setQueryData<CookbookPage[]>(
      COOKBOOK_PAGES_QUERY_KEY(cookbook.id),
      (pages = []) => [...pages, copiedPage],
    );
    return { pageId: copiedPage.id };
  }, [persistFocusedGraph, queryClient, setRecipePreview, user]);

  const handleGenerateArtCandidate = useCallback(async (
    instruction: string | undefined,
    idempotencyKey: string,
  ): Promise<GeneratedRecipePage> => {
    const focus = interactionRef.current.focus;
    if (focus.kind !== 'recipe') throw new Error('No focused recipe for artwork');
    const graph = focusedRecipeGraphRef.current;
    if (!graph) throw new Error('Recipe data is unavailable');
    const cookbook = cookbooksRef.current.find((candidate) => candidate.id === focus.cookbookId)
      ?? await getCookbook(focus.cookbookId);
    if (!cookbook) throw new Error('Cookbook not found');
    const currentPage = visibleBookContextRef.current.pages.find((page) => page.id === focus.pageId)
      ?? (await fetchCookbookPages(focus.cookbookId)).find((page) => page.id === focus.pageId);

    return finishRecipePageCandidate({
      cookbookId: focus.cookbookId,
      pageId: focus.pageId,
      recipeGraph: graph,
      styleId: cookbook.pageStyleId,
      styleRevision: cookbook.styleRevision,
      styleReferences: pageStyleReferences(cookbook),
      idempotencyKey,
      artDirection: instruction,
      referenceArtUrl: currentPage?.pageImage?.imageUrl ?? currentPage?.artAsset?.artUrl,
    });
  }, []);

  const handleSelectArtCandidate = useCallback(async (candidate: GeneratedRecipePage) => {
    const focus = interactionRef.current.focus;
    if (focus.kind !== 'recipe' || candidate.pageId !== focus.pageId) {
      throw new Error('Artwork candidate does not belong to the focused recipe');
    }
    await updatePageSelectedVersion(focus.pageId, candidate.id);
    const page = await fetchPageById(focus.pageId);
    if (!page) throw new Error('Recipe page not found after artwork selection');
    queryClient.setQueryData<CookbookPage[]>(
      COOKBOOK_PAGES_QUERY_KEY(focus.cookbookId),
      (pages = []) => pages.map((current) => current.id === page.id ? page : current),
    );
    updateVisiblePage(page);
  }, [queryClient, updateVisiblePage]);

  const handleLoadRecipe = useCallback(async (pageId: string) => {
    // Loading a background recipe for reasoning must not navigate the reader or
    // replace what "this recipe" means. open_recipe owns those visible changes.
    return loadRecipeFromCollection(pageId);
  }, []);

  const handleOpenRecipe = useCallback(async (pageId: string) => {
    const loaded = await loadRecipeFromCollection(pageId);
    const cookbook = cookbooksRef.current.find((book) => book.id === loaded.cookbookId)
      ?? await getCookbook(loaded.cookbookId);
    if (!cookbook) throw new Error('That cookbook is no longer available.');

    const pages = await fetchCookbookPages(cookbook.id);
    const page = pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new Error('That saved recipe is no longer available.');

    queryClient.setQueryData(COOKBOOK_PAGES_QUERY_KEY(cookbook.id), pages);
    setVisibleBookContext({ cookbook, pages, page });
    requestFocus({
      kind: 'recipe',
      cookbookId: cookbook.id,
      pageId: page.id,
      title: page.title,
    });
    setLoadedFocus({ pageId: page.id, cookbookId: cookbook.id, recipeGraph: loaded.recipeGraph });
    router.replace(`/(book)/${cookbook.id}?pageId=${page.id}`);
    return {
      success: true as const,
      cookbookId: cookbook.id,
      pageId: page.id,
      title: page.title,
    };
  }, [queryClient, requestFocus, router, setVisibleBookContext]);

  const handleCommitCollectionAction = useCallback(async (input: {
    action: 'move' | 'copy';
    pageId: string;
    destinationCookbookId: string;
    idempotencyKey: string;
  }): Promise<CollectionActionResult> => {
    if (!user) throw new Error('Sign in to organize your cookbooks.');
    const result = await organizeRecipePage(input);
    const cookbookIds = [...new Set([result.sourceCookbookId, result.destinationCookbookId])];
    const [shelf, pageLists] = await Promise.all([
      listCookbooks(user.id),
      Promise.all(cookbookIds.map((cookbookId) => fetchCookbookPages(cookbookId))),
    ]);

    queryClient.setQueryData<Cookbook[]>(SHELF_QUERY_KEY(user.id), shelf);
    await saveCachedShelf(user.id, shelf);
    cookbookIds.forEach((cookbookId, index) => {
      queryClient.setQueryData<CookbookPage[]>(COOKBOOK_PAGES_QUERY_KEY(cookbookId), pageLists[index]);
    });
    await Promise.all(cookbookIds.map((cookbookId, index) => saveCachedPages(cookbookId, pageLists[index])));

    const destination = shelf.find((cookbook) => cookbook.id === result.destinationCookbookId)
      ?? await getCookbook(result.destinationCookbookId);
    const destinationPages = pageLists[cookbookIds.indexOf(result.destinationCookbookId)];
    const resultPage = destinationPages?.find((page) => page.id === result.resultPageId);
    if (!destination || !resultPage) throw new Error('The change was saved, but the destination could not be opened.');

    setVisibleBookContext({ cookbook: destination, pages: destinationPages, page: resultPage });
    requestFocus({
      kind: 'recipe',
      cookbookId: destination.id,
      pageId: resultPage.id,
      title: resultPage.title,
    });
    setLoadedFocus(resultPage.recipeGraph
      ? { pageId: resultPage.id, cookbookId: destination.id, recipeGraph: resultPage.recipeGraph }
      : null);
    router.replace(`/(book)/${destination.id}?pageId=${resultPage.id}`);
    return result;
  }, [queryClient, requestFocus, router, setVisibleBookContext, user]);

  const realCookbooks = cookbooks.filter((book) => book.id !== SAMPLE_COOKBOOK_ID);

  const toolkit = useNoshToolkit({
    recipeGraph: focusedRecipeGraph,
    onCommitRecipeAction: handleCommitRecipeAction,
    onGenerateArtCandidate: handleGenerateArtCandidate,
    onSelectArtCandidate: handleSelectArtCandidate,
    hasCurrentArtwork: Boolean(visibleFocusedPage?.pageImage ?? visibleFocusedPage?.artAsset),
    availableCookbooks: realCookbooks.map((book) => ({ id: book.id, title: book.title })),
    onSearchRecipeCollection: searchRecipeCollection,
    onBrowseRecipeCollection: browseRecipeCollection,
    onLoadRecipe: handleLoadRecipe,
    onOpenRecipe: handleOpenRecipe,
    onLoadCollectionActionPreview: loadCollectionActionPreview,
    onCommitCollectionAction: handleCommitCollectionAction,
    onSaveCookingPreference: async (input) => {
      if (!user) throw new Error('Sign in to save cooking preferences.');
      return saveCookingPreference({ userId: user.id, ...input });
    },
    onStartRecipeCapture: (source) => {
      const destination = visibleBookContextRef.current.cookbook;
      const persistedDestination = normalizeCaptureDestinationCookbookId(destination?.id)
        ? destination
        : null;
      setCaptureHandoffSource({
        ...source,
        ...(source.sourceType === 'image' && imageRef.current
          ? { imageBase64: imageRef.current }
          : {}),
      });
      setPendingImageBase64(null);
      setPendingImageMimeType(null);
      open(
        'cookbook-add',
        persistedDestination
          ? {
              kind: 'cookbook',
              cookbookId: persistedDestination.id,
              title: persistedDestination.title,
            }
          : { kind: 'capture', captureId: `conversation-${Date.now()}`, title: 'Recipe capture' },
      );
    },
    onStartTimer: (durationMinutes, label) => {
      setTimeout(() => {
        Alert.alert(label ?? 'Nosh timer', `${durationMinutes}-minute timer is done.`);
      }, durationMinutes * 60_000);
    },
    onGuideStep: (stepId) => {
      console.info('[Nosh] Guide to recipe step', stepId);
    },
    onSetWalkthrough: (active) => {
      const focus = interactionRef.current.focus;
      if (focus.kind !== 'recipe') return;
      open(active ? 'walkthrough' : 'recipe-ask', focus);
    },
  });

  const adapter = useMemo(() => createNoshChatAdapter(() => {
    const currentInteraction = interactionRef.current;
    const currentBook = currentInteraction.task === 'capture'
      ? visibleBookContextRef.current.cookbook
      : focusedCookbookRef.current;
    return {
      recipeGraph: focusedRecipeGraphRef.current,
      resolveRecipeGraph: resolveFocusedRecipeGraph,
      recipeGraphSource: currentInteraction.focus.kind === 'recipe'
        && recipePreview?.pageId === currentInteraction.focus.pageId
          ? 'session-preview'
          : 'canonical',
      cookbookTitle: currentBook?.title,
      activeCookbookId: currentBook?.id,
      styleId: currentBook?.pageStyleId,
      availableCookbooks: cookbooksRef.current
        .filter((book) => book.id !== SAMPLE_COOKBOOK_ID)
        .map((book) => ({ id: book.id, title: book.title })),
      interaction: {
        ...currentInteraction,
        focusStatus: focusStatusRef.current,
      },
      hasAttachedImage: Boolean(imageRef.current),
    };
  }, requestConsent), [recipePreview, requestConsent, resolveFocusedRecipeGraph]);

  const threadListAdapter = useMemo(
    () => createNoshThreadListAdapter(user?.id),
    [user?.id],
  );
  const runtimeHook = useCallback(function useNoshLocalRuntime() {
    return useLocalRuntime(adapter, {
      maxSteps: 8,
      unstable_humanToolNames: [
        'start_recipe_capture',
        'scale_servings',
        'substitute_ingredient',
        'update_page_data',
        'regenerate_recipe_page',
        'organize_recipe',
        'save_cooking_preference',
      ],
    });
  }, [adapter]);
  const runtime = useRemoteThreadListRuntime({
    runtimeHook,
    adapter: threadListAdapter,
  });
  const config = useMemo(() => AuiConfig({ tools: Tools({ toolkit }) }), [toolkit]);
  const contextLabel = interaction.focus.kind === 'collection'
    ? 'Your cookbook collection'
    : interaction.focus.kind === 'capture'
      ? interaction.focus.title ?? 'Recipe capture'
      : focusStatus === 'missing'
        ? `${interaction.focus.title} · unavailable`
        : interaction.focus.title;

  const startNewConversation = useCallback(async (focus?: NoshFocus) => {
    clearSessionScratch();
    try {
      await runtime.threads.switchToNewThread();
      if (focus) {
        restoreInteraction({
          entryPoint: focus.kind === 'recipe' ? 'recipe-ask' : 'shelf-nosh',
          task: focus.kind === 'recipe' ? 'recipe-help' : 'collection',
          focus,
        });
      } else {
        restoreInteraction(COLLECTION_SESSION);
      }
      setShowingHistory(false);
    } catch (error) {
      Alert.alert(
        'Could not start a new conversation',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, [clearSessionScratch, restoreInteraction, runtime]);

  const closeAndResetHistory = useCallback(() => {
    setShowingHistory(false);
    close();
  }, [close]);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <NoshInteractionStateSync
        interaction={{
          entryPoint: interaction.entryPoint,
          task: interaction.task,
          focus: interaction.focus,
        }}
        onRestoreInteraction={restoreInteraction}
        onThreadChanged={clearSessionScratch}
      />
      <Sheet
        visible={visible}
        onClose={closeAndResetHistory}
        keyboardAvoiding
        maxHeight="88%"
        contentStyle={styles.sheet}
        handleStyle={styles.handle}
        closeButtonStyle={styles.closeButton}
        closeAccessibilityLabel="Close Nosh conversation"
        header={
          <>
            {showingHistory ? (
              <Pressable
                onPress={() => setShowingHistory(false)}
                style={({ pressed }) => [styles.leadingAction, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Back to current conversation"
              >
                <ArrowLeft size={21} color={Colors.text} strokeWidth={1.8} />
              </Pressable>
            ) : (
              <View style={styles.brandMark} accessibilityElementsHidden>
                <NoshSymbol size={30} />
              </View>
            )}
            <NoshHeaderIdentity contextLabel={contextLabel} showingHistory={showingHistory} />
            {interaction.task !== 'capture' ? (
              <NoshHeaderActions
                showingHistory={showingHistory}
                onToggleHistory={() => setShowingHistory((current) => !current)}
                onNewConversation={() => void startNewConversation()}
              />
            ) : null}
          </>
        }
      >
        {showingHistory ? (
          <NoshThreadHistory
            onOpenConversation={() => {
              clearSessionScratch();
              setShowingHistory(false);
            }}
            onDeleteActive={clearSessionScratch}
          />
        ) : (
          <>
            {interaction.task === 'capture' ? (
              <Animated.ScrollView
                ref={captureScrollRef}
                style={styles.captureScroll}
                contentContainerStyle={styles.captureScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <NoshCaptureWorkspace
                  initialSource={captureHandoffSource}
                  destinationCookbookId={interaction.focus.kind === 'cookbook'
                    ? interaction.focus.cookbookId
                    : undefined}
                  captureId={interaction.focus.kind === 'capture'
                    ? interaction.focus.captureId
                    : undefined}
                  scrollableRef={captureScrollRef}
                />
              </Animated.ScrollView>
            ) : (
              <NoshConversationDisplay
                interaction={interaction}
                contextModelEnabled={contextModelEnabled}
                sendDisabled={interaction.focus.kind === 'recipe' && focusStatus === 'loading'}
              />
            )}
          </>
        )}
      </Sheet>
    </AssistantRuntimeProvider>
  );
}

export { NoshAssistantChatButton, NoshShelfChatButton } from '@/components/nosh/NoshLaunchers';

const styles = StyleSheet.create({
  sheet: {
    height: '88%',
    backgroundColor: Colors.alabaster,
    borderColor: Colors.ash,
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  handle: { backgroundColor: Colors.duskGrey },
  closeButton: { backgroundColor: 'transparent', borderWidth: 0 },
  captureScroll: { flex: 1 },
  captureScrollContent: { paddingBottom: Spacing.lg },
  brandMark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingAction: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  pressed: { opacity: 0.55, transform: [{ scale: 0.97 }] },
});
