import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ArrowRight, BookCopy, BookOpen } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type {
  CollectionActionKind,
  CollectionActionPreview,
  CollectionActionResult,
} from '@/utils/cookbook/collectionActions';
import { createCollectionActionRequestKey } from '@/utils/cookbook/collectionActions';
import { Fonts } from '@/utils/fonts';
import { NoshActivityDots } from '@/components/nosh/conversation/NoshActivityDots';

export function CollectionActionCard({
  action,
  pageId,
  destinationCookbookId,
  onPreview,
  onCommit,
  onResult,
}: {
  action: CollectionActionKind;
  pageId: string;
  destinationCookbookId: string;
  onPreview: (input: {
    action: CollectionActionKind;
    pageId: string;
    destinationCookbookId: string;
  }) => Promise<CollectionActionPreview>;
  onCommit: (input: {
    action: CollectionActionKind;
    pageId: string;
    destinationCookbookId: string;
    idempotencyKey: string;
  }) => Promise<CollectionActionResult>;
  onResult: (result: CollectionActionResult | { cancelled: true }) => void;
}) {
  const [preview, setPreview] = React.useState<CollectionActionPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [committing, setCommitting] = React.useState(false);
  const [previewAttempt, setPreviewAttempt] = React.useState(0);
  const requestKey = React.useRef(createCollectionActionRequestKey()).current;

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    void onPreview({ action, pageId, destinationCookbookId })
      .then((value) => {
        if (!cancelled) setPreview(value);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load this change.');
      });
    return () => {
      cancelled = true;
    };
  }, [action, destinationCookbookId, onPreview, pageId, previewAttempt]);

  const commit = async () => {
    if (!preview || committing) return;
    setCommitting(true);
    setError(null);
    try {
      const result = await onCommit({ action, pageId, destinationCookbookId, idempotencyKey: requestKey });
      onResult(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not complete this change.');
      setCommitting(false);
    }
  };

  if (!preview && !error) {
    return (
      <View style={styles.loading} accessibilityLiveRegion="polite" accessibilityRole="progressbar">
        <NoshActivityDots size={5} />
        <Text style={styles.muted}>Checking…</Text>
      </View>
    );
  }

  if (!preview) {
    return (
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={styles.title}>This change is unavailable</Text>
        <Text style={styles.error}>{error}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel collection change"
            onPress={() => onResult({ cancelled: true })}
            style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
          >
            <Text style={styles.quietText}>Not now</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading the collection change again"
            onPress={() => {
              setError(null);
              setPreviewAttempt((attempt) => attempt + 1);
            }}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        {action === 'copy'
          ? <BookCopy size={18} color={Colors.primary} />
          : <BookOpen size={18} color={Colors.primary} />}
        <View style={styles.headingText}>
          <Text style={styles.title}>{action === 'copy' ? 'Copy' : 'Move'} {preview.recipeTitle}</Text>
        </View>
      </View>
      <View style={styles.route}>
        <Text style={styles.book}>{preview.sourceCookbook.title}</Text>
        <ArrowRight size={15} color={Colors.textMuted} />
        <Text style={styles.book}>{preview.destinationCookbook.title}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel collection change"
          accessibilityState={{ disabled: committing }}
          disabled={committing}
          onPress={() => onResult({ cancelled: true })}
          style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
        >
          <Text style={styles.quietText}>Not now</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Confirm ${action}`}
          accessibilityState={{ disabled: committing, busy: committing }}
          disabled={committing}
          onPress={() => void commit()}
          style={({ pressed }) => [styles.primary, committing && styles.disabled, pressed && styles.pressed]}
        >
          {committing ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
          <Text style={styles.primaryText}>{committing ? 'Saving…' : `Confirm ${action}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radii.lg, backgroundColor: Colors.white, padding: Spacing.md, marginVertical: Spacing.values[4] },
  loading: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headingText: { flex: 1, gap: Spacing.values[2] },
  eyebrow: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, textTransform: 'uppercase' },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.lgMd },
  route: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs, paddingVertical: Spacing.xs },
  book: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  muted: { color: Colors.textSecondary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight18 },
  error: { color: Colors.error, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  primary: { flexGrow: 1, minWidth: 128, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radii.full, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, textTransform: 'capitalize' },
  quiet: { flexGrow: 1, minWidth: 96, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full, backgroundColor: Colors.alpha.primary[5], paddingHorizontal: Spacing.md },
  quietText: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.7 },
});
