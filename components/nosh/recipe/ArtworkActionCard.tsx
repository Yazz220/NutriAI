import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { ImageIcon, RotateCcw } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { COOKBOOK_GEOMETRY } from '@/constants/cookbookGeometry';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { GeneratedRecipePage } from '@/types/cookbook';
import { Fonts } from '@/utils/fonts';
import { createGenerationRequestKey } from '@/utils/cookbook/generationAttempt';
import { NoshActivityDots } from '@/components/nosh/conversation/NoshActivityDots';
import { PageCreationDisclosure } from '@/components/subscription/PageCreationDisclosure';
import { useSubscriptionUi } from '@/components/subscription/SubscriptionHost';
import { isDesignedPageLimitReachedError } from '@/components/subscription/subscriptionErrors';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';

export function ArtworkActionCard({
  instruction,
  hasCurrentArtwork,
  onGenerate,
  onSelect,
  onResult,
}: {
  instruction?: string;
  hasCurrentArtwork: boolean;
  onGenerate: (instruction: string | undefined, idempotencyKey: string) => Promise<GeneratedRecipePage>;
  onSelect: (candidate: GeneratedRecipePage) => Promise<void>;
  onResult: (result: Record<string, unknown>) => void;
}) {
  const { requestPageAccess } = useSubscriptionUi();
  const { refresh: refreshSubscription } = useNoshSubscription();
  const [candidate, setCandidate] = useState<GeneratedRecipePage | null>(null);
  const requestKeyRef = useRef(createGenerationRequestKey());
  const [busy, setBusy] = useState<'generate' | 'select' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!await requestPageAccess('agent_artwork')) return;
    setBusy('generate');
    setError(null);
    try {
      try {
        setCandidate(await onGenerate(instruction, requestKeyRef.current));
      } catch (generationError) {
        // Failed requests keep their idempotency record. Any retry, automatic
        // or human, must start a fresh generation attempt.
        requestKeyRef.current = createGenerationRequestKey();
        if (!isDesignedPageLimitReachedError(generationError)) {
          setError(generationError instanceof Error ? generationError.message : 'Could not generate the page');
          return;
        }

        const canRetry = await requestPageAccess('agent_artwork', { refresh: true });
        if (!canRetry) return;

        try {
          setCandidate(await onGenerate(instruction, requestKeyRef.current));
        } catch (retryError) {
          requestKeyRef.current = createGenerationRequestKey();
          setError(isDesignedPageLimitReachedError(retryError)
            ? 'Page creation is still unavailable. Your design direction is still here.'
            : retryError instanceof Error ? retryError.message : 'Could not generate the page');
        }
      }
    } finally {
      void refreshSubscription();
      setBusy(null);
    }
  }

  async function select() {
    if (!candidate) return;
    setBusy('select');
    setError(null);
    try {
      await onSelect(candidate);
      onResult({ accepted: true, versionId: candidate.id });
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Could not select this page');
      setBusy(null);
    }
  }

  if (candidate) {
    return (
      <View style={styles.card}>
        {candidate.imageUrl ? (
          <Image
            source={{ uri: candidate.imageUrl }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="New recipe page candidate"
          />
        ) : null}
        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, busy !== null && styles.disabled, pressed && styles.pressed]}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Use new recipe page"
          accessibilityState={{ disabled: busy !== null, busy: busy === 'select' }}
          onPress={() => void select()}
        >
          {busy === 'select' ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
          <Text style={styles.primaryText}>Use new page</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, busy !== null && styles.disabled, pressed && styles.pressed]}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Keep current recipe page"
          accessibilityState={{ disabled: busy !== null }}
          onPress={() => onResult({ accepted: false, keptCurrent: true, candidateVersionId: candidate.id })}
        >
          <Text style={styles.secondaryText}>Keep current page</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        {hasCurrentArtwork
          ? <RotateCcw size={18} color={Colors.primary} />
          : <ImageIcon size={18} color={Colors.primary} />}
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{hasCurrentArtwork ? 'Create a replacement?' : 'Create this page?'}</Text>
        </View>
      </View>
      {instruction ? <Text style={styles.copy}>{instruction}</Text> : null}
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      {busy === 'generate' ? (
        <View style={styles.generating} accessibilityRole="progressbar" accessibilityLabel="Creating recipe page">
          <NoshActivityDots size={5} />
          <Text style={styles.generatingText}>Creating page</Text>
        </View>
      ) : null}
      <PageCreationDisclosure>
        Creating this preview uses one page creation
      </PageCreationDisclosure>
      <Pressable
        style={({ pressed }) => [styles.primaryButton, busy !== null && styles.disabled, pressed && styles.pressed]}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel="Generate recipe page"
        accessibilityState={{ disabled: busy !== null, busy: busy === 'generate' }}
        onPress={() => void generate()}
      >
        <Text style={styles.primaryText}>{busy === 'generate' ? 'Creating page' : 'Generate page'}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.secondaryButton, busy !== null && styles.disabled, pressed && styles.pressed]}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel="Cancel page generation"
        accessibilityState={{ disabled: busy !== null }}
        onPress={() => onResult({ accepted: false })}
      >
        <Text style={styles.secondaryText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    marginVertical: Spacing.values[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headingCopy: { flex: 1, gap: Spacing.values[2] },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.lgMd },
  copy: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20 },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  preview: { width: '100%', aspectRatio: COOKBOOK_GEOMETRY.page.aspectRatio, borderRadius: Radii.md, backgroundColor: Colors.background },
  generating: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  generatingText: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm },
  primaryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.textMuted, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.7 },
});
