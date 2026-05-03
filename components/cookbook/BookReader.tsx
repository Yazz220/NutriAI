import React, { useEffect, useRef } from 'react';
import { FlatList, ListRenderItemInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { PageControls } from '@/components/cookbook/PageControls';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface BookReaderProps {
  pages: CookbookPage[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
}

export function BookReader({ pages, selectedPageId, onSelectPage, onShare }: BookReaderProps) {
  const listRef = useRef<FlatList<CookbookPage>>(null);
  const { width } = useWindowDimensions();
  const selectedIndex = Math.max(0, pages.findIndex((page) => page.id === selectedPageId));
  const selectedPage = pages[selectedIndex] ?? pages[0];

  useEffect(() => {
    if (!selectedPage || width <= 0) return;

    listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
  }, [selectedIndex, selectedPage, width]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(page) => page.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }: ListRenderItemInfo<CookbookPage>) => (
          <View style={[styles.pageSlot, { width }]}>
            <PageCanvas page={item} />
          </View>
        )}
        onMomentumScrollEnd={(event) => {
          const pageWidth = event.nativeEvent.layoutMeasurement.width;
          const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
          const page = pages[index];
          if (page) onSelectPage(page.id);
        }}
      />
      <View style={styles.controls}>
        <PageControls
          pageLabel={`Page ${selectedIndex + 1} of ${pages.length}`}
          onToc={() => router.push('/(book)/toc')}
          onAdd={() => router.push('/(book)/add')}
          onShare={() => selectedPage && onShare(selectedPage)}
          onSettings={() => router.push('/(book)/settings')}
        />
      </View>
      {selectedPage ? <NoshAssistantButton page={selectedPage} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  controls: {
    padding: Spacing.md,
  },
});
