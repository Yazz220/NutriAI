import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { BookCheck, ChevronLeft, Inbox } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import { Fonts } from '@/utils/fonts';

export default function RecentImportsScreen() {
  const { captureId } = useLocalSearchParams<{ captureId?: string }>();
  const { captures } = useRecipeCaptures();
  const { cookbooks } = useCookbooks();
  const cookbookTitles = React.useMemo(
    () => new Map(cookbooks.map((cookbook) => [cookbook.id, cookbook.title])),
    [cookbooks],
  );

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()} accessibilityLabel="Back">
            <ChevronLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Nosh intake</Text>
            <Text style={styles.title}>Recipe imports</Text>
            <Text style={styles.copy}>Nosh reads, designs, and files every recipe as a finished cookbook page.</Text>
          </View>
        </View>

        {captureId ? (
          <NoshCaptureWorkspace captureId={captureId} />
        ) : captures.length > 0 ? (
          <View style={styles.list}>
            {captures.slice(0, 24).map((capture) => (
              <ImportRow
                key={capture.id}
                capture={capture}
                cookbookTitle={capture.destinationCookbookId
                  ? cookbookTitles.get(capture.destinationCookbookId)
                  : undefined}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Inbox size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No recipe imports yet</Text>
            <Text style={styles.copy}>Shared recipes will appear here while Nosh turns them into pages.</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function ImportRow({ capture, cookbookTitle }: { capture: RecipeCapture; cookbookTitle?: string }) {
  const state = importState(capture, cookbookTitle);
  function open() {
    if (capture.status === 'ready' && capture.destinationCookbookId && capture.pageId) {
      router.push(`/(book)/${capture.destinationCookbookId}?pageId=${capture.pageId}`);
      return;
    }
    router.setParams({ captureId: capture.id });
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${state.label}: ${capture.recipeGraph?.title ?? 'recipe import'}`}
    >
      <View style={[styles.rowIcon, capture.status === 'ready' && styles.rowIconReady]}>
        {capture.status === 'ready'
          ? <BookCheck size={17} color={Colors.onSuccess} />
          : <Inbox size={17} color={Colors.text} />}
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>{capture.recipeGraph?.title ?? 'Reading recipe'}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{state.detail}</Text>
      </View>
      <Text style={[styles.rowState, capture.status === 'needs_attention' && styles.rowStateError]}>
        {state.label}
      </Text>
    </Pressable>
  );
}

function importState(capture: RecipeCapture, cookbookTitle?: string) {
  if (capture.status === 'needs_destination') {
    return { label: 'Choose book', detail: 'The recipe is ready for a visual identity.' };
  }
  if (capture.status === 'needs_attention') {
    return { label: 'Try again', detail: capture.failureMessage ?? 'Nosh could not finish this page.' };
  }
  if (capture.status === 'ready') {
    return { label: 'Ready', detail: cookbookTitle ? `Added to ${cookbookTitle}` : 'Added to your cookbook' };
  }
  return {
    label: 'Working',
    detail: capture.pageStatus === 'generating'
      ? `Designing the page${cookbookTitle ? ` for ${cookbookTitle}` : ''}`
      : 'Reading and structuring the recipe',
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: Spacing.xl, padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingTop: Spacing.md },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: 11, letterSpacing: 0.4 },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 28, lineHeight: 34 },
  copy: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: 13, lineHeight: 19 },
  list: { gap: Spacing.sm },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white, padding: Spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.parchment },
  rowIconReady: { backgroundColor: Colors.success },
  rowCopy: { flex: 1 },
  rowTitle: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 15 },
  rowMeta: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 12, marginTop: 3 },
  rowState: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: 11 },
  rowStateError: { color: Colors.error },
  empty: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radii.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.ash, backgroundColor: Colors.white, padding: Spacing.xl },
  emptyTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 20, textAlign: 'center' },
});
