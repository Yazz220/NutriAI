import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from 'lucide-react-native';
import {
  UnifiedIntakeComposer,
  type UnifiedIntakePayload,
} from '@/components/cookbook/UnifiedIntakeComposer';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import { Radii, Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import type { Cookbook } from '@/types/cookbook';
import { uploadRecipeCaptureImage } from '@/utils/cookbook/api';
import {
  createCaptureRequestKey,
  isCaptureReadyToOpen,
  normalizeCaptureDestinationCookbookId,
  type RecipeCapture,
  type RecipeCaptureSource,
} from '@/utils/cookbook/captureLifecycle';
import {
  captureProgressSteps,
  getCapturePresentation,
  prioritizeCaptureActivity,
  type CapturePresentationPhase,
} from '@/utils/cookbook/capturePresentation';
import { Fonts } from '@/utils/fonts';

interface NoshCaptureWorkspaceProps {
  destinationCookbookId?: string;
  captureId?: string;
  initialSource?: NoshCaptureHandoffSource | null;
}

export interface NoshCaptureHandoffSource {
  sourceType: 'url' | 'text' | 'image' | 'video';
  input?: string;
  imageBase64?: string;
}

const INITIAL_ACTIVITY_LIMIT = 4;

export function NoshCaptureWorkspace({
  destinationCookbookId,
  captureId: initialCaptureId,
  initialSource,
}: NoshCaptureWorkspaceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { cookbooks } = useCookbooks();
  const captureState = useRecipeCaptures();
  const [captureId, setCaptureId] = useState(initialCaptureId);
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityLimit, setActivityLimit] = useState(INITIAL_ACTIVITY_LIMIT);
  const handoffStartedRef = useRef(false);
  const availableCookbooks = useMemo(
    () => cookbooks.filter((cookbook) => cookbook.userId === user?.id),
    [cookbooks, user?.id],
  );
  const cookbookTitles = useMemo(
    () => new Map(availableCookbooks.map((cookbook) => [cookbook.id, cookbook.title])),
    [availableCookbooks],
  );
  const activity = useMemo(
    () => prioritizeCaptureActivity(captureState.captures),
    [captureState.captures],
  );
  const capture = captureState.captures.find((candidate) => candidate.id === captureId);
  const destination = availableCookbooks.find(
    (cookbook) => cookbook.id === capture?.destinationCookbookId,
  );

  useEffect(() => {
    if (initialCaptureId) setCaptureId(initialCaptureId);
  }, [initialCaptureId]);

  const submit = useCallback(async (payload: UnifiedIntakePayload) => {
    if (!user) return;
    setError(null);
    try {
      const requestKey = createCaptureRequestKey();
      let source: RecipeCaptureSource;
      if (payload.type === 'image') {
        const upload = await uploadRecipeCaptureImage({
          userId: user.id,
          imageBase64: payload.imageBase64,
          requestKey,
        });
        source = { type: 'image', ...upload, notes: payload.input };
      } else {
        source = { type: payload.type, input: payload.input };
      }
      const result = await captureState.startCapture({
        source,
        destinationCookbookId: normalizeCaptureDestinationCookbookId(destinationCookbookId),
        idempotencyKey: requestKey,
      });
      setCaptureId(result.capture.id);
      setInput('');
      setImageBase64(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nosh could not save this recipe.');
    }
  }, [captureState, destinationCookbookId, user]);

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
      : { type: initialSource.sourceType, input: initialSource.input ?? '' };
    void submit(payload);
  }, [capture, initialSource, submit, user]);

  async function chooseDestination(cookbookId: string) {
    if (!capture) return;
    setError(null);
    try {
      await captureState.prepareDestination({ captureId: capture.id, destinationCookbookId: cookbookId });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start this recipe page.');
    }
  }

  function showComposer() {
    setCaptureId(undefined);
    setError(null);
    setActivityLimit(INITIAL_ACTIVITY_LIMIT);
  }

  if (capture) {
    return (
      <CaptureDetail
        capture={capture}
        destination={destination}
        availableCookbooks={availableCookbooks}
        error={error}
        isPreparingDestination={captureState.isPreparingDestination}
        isRetrying={captureState.isRetrying}
        onBack={showComposer}
        onChooseDestination={chooseDestination}
        onRetry={() => void captureState.retryCapture(capture.id)}
        onCreateCookbook={() => router.push(`/(book)/library?captureId=${encodeURIComponent(capture.id)}`)}
        onOpenRecipe={() => {
          if (capture.destinationCookbookId && capture.pageId) {
            router.replace(`/(book)/${capture.destinationCookbookId}?pageId=${capture.pageId}`);
          }
        }}
      />
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

  return (
    <View style={styles.workspace}>
      <UnifiedIntakeComposer
        isSubmitting={captureState.isStarting}
        input={input}
        imageBase64={imageBase64}
        error={error}
        onInputChange={(value) => { setInput(value); setError(null); }}
        onImageBase64Change={setImageBase64}
        onSubmit={submit}
      />

      <CaptureActivitySection
        captures={activity.slice(0, activityLimit)}
        totalCount={activity.length}
        cookbookTitles={cookbookTitles}
        isLoading={captureState.isLoading}
        isStale={captureState.isStale}
        hasError={Boolean(captureState.error)}
        onOpen={setCaptureId}
        onRefresh={() => { void captureState.refresh(); }}
        onShowMore={() => setActivityLimit((current) => current + INITIAL_ACTIVITY_LIMIT)}
      />
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
  onBack,
  onChooseDestination,
  onRetry,
  onCreateCookbook,
  onOpenRecipe,
}: {
  capture: RecipeCapture;
  destination?: Cookbook;
  availableCookbooks: Cookbook[];
  error: string | null;
  isPreparingDestination: boolean;
  isRetrying: boolean;
  onBack: () => void;
  onChooseDestination: (cookbookId: string) => Promise<void>;
  onRetry: () => void;
  onCreateCookbook: () => void;
  onOpenRecipe: () => void;
}) {
  const presentation = getCapturePresentation(capture, destination?.title);

  if (capture.status === 'processing') {
    return (
      <View style={styles.detailStack}>
        <DetailBackButton onPress={onBack} />
        <View style={styles.processingCard} accessibilityLiveRegion="polite">
          <View style={styles.workingIcon}>
            <ActivityIndicator color={Colors.primary} />
          </View>
          <Text style={styles.eyebrow}>{presentation.label}</Text>
          <Text style={styles.title}>{presentation.title}</Text>
          <Text style={styles.copy}>{presentation.detail}</Text>
          <CaptureProgress capture={capture} />
          <View style={styles.reassurance}>
            <Clock3 size={15} color={Colors.textSecondary} />
            <Text style={styles.reassuranceText}>
              Nosh is still working. You can close this sheet and come back—nothing will be lost.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (capture.status === 'needs_destination') {
    return (
      <View style={styles.detailStack}>
        <DetailBackButton onPress={onBack} />
        <View style={styles.destinationCard} accessibilityLiveRegion="polite">
          <View style={styles.icon}><BookOpen size={21} color={Colors.text} /></View>
          <Text style={styles.eyebrow}>{presentation.label}</Text>
          <Text style={styles.title}>{presentation.title}</Text>
          <Text style={styles.copy}>Pick its book. The finished page will inherit that cookbook’s visual identity.</Text>
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
    return (
      <View style={styles.detailStack}>
        <DetailBackButton onPress={onBack} />
        <StateCard
          icon={<AlertTriangle size={21} color={Colors.error} />}
          iconTone="error"
          eyebrow={presentation.label}
          title="This page needs another try"
          copy={presentation.detail}
          action={<Button title="Try again" onPress={onRetry} loading={isRetrying} fullWidth />}
        />
      </View>
    );
  }

  if (isCaptureReadyToOpen(capture)) {
    return (
      <View style={styles.detailStack}>
        <DetailBackButton onPress={onBack} label="Save another recipe" />
        <StateCard
          icon={<Check size={21} color={Colors.onSuccess} />}
          iconTone="success"
          eyebrow={presentation.detail}
          title="Your page is ready"
          copy={`${capture.recipeGraph?.title ?? 'The recipe'} is in the book and ready to read.`}
          action={<Button title="Open recipe" onPress={onOpenRecipe} fullWidth />}
        />
      </View>
    );
  }

  return (
    <View style={styles.detailStack}>
      <DetailBackButton onPress={onBack} />
      <StateCard
        icon={<AlertTriangle size={21} color={Colors.error} />}
        iconTone="error"
        title="This page needs another try"
        copy="Nosh saved the recipe but did not publish a finished page. Try it again from here."
        action={<Button title="Try again" onPress={onRetry} loading={isRetrying} fullWidth />}
      />
    </View>
  );
}

function CaptureProgress({ capture }: { capture: RecipeCapture }) {
  return (
    <View style={styles.progress} accessibilityLabel="Recipe page progress">
      {captureProgressSteps(capture).map((step, index, steps) => (
        <View key={step.label} style={styles.progressRow}>
          <View style={styles.progressRail}>
            <View style={[
              styles.progressDot,
              step.state === 'complete' && styles.progressDotComplete,
              step.state === 'active' && styles.progressDotActive,
            ]}>
              {step.state === 'complete' ? <Check size={11} color={Colors.onSuccess} /> : null}
            </View>
            {index < steps.length - 1 ? (
              <View style={[
                styles.progressLine,
                step.state === 'complete' && styles.progressLineComplete,
              ]} />
            ) : null}
          </View>
          <Text style={[
            styles.progressLabel,
            step.state === 'upcoming' && styles.progressLabelUpcoming,
          ]}>{step.label}</Text>
        </View>
      ))}
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
        <Text style={styles.activityHint}>Your recipes are still safe. Check your connection and try again.</Text>
        <Button title="Refresh" variant="ghost" onPress={onRefresh} />
      </View>
    );
  }

  if (captures.length === 0) return null;

  return (
    <View style={styles.activitySection}>
      <View style={styles.activityHeader}>
        <View style={styles.activityHeaderCopy}>
          <Text style={styles.activityTitle}>Recipe activity</Text>
          <Text style={styles.activityHint}>Follow pages that are working, need a retry, or are ready.</Text>
        </View>
        {isStale ? <Text style={styles.syncing}>Reconnecting…</Text> : null}
      </View>

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

      {totalCount > captures.length ? (
        <Pressable style={styles.showMore} onPress={onShowMore} accessibilityRole="button">
          <Text style={styles.showMoreText}>Show more activity</Text>
        </Pressable>
      ) : null}
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
  return (
    <Pressable
      style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${presentation.label}: ${title}`}
    >
      <CaptureStatusIcon phase={presentation.phase} />
      <View style={styles.activityRowCopy}>
        <Text style={styles.activityRowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.activityRowDetail} numberOfLines={1}>{presentation.detail}</Text>
      </View>
      <View style={styles.activityRowState}>
        <Text style={[
          styles.activityRowLabel,
          presentation.phase === 'attention' && styles.activityRowLabelError,
        ]}>{presentation.label}</Text>
        <ChevronRight size={15} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
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
  eyebrow,
  title,
  copy,
  action,
}: {
  icon: React.ReactNode;
  iconTone?: 'neutral' | 'success' | 'error';
  eyebrow?: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.stateCard} accessibilityLiveRegion="polite">
      <View style={[
        styles.icon,
        iconTone === 'success' && styles.successIcon,
        iconTone === 'error' && styles.errorIcon,
      ]}>{icon}</View>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
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
  center: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingCopy: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: 13 },
  detailStack: { gap: Spacing.sm },
  detailBack: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
  },
  detailBackText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 12 },
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
  },
  processingCard: {
    minHeight: 300,
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
  },
  destinationCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
  },
  workingIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
  },
  successIcon: { backgroundColor: Colors.success },
  errorIcon: { backgroundColor: Colors.errorLight },
  eyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 23,
    lineHeight: 29,
    textAlign: 'center',
  },
  copy: {
    maxWidth: 440,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 12,
    lineHeight: 18,
  },
  progress: { width: '100%', maxWidth: 360, marginTop: Spacing.sm },
  progressRow: { minHeight: 42, flexDirection: 'row', alignItems: 'flex-start' },
  progressRail: { width: 28, alignItems: 'center' },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotComplete: { borderColor: Colors.success, backgroundColor: Colors.success },
  progressDotActive: { borderColor: Colors.charcoal, borderWidth: 5 },
  progressLine: { width: 1, flex: 1, minHeight: 24, backgroundColor: Colors.ash },
  progressLineComplete: { backgroundColor: Colors.success },
  progressLabel: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: Spacing.sm,
  },
  progressLabelUpcoming: { color: Colors.textMuted, fontFamily: Fonts.ui.regular },
  errorText: {
    width: '100%',
    color: Colors.error,
    fontSize: 12,
    lineHeight: 18,
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
  bookSwatch: { width: 28, height: 42, borderRadius: 4 },
  bookCopy: { flex: 1 },
  bookTitle: { color: Colors.text, fontFamily: Fonts.display.semibold, fontSize: 15 },
  bookStyle: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 11, marginTop: 2 },
  choose: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: 12 },
  activitySection: {
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.ash,
    paddingTop: Spacing.lg,
  },
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  activityHeaderCopy: { flex: 1, gap: 2 },
  activityTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 17, lineHeight: 22 },
  activityHint: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 11, lineHeight: 16 },
  syncing: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: 10 },
  activityLoading: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.ash,
  },
  activityEmpty: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.ash,
    paddingTop: Spacing.lg,
  },
  activityList: { gap: Spacing.sm },
  activityRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
  },
  activityIconReady: { backgroundColor: Colors.success },
  activityIconError: { backgroundColor: Colors.errorLight },
  activityRowCopy: { flex: 1, minWidth: 0 },
  activityRowTitle: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 13 },
  activityRowDetail: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 10, marginTop: 2 },
  activityRowState: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  activityRowLabel: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: 10 },
  activityRowLabelError: { color: Colors.error },
  showMore: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  showMoreText: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: 11 },
});
