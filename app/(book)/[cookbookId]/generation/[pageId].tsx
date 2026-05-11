import React, { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GenerationResult } from '@/components/cookbook/GenerationResult';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useCookbook } from '@/hooks/useCookbook';

export default function PageAddedScreen() {
  const { cookbookId, pageId } = useLocalSearchParams<{ cookbookId: string; pageId?: string | string[] }>();
  const normalizedPageId = Array.isArray(pageId) ? pageId[0] : pageId;
  const { cookbook, pages, setSelectedPageId } = useCookbook(cookbookId);

  const page = useMemo(() => {
    if (!normalizedPageId || normalizedPageId === 'temp') return undefined;
    return pages.find((candidate) => candidate.id === normalizedPageId);
  }, [normalizedPageId, pages]);

  function viewInBook() {
    if (page) setSelectedPageId(page.id);
    router.replace(`/(book)/${cookbookId}`);
  }

  function addAnotherPage() {
    router.replace(`/(book)/${cookbookId}/add`);
  }

  if (!page) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>This generated page is no longer available.</Text>
        <Button title="Back to cookbook" variant="secondary" onPress={() => router.replace(`/(book)/${cookbookId}`)} />
      </View>
    );
  }

  return (
    <GenerationResult
      cookbook={cookbook}
      page={page}
      onViewInBook={viewInBook}
      onAddAnother={addAnotherPage}
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
    color: Colors.slate,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
