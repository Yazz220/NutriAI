import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookStyleId } from '@/types/cookbook';

interface AddCookbookSheetProps {
  visible: boolean;
  styleId: CookbookStyleId | null;
  canCreate?: boolean;
  onClose: () => void;
  onConfirm: (title: string) => Promise<void> | void;
  onSignIn?: () => void;
}

export function AddCookbookSheet({
  visible,
  styleId,
  canCreate = true,
  onClose,
  onConfirm,
  onSignIn,
}: AddCookbookSheetProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setSubmitting(false);
      setError(null);
    }
  }, [visible]);

  async function handleConfirm() {
    const trimmed = title.trim();
    if (!trimmed || submitting || !styleId || !canCreate) return;
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      console.error('[AddCookbook] failed', err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const ctaDisabled = canCreate ? !title.trim() || submitting : !onSignIn;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      closeAccessibilityLabel="Close"
      header={
        <View style={styles.headerText}>
          <Text style={styles.title}>Add to collection</Text>
        </View>
      }
    >
      {styleId ? (
        <View style={styles.previewWrap}>
          <PhysicalBook title={title || 'Your cookbook'} coverStyle={styleId} width={150} />
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Desserts, Italian, Family"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
          editable={!submitting}
          maxLength={48}
        />
      </View>

      {error ? <Text style={styles.error} selectable>{error}</Text> : null}

      <Pressable
        style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
        onPress={canCreate ? handleConfirm : onSignIn}
        disabled={ctaDisabled}
        accessibilityRole="button"
        accessibilityLabel={canCreate ? 'Add cookbook to my shelf' : 'Go to sign in'}
      >
        {submitting ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text style={styles.ctaText}>{canCreate ? 'Add to my shelf' : 'Sign in to save'}</Text>
        )}
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  title: {
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight30,
    color: Colors.text,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
  input: {
    minHeight: 44,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  cta: {
    minHeight: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  error: {
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.sm,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  note: {
    color: Colors.textSecondary,
    backgroundColor: Colors.parchment,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    padding: Spacing.sm,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Could not create cookbook.';
}
