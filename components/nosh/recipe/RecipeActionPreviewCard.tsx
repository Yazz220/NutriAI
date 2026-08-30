import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Check, Copy, Sparkles } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
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
        <Sparkles size={18} color={Colors.primary} />
        <View style={styles.headingCopy}>
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
        style={({ pressed }) => [styles.primaryButton, saving !== null && styles.disabled, pressed && styles.pressed]}
        disabled={saving !== null}
        accessibilityRole="button"
        accessibilityLabel="Use this recipe change for this cooking session"
        accessibilityState={{ disabled: saving !== null, busy: saving === 'session' }}
        onPress={() => void commit('session')}
      >
        {saving === 'session' ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
        <Text style={styles.primaryText}>Use for this session</Text>
      </Pressable>

      <View style={styles.secondaryActions}>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, saving !== null && styles.disabled, pressed && styles.pressed]}
          disabled={saving !== null}
          accessibilityRole="button"
          accessibilityLabel="Save this change to the current recipe"
          accessibilityState={{ disabled: saving !== null, busy: saving === 'update' }}
          onPress={() => void commit('update')}
        >
          <Check size={15} color={Colors.primary} />
          <Text style={styles.secondaryText}>Save update</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, saving !== null && styles.disabled, pressed && styles.pressed]}
          disabled={saving !== null}
          accessibilityRole="button"
          accessibilityLabel="Save this change as a new recipe version"
          accessibilityState={{ disabled: saving !== null, busy: saving === 'new-version' }}
          onPress={() => void commit('new-version')}
        >
          <Copy size={15} color={Colors.primary} />
          <Text style={styles.secondaryText}>Save as copy</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.cancelButton, saving !== null && styles.disabled, pressed && styles.pressed]}
        disabled={saving !== null}
        accessibilityRole="button"
        accessibilityLabel="Cancel this recipe change"
        accessibilityState={{ disabled: saving !== null }}
        onPress={() => onResult({ accepted: false, mode: 'cancelled' })}
      >
        <Text style={styles.cancelText}>Not now</Text>
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
  heading: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  headingCopy: { flex: 1, gap: Spacing.values[2] },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.lgMd },
  summary: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20 },
  changes: { gap: Spacing.xs },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  changeText: { flex: 1, color: Colors.text, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
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
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  secondaryButton: {
    flexGrow: 1,
    minWidth: 132,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[5],
    borderRadius: Radii.full,
    backgroundColor: Colors.alpha.primary[5],
  },
  secondaryText: { color: Colors.primary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
  cancelButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.7 },
});
