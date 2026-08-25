import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { ImageIcon, RotateCcw } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { GeneratedRecipePage } from '@/types/cookbook';
import { Fonts } from '@/utils/fonts';
import { createGenerationRequestKey } from '@/utils/cookbook/generationAttempt';

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
  const [candidate, setCandidate] = useState<GeneratedRecipePage | null>(null);
  const requestKeyRef = useRef(createGenerationRequestKey());
  const [busy, setBusy] = useState<'generate' | 'select' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy('generate');
    setError(null);
    try {
      setCandidate(await onGenerate(instruction, requestKeyRef.current));
    } catch (generationError) {
      // A failed request keeps its idempotency record so clients can inspect
      // the failure. A human retry is a new attempt and needs a fresh key.
      requestKeyRef.current = createGenerationRequestKey();
      setError(generationError instanceof Error ? generationError.message : 'Could not generate the page');
    } finally {
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
          style={styles.primaryButton}
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
          style={styles.secondaryButton}
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
        <View style={styles.icon}>
          {hasCurrentArtwork
            ? <RotateCcw size={17} color={Colors.onPrimary} />
            : <ImageIcon size={17} color={Colors.onPrimary} />}
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{hasCurrentArtwork ? 'Create a replacement?' : 'Create this page?'}</Text>
        </View>
      </View>
      {instruction ? <Text style={styles.copy}>{instruction}</Text> : null}
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      {busy === 'generate' ? (
        <View
          style={styles.generatingPreview}
          accessibilityRole="progressbar"
          accessibilityLabel="Creating recipe page"
        >
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : null}
      <Pressable
        style={styles.primaryButton}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel="Generate recipe page"
        accessibilityState={{ disabled: busy !== null, busy: busy === 'generate' }}
        onPress={() => void generate()}
      >
        <Text style={styles.primaryText}>{busy === 'generate' ? 'Creating page' : 'Generate page'}</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
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
    gap: Spacing.md,
    padding: Spacing.md,
    marginVertical: Spacing.values[4],
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: {
    width: 34,
    height: 34,
    borderRadius: Radii.numeric[17],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  headingCopy: { flex: 1, gap: Spacing.values[2] },
  eyebrow: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.metrics.letterSpacing07,
    textTransform: 'uppercase',
  },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.md, },
  copy: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight18 },
  cost: { color: Colors.text, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radii.md, backgroundColor: Colors.background },
  generatingPreview: { width: '100%', aspectRatio: 3 / 4, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, backgroundColor: Colors.background },
  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
  },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.textMuted, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
});
