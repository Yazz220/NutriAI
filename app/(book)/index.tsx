import React from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookReader } from '@/components/cookbook/BookReader';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';
import { SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/samplePages';
import type { CookbookPage } from '@/types/cookbook';

export default function BookReaderScreen() {
  const insets = useSafeAreaInsets();
  const { pages, selectedPageId, setSelectedPageId, isLoading } = useCookbook();
  const displayPages = pages.length > 0 ? pages : SAMPLE_COOKBOOK_PAGES;
  const isSampleBook = pages.length === 0;

  const handleShare = (page: CookbookPage) => {
    Share.share({
      title: page.title,
      message: page.imageUrl ? `${page.title}\n${page.imageUrl}` : page.title,
      url: page.imageUrl,
    }).catch(() => {});
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BookReader
        pages={displayPages}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onShare={handleShare}
        isSampleBook={isSampleBook}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
