import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BookReader } from '@/components/cookbook/BookReader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';
import { useCookbooks } from '@/hooks/useCookbooks';
import { shareCookbookPage } from '@/utils/cookbook/share';
import type { CookbookPage } from '@/types/cookbook';

export default function BookReaderScreen() {
  const { cookbookId, pageId } = useLocalSearchParams<{
    cookbookId: string;
    pageId?: string | string[];
  }>();
  const normalizedPageId = Array.isArray(pageId) ? pageId[0] : pageId;
  const {
    cookbook,
    pages,
    setSelectedPageId,
    isLoading,
    cookbookError,
    pagesError,
    hasPageData,
    isStale,
    refresh,
    updatePageTemplate,
  } = useCookbook(cookbookId);

  // The shelf already has the cookbook metadata cached. Use it to render
  // the cover instantly while useCookbook fetches pages — eliminates the
  // white flash on navigation from the shelf.
  const { cookbooks: shelfCookbooks } = useCookbooks();
  const shelfCookbook = shelfCookbooks.find((book) => book.id === cookbookId);
  const effectiveCookbook = cookbook ?? shelfCookbook ?? null;

  const handleShare = async (page: CookbookPage) => {
    try {
      await shareCookbookPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'This page is not ready to share yet.';
      Alert.alert('Share unavailable', message);
    }
  };

  // Only show the full-screen spinner if we have NO cookbook metadata at
  // all (not even from the shelf). If we have the cookbook, render the
  // reader immediately — the cover shows instantly and pages stream in.
  if (isLoading && !effectiveCookbook) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if ((cookbookError && !cookbook) || (pagesError && !hasPageData && !effectiveCookbook)) {
    return (
      <LoadErrorState
        title="Could not open this cookbook"
        message="The book could not be loaded. Check your connection and try again."
        onRetry={() => {
          void refresh();
        }}
        onBack={() => router.replace('/(book)')}
      />
    );
  }

  if (!effectiveCookbook) {
    return (
      <LoadErrorState
        title="Cookbook not found"
        message="This cookbook may have been removed or is no longer available."
        onBack={() => router.replace('/(book)')}
      />
    );
  }

  return (
    <BookReader
      cookbook={effectiveCookbook}
      pages={pages}
      initialPageId={normalizedPageId}
      onSelectPage={setSelectedPageId}
      onShare={handleShare}
      onUpdatePageTemplate={updatePageTemplate}
      isStale={isStale}
      onRefresh={() => {
        void refresh();
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
