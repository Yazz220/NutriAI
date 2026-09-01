import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { type AnimatedRef } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react-native';
import {
  UnifiedIntakeComposer,
  type UnifiedIntakePayload,
} from '@/components/cookbook/UnifiedIntakeComposer';
import { CookbookPageGrid } from '@/components/cookbook/CookbookPageGrid';
import { RecipeCorrectionSheet } from '@/components/nosh/capture/RecipeCorrectionSheet';
import { PageAllowanceStatus } from '@/components/subscription/PageAllowanceStatus';
import { useSubscriptionUi } from '@/components/subscription/SubscriptionHost';
import { Button } from '@/components/ui/Button';
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
  uploadRecipeCaptureAudio,
  uploadRecipeCaptureImage,
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
  prioritizeCaptureActivity,
  type CapturePresentationPhase,
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
  activityVisible?: boolean;
  scrollableRef?: AnimatedRef<Animated.ScrollView>;
  onActivitySummaryChange?: (summary: { pendingCount: number; attentionCount: number }) => void;
}

export interface NoshCaptureHandoffSource {
  sourceType: 'url' | 'text' | 'image' | 'video';
  input?: string;
  imageBase64?: string;
}

const INITIAL_ACTIVITY_LIMIT = 8;

export function NoshCaptureWorkspace({
  destinationCookbookId,
  captureId: initialCaptureId,
  initialSource,
  activityVisible,
  scrollableRef,
  onActivitySummaryChange,
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
  const [audioAttachment, setAudioAttachment] = useState<RecipeCaptureAudioAsset | null>(null);
  const [videoAttachment, setVideoAttachment] = useState<RecipeCaptureVideoAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [activityLimit, setActivityLimit] = useState(INITIAL_ACTIVITY_LIMIT);
  const [selectedDestinationCookbookId, setSelectedDestinationCookbookId] = useState(
    destinationCookbookId,
  );
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(
    defaultFirstRunOnboardingState,
  );
  const [firstRunReady, setFirstRunReady] = useState(false);
  const handoffStartedRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const previousActivityVisibleRef = useRef(activityVisible);
  const availableCookbooks = useMemo(
    () => cookbooks.filter((cookbook) => cookbook.userId === user?.id),
    [cookbooks, user?.id],
  );
  const cookbookTitles = useMemo(
    () => new Map(availableCookbooks.map((cookbook) => [cookbook.id, cookbook.title])),
    [availableCookbooks],
  );
  const activity = useMemo(
    () => prioritizeCaptureActivity(captureState.captures.filter((candidate) => candidate.status !== 'ready')),
    [captureState.captures],
  );
  const exceptionActivity = useMemo(
    () => activity.filter((candidate) =>
      candidate.status === 'needs_attention' || candidate.status === 'needs_destination'
    ),
    [activity],
  );
  const capture = captureState.captures.find((candidate) => candidate.id === captureId);
  const pageAccessReason = initialSource ? 'agent_capture' : 'page_capture';
  const activeDestinationCookbookId = capture?.destinationCookbookId
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
    if (capture?.destinationCookbookId) {
      if (selectedDestinationCookbookId !== capture.destinationCookbookId) {
        setSelectedDestinationCookbookId(capture.destinationCookbookId);
      }
      return;
    }
    if (!selectedDestinationCookbookId && availableCookbooks[0]) {
      setSelectedDestinationCookbookId(availableCookbooks[0].id);
    }
  }, [availableCookbooks, capture?.destinationCookbookId, destinationCookbookId, selectedDestinationCookbookId]);

  useEffect(() => {
    if (!onActivitySummaryChange) return;
    onActivitySummaryChange({
      pendingCount: activity.length,
      attentionCount: exceptionActivity.length,
    });
  }, [activity.length, exceptionActivity.length, onActivitySummaryChange]);

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

  useEffect(() => {
    const previous = previousActivityVisibleRef.current;
    previousActivityVisibleRef.current = activityVisible;
    if (activityVisible === undefined || previous === activityVisible) return;
    setCaptureId(undefined);
    setError(null);
    setActivityLimit(INITIAL_ACTIVITY_LIMIT);
  }, [activityVisible]);

  const submit = useCallback(async (payload: UnifiedIntakePayload) => {
    if (!user || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      if (!await requestPageAccess(pageAccessReason)) {
        setInput(payload.input ?? '');
        if (payload.type === 'image') {
          setImageBase64(payload.imageBase64 ?? null);
          setImageUri(payload.imageUri ?? null);
          setImageMimeType(payload.mimeType ?? null);
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
        const upload = await uploadRecipeCaptureImage({
          userId: user.id,
          imageUri: payload.imageUri,
          imageBase64: payload.imageBase64,
          mimeType: payload.mimeType,
          requestKey,
        });
        source = { type: 'image', ...upload, notes: payload.input };
      } else if (payload.type === 'audio') {
        const upload = await uploadRecipeCaptureAudio({
          userId: user.id,
          audio: payload.audio,
          requestKey,
        });
        source = { type: 'audio', ...upload, notes: payload.input };
      } else if (payload.type === 'video' && 'video' in payload) {
        const upload = await uploadRecipeCaptureVideo({
          userId: user.id,
          video: payload.video,
          requestKey,
        });
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
      setAudioAttachment(null);
      setVideoAttachment(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Folio could not save this recipe.');
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [activeDestinationCookbookId, captureState, pageAccessReason, refreshSubscription, requestConsent, requestPageAccess, user]);

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
    setError(null);
    setActivityLimit(INITIAL_ACTIVITY_LIMIT);
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

  if (capture?.status === 'needs_destination' || capture?.status === 'needs_attention') {
    return (
      <>
        <CaptureDetail
          capture={capture}
          destination={destination}
          availableCookbooks={availableCookbooks}
          error={error}
          isPreparingDestination={captureState.isPreparingDestination}
          isRetrying={captureState.isRetrying}
          isCorrecting={captureState.isCorrecting}
          backLabel={activityVisible ? 'Recipe activity' : 'Save another recipe'}
          onBack={showComposer}
          onReplaceSource={showComposer}
          onCorrect={() => { setError(null); setCorrectionVisible(true); }}
          onChooseDestination={chooseDestination}
          onRetry={() => { void retryCapture(); }}
          onResolvePageLimit={() => { void continueAfterPageLimit(); }}
          onCreateCookbook={() => router.push(`/(book)/library?captureId=${encodeURIComponent(capture.id)}`)}
        />
        <RecipeCorrectionSheet
          visible={correctionVisible}
          recipeGraph={capture.recipeGraph ?? null}
          saving={captureState.isCorrecting}
          error={error}
          onClose={() => { setCorrectionVisible(false); setError(null); }}
          onSubmit={correctCapture}
        />
      </>
    );
  }

  if (initialCaptureId && captureState.isLoading) {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingCopy}>Opening recipe activity…</Text>
      </View>
    );
  }

  if (activityVisible) {
    return (
      <CaptureActivitySection
        captures={activity.slice(0, activityLimit)}
        totalCount={activity.length}
        cookbookTitles={cookbookTitles}
        isLoading={captureState.isLoading}
        isStale={captureState.isStale}
        hasError={Boolean(captureState.error)}
        showEmptyState
        onOpen={setCaptureId}
        onRefresh={() => { void captureState.refresh(); }}
        onShowMore={() => setActivityLimit((current) => current + INITIAL_ACTIVITY_LIMIT)}
      />
    );
  }

  return (
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
        audioAttachment={audioAttachment}
        videoAttachment={videoAttachment}
        error={error}
        onInputChange={(value) => { setInput(value); setError(null); }}
        onImageBase64Change={setImageBase64}
        onImageUriChange={(uri, mimeType) => {
          setImageUri(uri);
          setImageMimeType(mimeType);
        }}
        onAudioAttachmentChange={setAudioAttachment}
        onVideoAttachmentChange={setVideoAttachment}
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
            onMovePage={pageOrder.isReordering ? undefined : pageOrder.movePage}
            scrollableRef={scrollableRef}
            emptyTitle="Your first page will appear here."
            emptyDetail=""
            showPattern={false}
            testID="capture-cookbook-page-grid"
          />
        </View>
      ) : null}

      {activityVisible === undefined && exceptionActivity.length > 0 ? (
        <CaptureActivitySection
          captures={exceptionActivity.slice(0, activityLimit)}
          totalCount={exceptionActivity.length}
          cookbookTitles={cookbookTitles}
          isLoading={captureState.isLoading}
          isStale={captureState.isStale}
          hasError={Boolean(captureState.error)}
          onOpen={setCaptureId}
          onRefresh={() => { void captureState.refresh(); }}
          onShowMore={() => setActivityLimit((current) => current + INITIAL_ACTIVITY_LIMIT)}
        />
      ) : null}
    </View>
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
  backLabel,
  onBack,
  onReplaceSource,
  onCorrect,
  onChooseDestination,
  onRetry,
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
  backLabel: string;
  onBack: () => void;
  onReplaceSource: () => void;
  onCorrect: () => void;
  onChooseDestination: (cookbookId: string) => Promise<void>;
  onRetry: () => void;
  onResolvePageLimit: () => void;
  onCreateCookbook: () => void;
}) {
  const presentation = getCapturePresentation(capture, destination?.title);

  if (capture.status === 'needs_destination') {
    return (
      <View style={styles.detailStack}>
        <DetailBackButton onPress={onBack} label={backLabel} />
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
                disabled={isPreparingDestination}
                onPress={() => void onChooseDestination(cookbook.id)}
              />
            ))}
          </View>
          {availableCookbooks.length === 0 ? (
            <Button title="Create a cookbook" onPress={onCreateCookbook} fullWidth />
          ) : null}
        </View>
      </View>
    );
  }

  if (capture.status === 'needs_attention') {
    if (capture.failureCode === 'designed_page_limit_reached') {
      return (
        <View style={styles.detailStack}>
          <DetailBackButton onPress={onBack} label={backLabel} />
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
                  fullWidth
                />
              </View>
            )}
          />
        </View>
      );
    }

    const shouldReplaceSource = presentation.action === 'replace_source';
    const shouldCorrectRecipe = presentation.action === 'correct_recipe';
    const sourceUrl = typeof capture.sourcePayload.input === 'string'
      ? capture.sourcePayload.input
      : null;
    const sourceClassification = sourceUrl ? classifyVideoSourceUrl(sourceUrl) : null;
    const canOpenOriginal = capture.failureCode === 'video_source_unsupported'
      && sourceClassification?.kind === 'platform_link';
    return (
      <View style={styles.detailStack}>
        <DetailBackButton onPress={onBack} label={backLabel} />
        <StateCard
          icon={<AlertTriangle size={21} color={Colors.error} />}
          iconTone="error"
          title={shouldReplaceSource || shouldCorrectRecipe ? presentation.title : 'This recipe needs another try'}
          copy={presentation.detail}
          action={(
            <View style={styles.detailActions}>
              <Button
                title={presentation.actionLabel ?? 'Try again'}
                onPress={shouldReplaceSource ? onReplaceSource : shouldCorrectRecipe ? onCorrect : onRetry}
                loading={shouldCorrectRecipe ? isCorrecting : !shouldReplaceSource && isRetrying}
                fullWidth
              />
              {canOpenOriginal && sourceUrl ? (
                <Button
                  title="Open original"
                  variant="outline"
                  onPress={() => { void Linking.openURL(sourceUrl); }}
                  fullWidth
                />
              ) : null}
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.detailStack}>
      <DetailBackButton onPress={onBack} label={backLabel} />
      <StateCard
        icon={<AlertTriangle size={21} color={Colors.error} />}
        iconTone="error"
        title="This page needs another try"
        copy="Folio saved the recipe but did not publish a finished page. Try it again from here."
        action={<Button title="Try again" onPress={onRetry} loading={isRetrying} fullWidth />}
      />
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

function CaptureActivitySection({
  captures,
  totalCount,
  cookbookTitles,
  isLoading,
  isStale,
  hasError,
  showEmptyState = false,
  onOpen,
  onRefresh,
  onShowMore,
}: {
  captures: RecipeCapture[];
  totalCount: number;
  cookbookTitles: Map<string, string>;
  isLoading: boolean;
  isStale: boolean;
  hasError: boolean;
  showEmptyState?: boolean;
  onOpen: (captureId: string) => void;
  onRefresh: () => void;
  onShowMore: () => void;
}) {
  if (isLoading && captures.length === 0) {
    return (
      <View style={styles.activityLoading} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.activityHint}>Checking recipe activity…</Text>
      </View>
    );
  }

  if (hasError && captures.length === 0) {
    return (
      <View style={styles.activityEmpty}>
        <Text style={styles.activityTitle}>Recipe activity is unavailable</Text>
        <Button title="Refresh" variant="ghost" onPress={onRefresh} />
      </View>
    );
  }

  if (captures.length === 0) {
    if (!showEmptyState) return null;
    return (
      <View style={styles.activityEmpty}>
        <View style={styles.activityEmptyIcon}>
          <History size={20} color={Colors.textMuted} />
        </View>
        <Text style={styles.activityTitle}>No recipe activity yet</Text>
      </View>
    );
  }

  const activeCaptures = captures.filter((capture) => capture.status !== 'ready');
  const recentCaptures = captures.filter((capture) => capture.status === 'ready');

  return (
    <View style={styles.activitySection}>
      <View style={styles.activityHeader}>
        <Text style={styles.activityCount}>{totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}</Text>
        {isStale ? <Text style={styles.syncing}>Reconnecting…</Text> : null}
      </View>

      {activeCaptures.length > 0 ? (
        <ActivityGroup
          title="Active"
          captures={activeCaptures}
          cookbookTitles={cookbookTitles}
          onOpen={onOpen}
        />
      ) : null}

      {recentCaptures.length > 0 ? (
        <ActivityGroup
          title="Recent"
          captures={recentCaptures}
          cookbookTitles={cookbookTitles}
          onOpen={onOpen}
        />
      ) : null}

      {totalCount > captures.length ? (
        <Pressable
          style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
          onPress={onShowMore}
          accessibilityRole="button"
          accessibilityLabel="Show older recipe activity"
        >
          <Text style={styles.showMoreText}>Show older recipes</Text>
          <ChevronDown size={16} color={Colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ActivityGroup({
  title,
  captures,
  cookbookTitles,
  onOpen,
}: {
  title: string;
  captures: RecipeCapture[];
  cookbookTitles: Map<string, string>;
  onOpen: (captureId: string) => void;
}) {
  return (
    <View style={styles.activityGroup}>
      <Text style={styles.activityGroupTitle}>{title}</Text>
      <View style={styles.activityList}>
        {captures.map((capture) => (
          <CaptureActivityRow
            key={capture.id}
            capture={capture}
            cookbookTitle={capture.destinationCookbookId
              ? cookbookTitles.get(capture.destinationCookbookId)
              : undefined}
            onPress={() => onOpen(capture.id)}
          />
        ))}
      </View>
    </View>
  );
}

function CaptureActivityRow({
  capture,
  cookbookTitle,
  onPress,
}: {
  capture: RecipeCapture;
  cookbookTitle?: string;
  onPress: () => void;
}) {
  const presentation = getCapturePresentation(capture, cookbookTitle);
  const title = capture.recipeGraph?.title ?? presentation.title;
  const sourceLabel = capture.sourceType === 'image'
    ? 'Photo'
    : capture.sourceType === 'video'
      ? 'Video'
      : capture.sourceType === 'audio'
        ? 'Audio'
      : capture.sourceType === 'url'
        ? 'Link'
        : 'Text';
  const meta = [cookbookTitle ?? sourceLabel, formatCaptureDate(capture.updatedAt)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${presentation.label}: ${title}`}
    >
      <CaptureStatusIcon phase={presentation.phase} />
      <View style={styles.activityRowCopy}>
        <View style={styles.activityRowHeading}>
          <Text style={styles.activityRowTitle} numberOfLines={1}>{title}</Text>
          <View style={[
            styles.activityStatus,
            presentation.phase === 'ready' && styles.activityStatusReady,
            presentation.phase === 'attention' && styles.activityStatusAttention,
          ]}>
            <Text style={[
              styles.activityRowLabel,
              presentation.phase === 'ready' && styles.activityRowLabelReady,
              presentation.phase === 'attention' && styles.activityRowLabelError,
            ]}>{presentation.label}</Text>
          </View>
        </View>
        <Text style={styles.activityRowDetail} numberOfLines={1}>{meta}</Text>
      </View>
      <ChevronRight size={17} color={Colors.textMuted} />
    </Pressable>
  );
}

function formatCaptureDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000);
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CaptureStatusIcon({ phase }: { phase: CapturePresentationPhase }) {
  if (phase === 'reading' || phase === 'preparing' || phase === 'designing') {
    return <View style={styles.activityIcon}><ActivityIndicator size="small" color={Colors.primary} /></View>;
  }
  if (phase === 'ready') {
    return <View style={[styles.activityIcon, styles.activityIconReady]}><Check size={16} color={Colors.onSuccess} /></View>;
  }
  if (phase === 'attention') {
    return <View style={[styles.activityIcon, styles.activityIconError]}><AlertTriangle size={16} color={Colors.error} /></View>;
  }
  return <View style={styles.activityIcon}><BookOpen size={16} color={Colors.text} /></View>;
}

function DetailBackButton({ onPress, label = 'All recipe activity' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.detailBack, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <ChevronLeft size={17} color={Colors.text} />
      <Text style={styles.detailBackText}>{label}</Text>
    </Pressable>
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
  detailStack: { gap: Spacing.sm },
  detailActions: { gap: Spacing.sm },
  detailBack: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
  },
  detailBackText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  stateCard: {
    minHeight: 248,
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
  activitySection: {
    gap: Spacing.lg,
  },
  activityHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  activityTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.lgMd, lineHeight: Typography.metrics.lineHeight22 },
  activityCount: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md },
  activityHint: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight16 },
  syncing: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  activityLoading: {
    minHeight: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  activityEmpty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  activityEmptyIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityGroup: { gap: Spacing.sm },
  activityGroupTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lg,
  },
  activityList: { gap: Spacing.sm },
  activityRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    boxShadow: Colors.book.cardShadow,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
  },
  activityIconReady: { backgroundColor: Colors.success },
  activityIconError: { backgroundColor: Colors.errorLight },
  activityRowCopy: { flex: 1, minWidth: 0, gap: Spacing.values[4] },
  activityRowHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  activityRowTitle: { flex: 1, color: Colors.text, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  activityRowDetail: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm },
  activityStatus: {
    minHeight: 24,
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.book.accentSoft,
    paddingHorizontal: Spacing.sm,
  },
  activityStatusReady: { backgroundColor: Colors.successLight },
  activityStatusAttention: { backgroundColor: Colors.errorLight },
  activityRowLabel: { color: Colors.primary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.sm },
  activityRowLabelReady: { color: Colors.success },
  activityRowLabelError: { color: Colors.error },
  showMore: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  showMoreText: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
});
