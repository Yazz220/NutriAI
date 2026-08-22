import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, BookOpen, Check, Clock3 } from 'lucide-react-native';
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
import {
  createCaptureRequestKey,
  type RecipeCaptureSource,
} from '@/utils/cookbook/captureLifecycle';
import { uploadRecipeCaptureImage } from '@/utils/cookbook/api';
import { Fonts } from '@/utils/fonts';

interface NoshCaptureWorkspaceProps {
  destinationCookbookId?: string;
  captureId?: string;
  initialSource?: NoshCaptureHandoffSource | null;
  onReady?: (cookbookId: string, pageId: string) => void;
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
  onReady,
}: NoshCaptureWorkspaceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { cookbooks } = useCookbooks();
  const captureState = useRecipeCaptures();
  const [captureId, setCaptureId] = useState(initialCaptureId);
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completedCaptureRef = useRef<string | null>(null);
  const handoffStartedRef = useRef(false);
  const availableCookbooks = useMemo(
    () => cookbooks.filter((cookbook) => cookbook.userId === user?.id),
    [cookbooks, user?.id],
  );
  const capture = captureState.captures.find((candidate) => candidate.id === captureId);
  const destination = availableCookbooks.find((cookbook) => cookbook.id === capture?.destinationCookbookId);

  useEffect(() => {
    if (
      !onReady
      || capture?.status !== 'ready'
      || !capture.destinationCookbookId
      || !capture.pageId
      || completedCaptureRef.current === capture.id
    ) return;
    completedCaptureRef.current = capture.id;
    onReady(capture.destinationCookbookId, capture.pageId);
  }, [capture, onReady]);

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
        destinationCookbookId,
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

  if (!capture) {
    if (initialCaptureId && captureState.isLoading) {
      return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
    }
    return (
      <UnifiedIntakeComposer
        isSubmitting={captureState.isStarting}
        input={input}
        imageBase64={imageBase64}
        error={error}
        onInputChange={(value) => { setInput(value); setError(null); }}
        onImageBase64Change={setImageBase64}
        onSubmit={submit}
      />
    );
  }

  if (capture.status === 'processing') {
    const hasRecipe = Boolean(capture.recipeGraph?.title);
    const isMakingPage = capture.pageStatus === 'generating' || Boolean(capture.pageId);
    return (
      <StateCard
        icon={<Clock3 size={21} color={Colors.text} />}
        eyebrow={isMakingPage ? destination?.title : undefined}
        title={isMakingPage ? 'Creating your cookbook page' : hasRecipe ? 'Preparing your recipe' : 'Reading your recipe'}
        copy={isMakingPage
          ? `Nosh is designing ${capture.recipeGraph?.title ?? 'this recipe'} in ${destination?.title ?? 'your cookbook'}’s visual style.`
          : 'You can leave this screen. Nosh will keep working and add the finished page automatically.'}
      />
    );
  }

  if (capture.status === 'needs_destination') {
    return (
      <View style={styles.destinationCard}>
        <View style={styles.icon}><BookOpen size={21} color={Colors.text} /></View>
        <Text style={styles.eyebrow}>Recipe ready</Text>
        <Text style={styles.title}>{capture.recipeGraph?.title ?? 'Choose a cookbook'}</Text>
        <Text style={styles.copy}>
          Pick its book. The page will automatically inherit that cookbook’s visual identity.
        </Text>
        {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.bookList}>
          {availableCookbooks.map((cookbook) => (
            <CookbookChoice
              key={cookbook.id}
              cookbook={cookbook}
              disabled={captureState.isPreparingDestination}
              onPress={() => void chooseDestination(cookbook.id)}
            />
          ))}
        </View>
        {availableCookbooks.length === 0 ? (
          <Button
            title="Create a cookbook"
            onPress={() => router.push(`/(book)/library?captureId=${encodeURIComponent(capture.id)}`)}
            fullWidth
          />
        ) : null}
      </View>
    );
  }

  if (capture.status === 'needs_attention') {
    return (
      <StateCard
        icon={<AlertTriangle size={21} color={Colors.error} />}
        iconTone="error"
        title="This page needs another try"
        copy={capture.failureMessage ?? capture.pageWarning ?? 'Nosh could not finish the recipe page.'}
        action={
          <Button
            title="Try again"
            onPress={() => void captureState.retryCapture(capture.id)}
            loading={captureState.isRetrying}
            fullWidth
          />
        }
      />
    );
  }

  return (
    <StateCard
      icon={<Check size={21} color={Colors.onSuccess} />}
      iconTone="success"
      eyebrow={destination?.title}
      title="Your page is in the book"
      copy={`${capture.recipeGraph?.title ?? 'The recipe'} is ready to read and cook from.`}
      action={
        <Button
          title="Open recipe"
          onPress={() => capture.destinationCookbookId && capture.pageId
            ? router.replace(`/(book)/${capture.destinationCookbookId}?pageId=${capture.pageId}`)
            : undefined}
          fullWidth
        />
      }
    />
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
  center: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
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
});
