import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Check, Copy, RotateCcw, Sparkles } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import type {
  RecipeActionCommitMode,
  RecipeActionProposal,
} from '@/utils/cookbook/recipeActions';
import { Fonts } from '@/utils/fonts';

export function RecipeActionPreviewCard({
  proposal,
  onCommit,
  onResult,
}: {
  proposal: RecipeActionProposal;
  onCommit: (
    proposal: RecipeActionProposal,
    mode: RecipeActionCommitMode,
  ) => Promise<{ pageId?: string }>;
  onResult: (result: Record<string, unknown>) => void;
}) {
  const [saving, setSaving] = useState<RecipeActionCommitMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function commit(mode: RecipeActionCommitMode) {
    setSaving(mode);
    setError(null);
    try {
      const result = await onCommit(proposal, mode);
      onResult({
        accepted: true,
        mode,
        servings: proposal.proposed.servings,
        ...result,
      });
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : 'Could not apply this change');
      setSaving(null);
    }
  }

  return (
    <View style={styles.card} accessibilityLabel={`Recipe change preview. ${proposal.summary}`}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Sparkles size={17} color={Colors.onPrimary} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>Preview only</Text>
          <Text style={styles.title}>{proposal.title}</Text>
          <Text style={styles.summary}>{proposal.summary}</Text>
        </View>
      </View>

      <View style={styles.changes}>
        {proposal.changes.map((change) => (
          <View key={change} style={styles.changeRow}>
            <Check size={14} color={Colors.primary} />
            <Text style={styles.changeText}>{change}</Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.primaryButton}
        disabled={saving !== null}
        accessibilityRole="button"
        accessibilityLabel="Use this recipe change for this cooking session"
        onPress={() => void commit('session')}
      >
        {saving === 'session' ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
        <Text style={styles.primaryText}>Use for this session</Text>
      </Pressable>

      <View style={styles.secondaryRow}>
        <Pressable
          style={styles.secondaryButton}
          disabled={saving !== null}
          accessibilityRole="button"
          accessibilityLabel="Save this change to the current recipe"
          onPress={() => void commit('update')}
        >
          <Check size={15} color={Colors.primary} />
          <Text style={styles.secondaryText}>Save update · 1 credit</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          disabled={saving !== null}
          accessibilityRole="button"
          accessibilityLabel="Save this change as a new recipe version"
          onPress={() => void commit('new-version')}
        >
          <Copy size={15} color={Colors.primary} />
          <Text style={styles.secondaryText}>Save as copy · 1 credit</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.cancelButton}
        disabled={saving !== null}
        accessibilityRole="button"
        accessibilityLabel="Cancel this recipe change"
        onPress={() => onResult({ accepted: false, mode: 'cancelled' })}
      >
        <RotateCcw size={14} color={Colors.textMuted} />
        <Text style={styles.cancelText}>Cancel</Text>
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
  heading: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
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
  summary: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 13 },
  changes: { gap: Spacing.xs },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  changeText: { flex: 1, color: Colors.text, fontFamily: Fonts.ui.regular, fontSize: 13 },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: 12 },
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
  secondaryRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.background,
  },
  secondaryText: { color: Colors.primary, fontFamily: Fonts.ui.semibold, fontSize: 12 },
  cancelButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cancelText: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 13 },
});
