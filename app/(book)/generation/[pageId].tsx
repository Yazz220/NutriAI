import React, { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { GenerationResult } from '@/components/cookbook/GenerationResult';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useCookbook } from '@/hooks/useCookbook';
import { generateCookbookPage } from '@/utils/cookbook/api';
import { buildCookbookPagePromptPayload } from '@/utils/cookbook/pagePrompt';
import { shareCookbookPage } from '@/utils/cookbook/share';

export default function GenerationResultScreen() {
  const { pageId } = useLocalSearchParams<{ pageId?: string | string[] }>();
  const normalizedPageId = Array.isArray(pageId) ? pageId[0] : pageId;
  const { cookbook, pages, refresh, setSelectedPageId, upsertPage } = useCookbook();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const page = useMemo(() => {
    if (!normalizedPageId || normalizedPageId === 'temp') return undefined;
    return pages.find((candidate) => candidate.id === normalizedPageId);
  }, [normalizedPageId, pages]);

  async function keepPage() {
    if (page) setSelectedPageId(page.id);
    router.replace('/(book)');
  }

  async function regeneratePage() {
    if (!cookbook || !page?.recipe) {
      Alert.alert('Page not ready', 'Try again once the recipe has loaded.');
      return;
    }

    setIsRegenerating(true);
    try {
      const regeneratedPage = await generateCookbookPage({
        cookbookId: cookbook.id,
        pageId: page.id,
        recipe: page.recipe,
        promptPayload: buildCookbookPagePromptPayload({ recipe: page.recipe, theme: cookbook.theme }),
      });
      upsertPage(regeneratedPage);
      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Cookbook refresh failed after page regeneration', refreshError);
      }
      setSelectedPageId(regeneratedPage.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not regenerate this page.';
      Alert.alert('Regeneration failed', message);
    } finally {
      setIsRegenerating(false);
    }
  }

  async function exportPage() {
    if (!page) return;

    try {
      await shareCookbookPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not export this page.';
      Alert.alert('Export failed', message);
    }
  }

  if (!page) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>This generated page is no longer available.</Text>
        <Button title="Back to cookbook" variant="secondary" onPress={() => router.replace('/(book)')} />
      </View>
    );
  }

  return (
    <GenerationResult
      page={page}
      isRegenerating={isRegenerating}
      onKeep={keepPage}
      onRegenerate={regeneratePage}
      onExport={exportPage}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
