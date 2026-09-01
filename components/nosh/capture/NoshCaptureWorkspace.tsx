import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { type AnimatedRef } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';
import {
  UnifiedIntakeComposer,
  type RecipeIntakeImage,
  type UnifiedIntakePayload,
} from '@/components/cookbook/UnifiedIntakeComposer';
import { CookbookPageGrid } from '@/components/cookbook/CookbookPageGrid';
import { RecipeCorrectionSheet } from '@/components/nosh/capture/RecipeCorrectionSheet';
import { PageAllowanceStatus } from '@/components/subscription/PageAllowanceStatus';
import { useSubscriptionUi } from '@/components/subscription/SubscriptionHost';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import { useCookbook } from '@/hooks/useCookbook';
import { useCookbookPageOrder } from '@/hooks/useCookbookPageOrder';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import {
  removeRecipeCaptureStoragePaths,
  uploadRecipeCaptureAudio,
  uploadRecipeCaptureImage,
  uploadRecipeCaptureImages,
  uploadRecipeCaptureVideo,
} from '@/utils/cookbook/api';
import {
  createCaptureRequestKey,
  normalizeCaptureDestinationCookbookId,
  type RecipeCapture,
  type RecipeCaptureSource,
} from '@/utils/cookbook/captureLifecycle';
import {
  getCapturePresentation,
} from '@/utils/cookbook/capturePresentation';
import { Fonts } from '@/utils/fonts';
import type { RecipeCaptureAudioAsset } from '@/utils/cookbook/recipeCaptureAudio';
import type { RecipeCaptureVideoAsset } from '@/utils/cookbook/recipeCaptureVideo';
import { trackEvent } from '@/utils/analytics';
import { classifyVideoSourceUrl } from '@/supabase/functions/_shared/videoSource';
import {
  defaultFirstRunOnboardingState,
  isFirstRunCapture,
  loadFirstRunOnboardingState,
  recordFirstCaptureStarted,
  recordFirstReadyRecipeOpened,
  type FirstRunOnboardingState,
} from '@/utils/cookbook/firstRunOnboarding';

interface NoshCaptureWorkspaceProps {
  destinationCookbookId?: string;
  captureId?: string;
  initialSource?: NoshCaptureHandoffSource | null;
  scrollableRef?: AnimatedRef<Animated.ScrollView>;
}

export interface NoshCaptureHandoffSource {
  sourceType: 'url' | 'text' | 'image' | 'video';
  input?: string;
  imageBase64?: string;
}

export function NoshCaptureWorkspace({
  destinationCookbookId,
  captureId: initialCaptureId,
  initialSource,
  scrollableRef,
}: NoshCaptureWorkspaceProps) {
  const router = useRouter();
  const { close: closeNoshConversation } = useNoshConversation();
  const { requestConsent } = useAiDataConsent();
  const { user } = useAuth();
  const { cookbooks } = useCookbooks();
  const captureState = useRecipeCaptures();
  const { requestPageAccess } = useSubscriptionUi();
  const { refresh: refreshSubscription } = useNoshSubscription();
  const [captureId, setCaptureId] = useState(initialCaptureId);
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<RecipeIntakeImage[]>([]);
  const [audioAttachment, setAudioAttachment] = useState<RecipeCaptureAudioAsset | null>(null);
  const [videoAttachment, setVideoAttachment] = useState<RecipeCaptureVideoAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [replacementCaptureId, setReplacementCaptureId] = useState<string>();
  const [selectedDestinationCookbookId, setSelectedDestinationCookbookId] = useState(
    destinationCookbookId,
  );
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(
    defaultFirstRunOnboardingState,
  );
  const [firstRunReady, setFirstRunReady] = useState(false);
  const handoffStartedRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const availableCookbooks = useMemo(
    () => cookbooks.filter((cookbook) => cookbook.userId === user?.id),
    [cookbooks, user?.id],
  );
  const capture = captureState.captures.find((candidate) => candidate.id === captureId);
  const pageAccessReason = initialSource ? 'agent_capture' : 'page_capture';
  const captureDestinationCookbookId = capture?.status === 'ready'
    ? undefined
    : capture?.destinationCookbookId;
  const activeDestinationCookbookId = captureDestinationCookbookId
    ?? destinationCookbookId
    ?? selectedDestinationCookbookId;
  const cookbookState = useCookbook(activeDestinationCookbookId);
  const pageOrder = useCookbookPageOrder(activeDestinationCookbookId);
  const destination = availableCookbooks.find(
    (cookbook) => cookbook.id === activeDestinationCookbookId,
  );
  const isFirstCaptureExperience = firstRunReady && isFirstRunCapture(
    firstRunState,
    activeDestinationCookbookId,
    capture?.id,
  );

  useEffect(() => {
    if (destinationCookbookId) {
      if (selectedDestinationCookbookId !== destinationCookbookId) {
        setSelectedDestinationCookbookId(destinationCookbookId);
      }
      return;
    }
    if (captureDestinationCookbookId) {
      if (selectedDestinationCookbookId !== captureDestinationCookbookId) {
        setSelectedDestinationCookbookId(captureDestinationCookbookId);
      }
      return;
    }
    if (!selectedDestinationCookbookId && availableCookbooks[0]) {
      setSelectedDestinationCookbookId(availableCookbooks[0].id);
    }
  }, [availableCookbooks, captureDestinationCookbookId, destinationCookbookId, selectedDestinationCookbookId]);

  useEffect(() => {
    if (!user?.id) {
      setFirstRunState(defaultFirstRunOnboardingState());
      setFirstRunReady(false);
      return;
    }
    let cancelled = false;
    setFirstRunReady(false);
    loadFirstRunOnboardingState(user.id)
      .then((state) => {
        if (cancelled) return;
        setFirstRunState(state);
        setFirstRunReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setFirstRunReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (initialCaptureId) setCaptureId(initialCaptureId);
  }, [initialCaptureId]);

  const submit = useCallback(async (payload: UnifiedIntakePayload) => {
    if (!user || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);
    let unclaimedStoragePaths: string[] = [];
    try {
      if (!await requestPageAccess(pageAccessReason)) {
        setInput(payload.input ?? '');
        if (payload.type === 'image') {
          setImageBase64(payload.imageBase64 ?? null);
          setImageUri(payload.imageUri ?? null);
          setImageMimeType(payload.mimeType ?? null);
          setAdditionalImages(payload.additionalImages ?? []);
        } else if (payload.type === 'audio') {
          setAudioAttachment(payload.audio);
        } else if (payload.type === 'video' && 'video' in payload) {
          setVideoAttachment(payload.video);
        }
        return;
      }
      if (!await requestConsent()) return;
      const requestKey = createCaptureRequestKey();
      let source: RecipeCaptureSource;
      if (payload.type === 'image') {
        const images = [
          {
            imageUri: payload.imageUri,
            imageBase64: payload.imageBase64,
            mimeType: payload.mimeType,
          },
          ...(payload.additionalImages ?? []).map((image) => ({
            imageUri: image.uri,
            mimeType: image.mimeType ?? undefined,
          })),
        ];
        if (images.length === 1) {
          const upload = await uploadRecipeCaptureImage({
            userId: user.id,
            ...images[0],
            requestKey,
          });
          unclaimedStoragePaths = [upload.storagePath];
          source = { type: 'image', ...upload, notes: payload.input };
        } else {
          const upload = await uploadRecipeCaptureImages({ userId: user.id, images, requestKey });
          unclaimedStoragePaths = [upload.storagePath, ...upload.additionalImagePaths];
          source = { type: 'image', ...upload, notes: payload.input };
        }
      } else if (payload.type === 'audio') {
        const upload = await uploadRecipeCaptureAudio({
          userId: user.id,
          audio: payload.audio,
          requestKey,
        });
        unclaimedStoragePaths = [upload.storagePath];
        source = { type: 'audio', ...upload, notes: payload.input };
      } else if (payload.type === 'video' && 'video' in payload) {
        const upload = await uploadRecipeCaptureVideo({
          userId: user.id,
          video: payload.video,
          requestKey,
        });
        unclaimedStoragePaths = [upload.storagePath, ...upload.framePaths];
        source = {
          type: 'video',
          ...upload,
          rightsConfirmed: payload.rightsConfirmed,
          notes: payload.input,
        };
      } else if (payload.type === 'video') {
        source = {
          type: 'video',
          input: payload.input,
          rightsConfirmed: payload.rightsConfirmed,
        };
      } else {
        source = { type: payload.type, input: payload.input };
      }
      const result = await captureState.startCapture({
        source,
        destinationCookbookId: normalizeCaptureDestinationCookbookId(activeDestinationCookbookId),
        idempotencyKey: requestKey,
      });
      unclaimedStoragePaths = [];
      if (replacementCaptureId && replacementCaptureId !== result.capture.id) {
        try {
          await captureState.discardCapture(replacementCaptureId);
        } catch {
          setError('The new recipe started, but the old item could not be removed.');
        } finally {
          setReplacementCaptureId(undefined);
        }
      }
      void refreshSubscription();
      const firstCapture = await recordFirstCaptureStarted(
        user.id,
        result.capture.id,
        result.capture.destinationCookbookId ?? normalizeCaptureDestinationCookbookId(activeDestinationCookbookId),
      ).catch(() => null);
      if (firstCapture) {
        setFirstRunState(firstCapture.state);
        if (firstCapture.didRecord) {
          trackEvent({
            type: 'first_recipe_capture_started',
            data: {
              captureId: result.capture.id,
              sourceType: source.type,
              cookbookId: result.capture.destinationCookbookId ?? activeDestinationCookbookId,
            },
          });
        }
      }
      setCaptureId(result.capture.id);
      setInput('');
      setImageBase64(null);
      setImageUri(null);
      setImageMimeType(null);
      setAdditionalImages([]);
      setAudioAttachment(null);
      setVideoAttachment(null);
    } catch (reason) {
      if (unclaimedStoragePaths.length > 0) {
        await removeRecipeCaptureStoragePaths(unclaimedStoragePaths).catch(() => undefined);
      }
      setError(reason instanceof Error ? reason.message : 'Folio could not save this recipe.');
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [activeDestinationCookbookId, captureState, pageAccessReason, refreshSubscription, replacementCaptureId, requestConsent, requestPageAccess, user]);

  useEffect(() => {
    if (!initialSource || !user || capture || handoffStartedRef.current) return;
    if (initialSource.sourceType === 'image' && !initialSource.imageBase64) {
      handoffStartedRef.current = true;
      setError('The attached image is no longer available. Please attach it again.');
      return;
    }

    handoffStartedRef.current = true;
    const payload: UnifiedIntakePayload = initialSource.sourceType === 'image'
      ? {
          type: 'image',
          imageBase64: initialSource.imageBase64!,
          input: initialSource.input,
        }
      : initialSource.sourceType === 'video'
        ? { type: 'video', input: initialSource.input ?? '', rightsConfirmed: false }
        : { type: initialSource.sourceType, input: initialSource.input ?? '' };
    void submit(payload);
  }, [capture, initialSource, submit, user]);

  async function chooseDestination(cookbookId: string) {
    if (!capture) return;
    setError(null);
    try {
      if (!await requestConsent()) return;
      await captureState.prepareDestination({ captureId: capture.id, destinationCookbookId: cookbookId });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start this recipe page.');
    }
  }

  async function retryCapture() {
    if (!capture || !await requestConsent()) return;
    setError(null);
    try {
      await captureState.retryCapture(capture.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not continue this recipe page.');
    } finally {
      void refreshSubscription();
    }
  }

  async function continueAfterPageLimit() {
    if (!capture) return;
    const allowed = await requestPageAccess(pageAccessReason, { refresh: true });
    if (!allowed) return;

    // Retry this durable capture once. Its extracted recipe and destination
    // checkpoints remain intact, so the user never has to submit it again.
    await retryCapture();
  }

  const captureGenerationSettled = capture?.status === 'ready' || capture?.status === 'needs_attention';
  useEffect(() => {
    if (!captureGenerationSettled) return;
    void refreshSubscription();
  }, [capture?.updatedAt, captureGenerationSettled, refreshSubscription]);

  async function correctCapture(recipeGraph: NonNullable<RecipeCapture['recipeGraph']>) {
    if (!capture || !await requestConsent()) return;
    setError(null);
    try {
      await captureState.correctCapture({ captureId: capture.id, recipeGraph });
      setCorrectionVisible(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the recipe corrections.');
    }
  }

  function showComposer() {
    setCaptureId(undefined);
    setReplacementCaptureId(undefined);
    setError(null);
  }

  function replaceSource() {
    if (!capture) return;
    setReplacementCaptureId(capture.id);
    setCaptureId(undefined);
    setError(null);
  }

  async function discardCapture() {
    if (!capture) return;
    setError(null);
    try {
      await captureState.discardCapture(capture.id);
      setCaptureId(undefined);
      if (replacementCaptureId === capture.id) setReplacementCaptureId(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove this recipe.');
    }
  }

  async function openCookbookPage(page: CookbookPage) {
    const pageCapture = captureState.captures.find((candidate) =>
      candidate.id === page.captureId || candidate.pageId === page.id
    );
    if (user?.id && pageCapture) {
      const activation = await recordFirstReadyRecipeOpened(
        user.id,
        page.cookbookId,
        page.id,
      ).catch(() => null);
      if (activation) {
        setFirstRunState(activation.state);
        if (activation.didActivate) {
          trackEvent({
            type: 'first_ready_recipe_opened',
            data: {
              captureId: pageCapture.id,
              cookbookId: page.cookbookId,
              pageId: page.id,
            },
          });
        }
      }
    }
    closeNoshConversation();
    router.replace(`/(book)/${page.cookbookId}?pageId=${page.id}`);
  }

  if (initialCaptureId && captureState.isLoading) {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingCopy}>Opening recipe…</Text>
      </View>
    );
  }

  const recoveryCapture = capture?.status === 'needs_destination' || capture?.status === 'needs_attention'
    ? capture
    : undefined;

  return (
    <>
      <View style={styles.workspace}>
      {isFirstCaptureExperience ? <FirstCaptureIntro /> : null}
      {!destinationCookbookId && availableCookbooks.length > 0 ? (
        <WorkspaceDestinationPicker
          cookbooks={availableCookbooks}
          selectedCookbookId={activeDestinationCookbookId}
          onSelect={setSelectedDestinationCookbookId}
        />
      ) : null}
      <PageAllowanceStatus />
      <UnifiedIntakeComposer
        isSubmitting={isSubmitting || captureState.isStarting}
        input={input}
        imageBase64={imageBase64}
        imageUri={imageUri}
        imageMimeType={imageMimeType}
        additionalImages={additionalImages}
        audioAttachment={audioAttachment}
        videoAttachment={videoAttachment}
        error={error}
        onInputChange={(value) => { setInput(value); setError(null); }}
        onImageBase64Change={setImageBase64}
        onImageUriChange={(uri, mimeType) => {
          setImageUri(uri);
          setImageMimeType(mimeType);
        }}
        onAdditionalImagesChange={setAdditionalImages}
        onAudioAttachmentChange={setAudioAttachment}
        onVideoAttachmentChange={setVideoAttachment}
        onSourceChange={() => setError(null)}
        onSubmit={submit}
      />

      {activeDestinationCookbookId ? (
        <View style={styles.pageWorkspaceSection}>
          <View style={styles.pageWorkspaceHeader}>
            <Text style={styles.pageWorkspaceTitle} numberOfLines={1}>
              {destination?.title ?? cookbookState.cookbook?.title ?? 'Your cookbook'}
            </Text>
            <Text style={styles.pageWorkspaceCount}>
              {cookbookState.pageSlots.length} {cookbookState.pageSlots.length === 1 ? 'page' : 'pages'}
            </Text>
          </View>
          {cookbookState.pageSlots.length > 1 ? (
            <Text style={styles.pageWorkspaceHint}>Hold and drag pages to reorder.</Text>
          ) : null}
          {pageOrder.error ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              The new page order could not be saved. Your previous order was restored.
            </Text>
          ) : null}
          <CookbookPageGrid
            cookbookId={activeDestinationCookbookId}
            pageSlots={cookbookState.pageSlots}
            captures={captureState.captures}
            onOpenPage={(page) => { void openCookbookPage(page); }}
            onOpenCapture={(selectedCapture) => {
              setReplacementCaptureId(undefined);
              setError(null);
              setCaptureId(selectedCapture.id);
            }}
            onMovePage={pageOrder.isReordering ? undefined : pageOrder.movePage}
            includeUnassignedCaptures={!destinationCookbookId}
            scrollableRef={scrollableRef}
            emptyTitle="Your first page will appear here."
            emptyDetail=""
            showPattern={false}
            testID="capture-cookbook-page-grid"
          />
        </View>
      ) : null}

      </View>

      <Sheet
        visible={Boolean(recoveryCapture)}
        onClose={captureState.isDiscarding ? () => undefined : showComposer}
        maxHeight="88%"
        closeAccessibilityLabel="Close recipe recovery"
        header={recoveryCapture ? (
          <Text style={styles.recoverySheetTitle}>
            {recoveryCapture.status === 'needs_destination' ? 'Choose a cookbook' : 'Recipe needs attention'}
          </Text>
        ) : undefined}
      >
        {recoveryCapture ? (
          <ScrollView
            contentContainerStyle={styles.recoverySheetContent}
            showsVerticalScrollIndicator={false}
          >
            <CaptureDetail
              capture={recoveryCapture}
              destination={destination}
              availableCookbooks={availableCookbooks}
              error={error}
              isPreparingDestination={captureState.isPreparingDestination}
              isRetrying={captureState.isRetrying}
              isCorrecting={captureState.isCorrecting}
              isDiscarding={captureState.isDiscarding}
              onReplaceSource={replaceSource}
              onCorrect={() => { setError(null); setCorrectionVisible(true); }}
              onChooseDestination={chooseDestination}
              onRetry={() => { void retryCapture(); }}
              onRemove={() => { void discardCapture(); }}
              onResolvePageLimit={() => { void continueAfterPageLimit(); }}
              onCreateCookbook={() => router.push(`/(book)/library?captureId=${encodeURIComponent(recoveryCapture.id)}`)}
            />
          </ScrollView>
        ) : null}
      </Sheet>

      <RecipeCorrectionSheet
        visible={correctionVisible && Boolean(recoveryCapture)}
        recipeGraph={recoveryCapture?.recipeGraph ?? null}
        saving={captureState.isCorrecting}
        error={error}
        onClose={() => { setCorrectionVisible(false); setError(null); }}
        onSubmit={correctCapture}
      />
    </>
  );
}

function WorkspaceDestinationPicker({
  cookbooks,
  selectedCookbookId,
  onSelect,
}: {
  cookbooks: Cookbook[];
  selectedCookbookId?: string;
  onSelect: (cookbookId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedCookbook = cookbooks.find((cookbook) => cookbook.id === selectedCookbookId) ?? cookbooks[0];
  const selectedStyle = selectedCookbook ? getCookbookStyle(selectedCookbook.coverStyle) : null;

  return (
    <View style={styles.workspaceDestination}>
      <Text style={styles.workspaceDestinationLabel}>Add to</Text>
      <Pressable
        style={({ pressed }) => [styles.workspaceDestinationTrigger, pressed && styles.pressed]}
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={`Change destination cookbook. Currently ${selectedCookbook?.title ?? 'not selected'}`}
        accessibilityState={{ expanded }}
      >
        <View
          style={[
            styles.workspaceDestinationSwatch,
            { backgroundColor: selectedStyle?.palette.spine ?? Colors.sage },
          ]}
        />
        <Text style={styles.workspaceDestinationTitle} numberOfLines={1}>
          {selectedCookbook?.title ?? 'Choose a cookbook'}
        </Text>
        <ChevronDown
          size={17}
          color={Colors.textSecondary}
          style={expanded ? styles.workspaceDestinationChevronExpanded : undefined}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.workspaceDestinationOptions}>
          {cookbooks.map((cookbook) => {
            const selected = cookbook.id === selectedCookbookId;
            const style = getCookbookStyle(cookbook.coverStyle);
            return (
              <Pressable
                key={cookbook.id}
                style={({ pressed }) => [
                  styles.workspaceDestinationOption,
                  selected && styles.workspaceDestinationOptionSelected,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  onSelect(cookbook.id);
                  setExpanded(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Add recipes to ${cookbook.title}`}
              >
                <View style={[styles.workspaceDestinationSwatch, { backgroundColor: style.palette.spine }]} />
                <Text style={styles.workspaceDestinationOptionText} numberOfLines={1}>
                  {cookbook.title}
                </Text>
                {selected ? <Check size={15} color={Colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function CaptureDetail({
  capture,
  destination,
  availableCookbooks,
  error,
  isPreparingDestination,
  isRetrying,
  isCorrecting,
  isDiscarding,
  onReplaceSource,
  onCorrect,
  onChooseDestination,
  onRetry,
  onRemove,
  onResolvePageLimit,
  onCreateCookbook,
}: {
  capture: RecipeCapture;
  destination?: Cookbook;
  availableCookbooks: Cookbook[];
  error: string | null;
  isPreparingDestination: boolean;
  isRetrying: boolean;
  isCorrecting: boolean;
  isDiscarding: boolean;
  onReplaceSource: () => void;
  onCorrect: () => void;
  onChooseDestination: (cookbookId: string) => Promise<void>;
  onRetry: () => void;
  onRemove: () => void;
  onResolvePageLimit: () => void;
  onCreateCookbook: () => void;
}) {
  const presentation = getCapturePresentation(capture, destination?.title);

  if (capture.status === 'needs_destination') {
    return (
      <View style={styles.destinationCard} accessibilityLiveRegion="polite">
        <View style={styles.icon}><BookOpen size={21} color={Colors.text} /></View>
        <Text style={styles.title}>{presentation.title}</Text>
        <Text style={styles.copy}>{presentation.detail}</Text>
        {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.bookList}>
          {availableCookbooks.map((cookbook) => (
            <CookbookChoice
              key={cookbook.id}
              cookbook={cookbook}
              disabled={isPreparingDestination || isDiscarding}
              onPress={() => void onChooseDestination(cookbook.id)}
            />
          ))}
        </View>
        {availableCookbooks.length === 0 ? (
          <Button title="Create a cookbook" onPress={onCreateCookbook} disabled={isDiscarding} fullWidth />
        ) : null}
        <RemoveCaptureAction isRemoving={isDiscarding} onRemove={onRemove} />
      </View>
    );
  }

  if (capture.status === 'needs_attention') {
    if (capture.failureCode === 'designed_page_limit_reached') {
      return (
        <StateCard
          icon={<BookOpen size={21} color={Colors.primary} />}
          title="This recipe is ready for its page"
          copy="Folio saved and understood this recipe. Check your page allowance to continue without starting over."
          action={(
            <View style={styles.detailActions}>
              {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
              <Button
                title="Continue page creation"
                onPress={onResolvePageLimit}
                loading={isRetrying}
                disabled={isDiscarding}
                fullWidth
              />
              <RemoveCaptureAction isRemoving={isDiscarding} onRemove={onRemove} />
            </View>
          )}
        />
      );
    }

    const shouldReplaceSource = presentation.action === 'replace_source';
    const shouldCorrectRecipe = presentation.action === 'correct_recipe';
    const sourceUrl = typeof capture.sourcePayload.input === 'string'
      ? capture.sourcePayload.input
      : null;
    const sourceClassification = sourceUrl ? classifyVideoSourceUrl(sourceUrl) : null;
    const canOpenOriginal = (
      capture.failureCode === 'video_source_unsupported'
      || capture.failureCode === 'video_unavailable'
    ) && sourceClassification?.kind === 'platform_link';
    return (
      <StateCard
        icon={<AlertTriangle size={21} color={Colors.error} />}
        iconTone="error"
        title={shouldReplaceSource || shouldCorrectRecipe ? presentation.title : 'This recipe needs another try'}
        copy={presentation.detail}
        action={(
          <View style={styles.detailActions}>
            {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
            <Button
              title={presentation.actionLabel ?? 'Try again'}
              onPress={shouldReplaceSource ? onReplaceSource : shouldCorrectRecipe ? onCorrect : onRetry}
              loading={shouldCorrectRecipe ? isCorrecting : !shouldReplaceSource && isRetrying}
              disabled={isDiscarding}
              fullWidth
            />
            {canOpenOriginal && sourceUrl ? (
              <Button
                title="Open original"
                variant="outline"
                onPress={() => { void Linking.openURL(sourceUrl); }}
                disabled={isDiscarding}
                fullWidth
              />
            ) : null}
            <RemoveCaptureAction isRemoving={isDiscarding} onRemove={onRemove} />
          </View>
        )}
      />
    );
  }

  return (
    <StateCard
      icon={<AlertTriangle size={21} color={Colors.error} />}
      iconTone="error"
      title="This page needs another try"
      copy="Folio saved the recipe but did not publish a finished page. Try it again from here."
      action={(
        <View style={styles.detailActions}>
          {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
          <Button title="Try again" onPress={onRetry} loading={isRetrying} disabled={isDiscarding} fullWidth />
          <RemoveCaptureAction isRemoving={isDiscarding} onRemove={onRemove} />
        </View>
      )}
    />
  );
}

function RemoveCaptureAction({
  isRemoving,
  onRemove,
}: {
  isRemoving: boolean;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        title="Remove"
        variant="ghost"
        icon={<Trash2 size={17} color={Colors.textMuted} />}
        onPress={() => setConfirming(true)}
        disabled={isRemoving}
        fullWidth
      />
    );
  }

  return (
    <View style={styles.removeConfirm} accessibilityLiveRegion="polite">
      <Text style={styles.removeConfirmText}>Remove this item?</Text>
      <View style={styles.removeConfirmActions}>
        <Pressable
          style={({ pressed }) => [styles.removeCancel, pressed && styles.pressed]}
          onPress={() => setConfirming(false)}
          disabled={isRemoving}
          accessibilityRole="button"
          accessibilityLabel="Keep recipe item"
        >
          <Text style={styles.removeCancelText}>Keep</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.removeButton, pressed && !isRemoving && styles.pressed]}
          onPress={onRemove}
          disabled={isRemoving}
          accessibilityRole="button"
          accessibilityLabel="Remove recipe item permanently"
          accessibilityState={{ disabled: isRemoving, busy: isRemoving }}
        >
          {isRemoving ? <ActivityIndicator size="small" color={Colors.onError} /> : null}
          <Text style={styles.removeButtonText}>{isRemoving ? 'Removing' : 'Remove'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FirstCaptureIntro() {
  return (
    <View style={styles.firstCaptureIntro} accessibilityLiveRegion="polite">
      <View style={styles.firstCaptureIcon}>
        <BookOpen size={18} color={Colors.text} />
      </View>
      <View style={styles.firstCaptureCopy}>
        <Text style={styles.firstCaptureTitle}>Start with a recipe you already love.</Text>
      </View>
    </View>
  );
}

function StateCard({
  icon,
  iconTone = 'neutral',
  title,
  copy,
  action,
}: {
  icon: React.ReactNode;
  iconTone?: 'neutral' | 'success' | 'error';
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.stateCard} accessibilityLiveRegion="polite">
      <View style={[
        styles.icon,
        iconTone === 'success' && styles.successIcon,
        iconTone === 'error' && styles.errorIcon,
      ]}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {copy ? <Text style={styles.copy}>{copy}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

function CookbookChoice({
  cookbook,
  disabled,
  onPress,
}: {
  cookbook: Cookbook;
  disabled: boolean;
  onPress: () => void;
}) {
  const style = getCookbookStyle(cookbook.coverStyle);
  return (
    <Pressable
      style={({ pressed }) => [styles.bookChoice, pressed && !disabled && styles.bookChoicePressed]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add recipe to ${cookbook.title}`}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.bookSwatch, { backgroundColor: style.palette.spine }]} />
      <View style={styles.bookCopy}>
        <Text style={styles.bookTitle} numberOfLines={1}>{cookbook.title}</Text>
        <Text style={styles.bookStyle} numberOfLines={1}>{style.name}</Text>
      </View>
      <Text style={styles.choose}>Choose</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  workspace: { gap: Spacing.lg },
  workspaceDestination: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    zIndex: 2,
  },
  workspaceDestinationLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  workspaceDestinationTrigger: {
    minWidth: 0,
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  workspaceDestinationSwatch: {
    width: 20,
    height: 28,
    flexShrink: 0,
    borderRadius: Radii.numeric[3],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  workspaceDestinationTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
  },
  workspaceDestinationChevronExpanded: { transform: [{ rotate: '180deg' }] },
  workspaceDestinationOptions: {
    position: 'absolute',
    top: 50,
    left: 60,
    right: 0,
    gap: Spacing.values[2],
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    padding: Spacing.xs,
    boxShadow: Colors.book.cardShadow,
  },
  workspaceDestinationOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
  },
  workspaceDestinationOptionSelected: { backgroundColor: Colors.book.accentSoft },
  workspaceDestinationOptionText: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  pageWorkspaceSection: { gap: Spacing.sm },
  pageWorkspaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pageWorkspaceTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.xxlSm,
    lineHeight: Typography.metrics.lineHeight28,
  },
  pageWorkspaceCount: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  pageWorkspaceHint: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
  },
  firstCaptureIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.parchment,
  },
  firstCaptureIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
  },
  firstCaptureCopy: { flex: 1, gap: Spacing.values[3] },
  firstCaptureEyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight13,
    letterSpacing: Typography.metrics.letterSpacing11,
  },
  firstCaptureTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lgMd,
    lineHeight: Typography.metrics.lineHeight22,
  },
  firstCaptureBody: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  center: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingCopy: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  detailActions: { gap: Spacing.sm },
  recoverySheetTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lgMd,
  },
  recoverySheetContent: { paddingBottom: Spacing.sm },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    boxShadow: Colors.book.cardShadow,
  },
  destinationCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    boxShadow: Colors.book.cardShadow,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: Radii.numeric[23],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
  },
  successIcon: { backgroundColor: Colors.success },
  errorIcon: { backgroundColor: Colors.errorLight },
  eyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.metrics.letterSpacing04,
    textAlign: 'center',
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlMd,
    lineHeight: Typography.metrics.lineHeight29,
    textAlign: 'center',
  },
  copy: {
    maxWidth: 440,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
  },
  action: { width: '100%', marginTop: Spacing.sm },
  removeConfirm: {
    width: '100%',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
  },
  removeConfirmText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
  removeConfirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  removeCancel: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.lg,
  },
  removeCancelText: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md },
  removeButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
  },
  removeButtonText: { color: Colors.onError, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md },
  reassurance: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  reassuranceText: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  errorText: {
    width: '100%',
    color: Colors.error,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorLight,
    padding: Spacing.sm,
  },
  bookList: { width: '100%', gap: Spacing.sm, marginTop: Spacing.sm },
  bookChoice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    paddingHorizontal: Spacing.md,
    transform: [{ scale: 1 }],
  },
  bookChoicePressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  bookSwatch: { width: 28, height: 42, borderRadius: Radii.numeric[4] },
  bookCopy: { flex: 1 },
  bookTitle: { color: Colors.text, fontFamily: Fonts.display.semibold, fontSize: Typography.sizes.md, },
  bookStyle: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, marginTop: Spacing.values[2] },
  choose: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
});
