/**
 * The persistent Nosh conversation.
 *
 * The runtime is mounted once at the app root. Routes only update its active
 * cookbook/page context, so creating a page never resets the conversation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat } from 'lucide-react-native';
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from '@assistant-ui/react-native';
import { Sheet } from '@/components/ui/Sheet';
import { NoshFocusChangePrompt } from '@/components/nosh/conversation/NoshFocusChangePrompt';
import { NoshHeaderActions, NoshHeaderIdentity } from '@/components/nosh/conversation/NoshConversationHeader';
import { NoshThreadHistory } from '@/components/nosh/conversation/NoshThreadHistory';
import { NoshInteractionStateSync } from '@/components/nosh/conversation/NoshInteractionStateSync';
import {
  NoshCaptureWorkspace,
  type NoshCaptureHandoffSource,
} from '@/components/nosh/capture/NoshCaptureWorkspace';
import { NoshConversationDisplay } from '@/components/nosh/conversation/NoshConversationDisplay';
import { Colors } from '@/constants/colors';
import { getCookbookPageStyleReferences } from '@/constants/cookbookCustomization';
import { isNoshContextModelV2Enabled } from '@/constants/featureFlags';
import { Radii, Spacing, Typography } from '@/constants/spacing';
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
import { createGenerationRequestKey } from '@/utils/cookbook/generationAttempt';
import {
  finishRecipePageCandidate,
  finishRecipePageImage,
} from '@/utils/cookbook/pageProduction';
import type {
  RecipeActionCommitMode,
  RecipeActionProposal,
} from '@/utils/cookbook/recipeActions';
import {
  loadRecipeFromCollection,
  searchRecipeCollection,
  type LoadedCollectionRecipe,
} from '@/utils/cookbook/recipeCollection';
import { SAMPLE_COOKBOOK_ID } from '@/utils/cookbook/sampleCookbook';
import { normalizeCaptureDestinationCookbookId } from '@/utils/cookbook/captureLifecycle';
import { Fonts } from '@/utils/fonts';

const COLLECTION_SESSION: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

function pageStyleReferences(cookbook: Cookbook): string[] | undefined {
  const references = cookbook.pageStyleReferences?.length
    ? cookbook.pageStyleReferences
    : getCookbookPageStyleReferences(cookbook.pageStyleId);
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
  const {
    visible,
    interaction,
    requestedFocus,
    visibleBookContext,
    pendingImageBase64,
    recipePreview,
    open,
    close,
    requestFocus,
    acceptRequestedFocus,
    dismissRequestedFocus,
    restoreInteraction,
    updateVisiblePage,
    setPendingImageBase64,
    setPendingImageMimeType,
    setRecipePreview,
    setVisibleBookContext,
  } = conversation;

  const [loadedFocus, setLoadedFocus] = useState<LoadedCollectionRecipe | null>(null);
  const [focusStatus, setFocusStatus] = useState<'ready' | 'loading' | 'missing'>('ready');
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

  const persistFocusedGraph = useCallback(async (graph: RecipeGraph) => {
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
        idempotencyKey: createGenerationRequestKey(),
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
  ): Promise<{ pageId?: string }> => {
    const focus = interactionRef.current.focus;
    if (focus.kind !== 'recipe') throw new Error('No focused recipe to change');

    if (mode === 'session') {
      setRecipePreview({ pageId: focus.pageId, graph: proposal.proposed });
      return { pageId: focus.pageId };
    }

    if (mode === 'update') {
      await persistFocusedGraph(proposal.proposed);
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
        extractionNotes: [
          ...(proposal.proposed.provenance.extractionNotes ?? []),
          `Saved as a copy of ${proposal.original.title}.`,
        ],
      },
    };
    let copiedPage = await createRecipePageWithGraph({
      cookbookId: cookbook.id,
      userId: user.id,
      recipeGraph: copiedGraph,
      styleId: cookbook.pageStyleId,
      templateId: cookbook.pageTemplateId,
    });
    copiedPage = await finishRecipePageImage({
        cookbookId: cookbook.id,
        pageId: copiedPage.id,
        recipeGraph: copiedGraph,
        styleId: cookbook.pageStyleId,
        styleRevision: cookbook.styleRevision,
        styleReferences: pageStyleReferences(cookbook),
        idempotencyKey: createGenerationRequestKey(),
    });
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
    const loaded = await loadRecipeFromCollection(pageId);
    requestFocus({
      kind: 'recipe',
      cookbookId: loaded.cookbookId,
      pageId: loaded.pageId,
      title: loaded.recipeGraph.title,
    });
    setLoadedFocus(loaded);
    setFocusStatus('ready');
    return loaded;
  }, [requestFocus]);

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
    onLoadRecipe: handleLoadRecipe,
    onOpenRecipe: handleOpenRecipe,
    onLoadCollectionActionPreview: loadCollectionActionPreview,
    onCommitCollectionAction: handleCommitCollectionAction,
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
  }, requestConsent), [requestConsent]);

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
            <View style={styles.iconBadge}>
              <ChefHat size={20} color={Colors.onPrimary} />
            </View>
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
            onNewConversation={() => void startNewConversation()}
            onOpenConversation={() => {
              clearSessionScratch();
              setShowingHistory(false);
            }}
            onDeleteActive={clearSessionScratch}
          />
        ) : (
          <>
            {requestedFocus ? (
              <NoshFocusChangePrompt
                requestedFocus={requestedFocus}
                currentLabel={contextLabel}
                onAccept={acceptRequestedFocus}
                onStartNew={() => {
                  dismissRequestedFocus();
                  void startNewConversation(requestedFocus);
                }}
              />
            ) : null}
            {interaction.task === 'capture' ? (
              <ScrollView
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
                />
              </ScrollView>
            ) : (
              <NoshConversationDisplay
                interaction={interaction}
                contextModelEnabled={contextModelEnabled}
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
  closeButton: { backgroundColor: Colors.white },
  captureScroll: { flex: 1 },
  captureScrollContent: { paddingBottom: Spacing.lg },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: Radii.numeric[21],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  headerText: { flex: 1 },
  eyebrow: { color: Colors.textMuted, fontSize: Typography.sizes.md, fontFamily: Fonts.ui.medium },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.xl, },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  headerActionDisabled: { opacity: 0.4 },
  threadContainer: { flex: 1, gap: Spacing.sm },
  messagesList: { flex: 1, minHeight: 220 },
  messagesContent: { gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.values[2] },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: {
    maxWidth: '86%',
    borderRadius: Radii.lg,
    borderBottomRightRadius: Radii.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  userText: { color: Colors.onPrimary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, fontFamily: Fonts.ui.regular },
  assistantRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.numeric[14],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginTop: Spacing.values[2],
  },
  assistantBubble: {
    flex: 1,
    maxWidth: '88%',
    borderRadius: Radii.lg,
    borderBottomLeftRadius: Radii.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  assistantText: { color: Colors.text, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, fontFamily: Fonts.ui.regular },
  suggestionsContainer: { gap: Spacing.xs, paddingVertical: Spacing.sm },
  welcomeTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.md, },
  welcomeCopy: { color: Colors.textSecondary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight19, maxWidth: 390 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  chip: {
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  composerArea: { gap: Spacing.xs },
  attachmentChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.values[6],
  },
  attachmentText: { color: Colors.text, fontSize: Typography.sizes.md, fontFamily: Fonts.ui.medium },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    padding: Spacing.values[4],
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    color: Colors.text,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.values[9],
    fontSize: Typography.sizes.md,
    fontFamily: Fonts.ui.regular,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  sendDisabled: { opacity: 0.35 },
  cancelButton: {
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ash,
    paddingHorizontal: Spacing.sm,
  },
  cancelText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  button: {
    minWidth: 126,
    height: 44,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.values[18],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[7],
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    boxShadow: Colors.book.cardShadow,
  },
  buttonLabel: { color: Colors.text, fontFamily: Fonts.ui.medium },
  shelfButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 132,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.numeric[27],
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.liftedShadow,
  },
  shelfEntry: {
    position: 'absolute',
    right: Spacing.md,
    top: 132,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    boxShadow: Colors.book.liftedShadow,
  },
  shelfEntryText: { gap: Spacing.values[1], paddingRight: Spacing.xs },
  shelfEntryTitle: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  shelfEntryCopy: { color: Colors.onPrimary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, opacity: 0.82 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.parchment,
    padding: Spacing.md,
    marginHorizontal: Spacing.values[2],
  },
  progressGlyph: {
    width: 42,
    height: 42,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.numeric[21],
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  progressScanLine: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 20,
    height: 2,
    borderRadius: Radii.numeric[1],
    backgroundColor: Colors.primary,
  },
  progressText: { flex: 1, gap: Spacing.values[2] },
  progressLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  progressDetail: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
  },
  progressTrail: {
    flexDirection: 'row',
    gap: Spacing.values[5],
    marginTop: Spacing.values[5],
  },
  progressDot: {
    width: 18,
    height: 2,
    borderRadius: Radii.numeric[1],
    backgroundColor: Colors.ash,
  },
  progressDotActive: { backgroundColor: Colors.primary },
  historyPanel: { flex: 1, minHeight: 260, gap: Spacing.md },
  historyIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ash,
    paddingBottom: Spacing.md,
  },
  historyHeading: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.md, },
  historyCopy: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, marginTop: Spacing.values[2] },
  newConversationButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[7],
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
  },
  newConversationText: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  historyListRoot: { flex: 1 },
  historyListContent: { gap: Spacing.sm, paddingBottom: Spacing.md },
  historyItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xs,
  },
  historyItemActive: { borderColor: Colors.charcoal, backgroundColor: Colors.parchment },
  historyItemMain: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  historyMark: {
    width: 8,
    height: 28,
    borderRadius: Radii.numeric[4],
    backgroundColor: Colors.ash,
  },
  historyMarkActive: { backgroundColor: Colors.butterscotch },
  historyItemText: { flex: 1, gap: Spacing.values[3] },
  historyTitle: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  historyMeta: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  historySmallAction: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameEditor: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[2],
    paddingLeft: Spacing.sm,
  },
  renameInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.white,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.values[7],
  },
  historyDelete: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[4], paddingRight: Spacing.values[4] },
  deleteCancel: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.values[7] },
  deleteCancelText: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  deleteConfirmButton: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
  },
  deleteConfirmText: { color: Colors.onError, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  historyEmpty: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.ash,
    backgroundColor: Colors.parchment,
    padding: Spacing.xl,
  },
  historyEmptyTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.md, textAlign: 'center' },
  historyEmptyCopy: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
    maxWidth: 280,
  },
  focusPrompt: {
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.parchment,
    padding: Spacing.md,
  },
  focusPromptTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.md, },
  focusPromptCopy: { color: Colors.textSecondary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight18 },
  focusPrimaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
  },
  focusPrimaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  focusSecondaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  focusSecondaryText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
});
