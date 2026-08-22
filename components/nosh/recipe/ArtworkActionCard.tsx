import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { ImageIcon, RotateCcw } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
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
        <Text style={styles.eyebrow}>New page ready</Text>
        {candidate.imageUrl ? (
          <Image
            source={{ uri: candidate.imageUrl }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="New recipe page candidate"
          />
        ) : null}
        <Text style={styles.copy}>Your current page is still in place.</Text>
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
          <Text style={styles.eyebrow}>{hasCurrentArtwork ? 'Page edit' : 'New page'}</Text>
          <Text style={styles.title}>{hasCurrentArtwork ? 'Create a replacement?' : 'Create this page?'}</Text>
        </View>
      </View>
      {instruction ? <Text style={styles.copy}>{instruction}</Text> : null}
      <Text style={styles.cost}>Cost: 1 generation credit</Text>
      <Text style={styles.copy}>
        {hasCurrentArtwork
          ? 'The current page stays selected while Nosh makes a candidate.'
          : 'Nosh will show the complete page before using it.'}
      </Text>
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Pressable
        style={styles.primaryButton}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel="Generate recipe page for one credit"
        accessibilityState={{ disabled: busy !== null, busy: busy === 'generate' }}
        onPress={() => void generate()}
      >
        {busy === 'generate' ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
        <Text style={styles.primaryText}>{busy === 'generate' ? 'Creating page' : 'Generate for 1 credit'}</Text>
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
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  headingCopy: { flex: 1, gap: 2 },
  eyebrow: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 18 },
  copy: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 13, lineHeight: 18 },
  cost: { color: Colors.text, fontFamily: Fonts.ui.semibold, fontSize: 13 },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: 12 },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radii.md, backgroundColor: Colors.background },
  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
  },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.semibold, fontSize: 14 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.textMuted, fontFamily: Fonts.ui.semibold, fontSize: 13 },
});
