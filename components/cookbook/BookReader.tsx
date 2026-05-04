import React, { useEffect, useRef } from 'react';
import { FlatList, ListRenderItemInfo, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { PageControls } from '@/components/cookbook/PageControls';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookPage } from '@/types/cookbook';

interface BookReaderProps {
  pages: CookbookPage[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
  isSampleBook?: boolean;
}

export function BookReader({ pages, selectedPageId, onSelectPage, onShare, isSampleBook = false }: BookReaderProps) {
  const listRef = useRef<FlatList<CookbookPage>>(null);
  const { width } = useWindowDimensions();
  const selectedIndex = Math.max(0, pages.findIndex((page) => page.id === selectedPageId));
  const selectedPage = pages[selectedIndex] ?? pages[0];
  const selectedSection = selectedPage?.section ?? 'favorites';
  const horizontalPadding = width < 390 ? Spacing.sm : Spacing.md;

  useEffect(() => {
    if (!selectedPage || width <= 0) return;
    listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
  }, [selectedIndex, selectedPage, width]);

  return (
    <LinearGradient colors={['#4A3220', '#7E5631', '#D7B982']} style={styles.container}>
      <View style={styles.backgroundTexture}>
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{isSampleBook ? 'Preview cookbook' : 'Personal cookbook'}</Text>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              My Nosh Cookbook
            </Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(book)/add')}
            accessibilityRole="button"
            accessibilityLabel="Add recipe page"
          >
            <Plus size={20} color="#FFF9EF" />
          </Pressable>
        </View>

        <View style={styles.chapterStrip}>
          <Text style={styles.chapterLabel} numberOfLines={1}>
            {selectedSection} recipes
          </Text>
        </View>

        <View style={styles.bookStage}>
          <View style={styles.bookSpine} />
          <FlatList
            ref={listRef}
            data={pages}
            horizontal
            pagingEnabled
            contentInsetAdjustmentBehavior="automatic"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(page) => page.id}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            renderItem={({ item }: ListRenderItemInfo<CookbookPage>) => (
              <View style={[styles.pageSlot, { width, paddingHorizontal: horizontalPadding }]}>
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
        </View>

        <View style={styles.controls}>
          <PageControls
            pageLabel={`Page ${selectedIndex + 1} of ${pages.length}`}
            onToc={() => router.push('/(book)/toc')}
            onShare={() => selectedPage && onShare(selectedPage)}
            onSettings={() => router.push('/(book)/settings')}
          />
        </View>

        {selectedPage ? <NoshAssistantButton page={selectedPage} cookbookPages={pages} /> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundTexture: {
    flex: 1,
    backgroundColor: 'rgba(255, 247, 232, 0.12)',
  },
  topBar: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    color: '#F7E6C8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFF9EF',
    fontFamily: Fonts.display.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3F6D2A',
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 239, 0.55)',
    boxShadow: '0 8px 16px rgba(34, 21, 10, 0.24)',
  },
  chapterStrip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 249, 239, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 239, 0.24)',
  },
  chapterLabel: {
    flex: 1,
    color: '#FFF9EF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  bookStage: {
    flex: 1,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  bookSpine: {
    position: 'absolute',
    left: 18,
    top: 26,
    bottom: 26,
    width: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 31, 14, 0.28)',
  },
  pageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  controls: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});
