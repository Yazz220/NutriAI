import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Settings as SettingsIcon } from 'lucide-react-native';
import { BookCover } from '@/components/cookbook/BookCover';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { Cookbook } from '@/types/cookbook';

interface CookbookShelfProps {
  cookbooks: Cookbook[];
  onSelectCookbook: (cookbook: Cookbook) => void;
  onAddCookbook: () => void;
  onOpenSettings?: () => void;
  bottomInset?: number;
  isStale?: boolean;
  onRefresh?: () => void;
}

export function CookbookShelf({
  cookbooks,
  onSelectCookbook,
  onAddCookbook,
  onOpenSettings,
  bottomInset = 0,
  isStale = false,
  onRefresh,
}: CookbookShelfProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gap = Spacing.lg;
  const horizontal = Spacing.xl;
  const cardWidth = Math.floor((width - horizontal * 2 - gap) / 2);
  const coverWidth = Math.max(130, Math.min(178, cardWidth - 18));

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.logo}>Nosh</Text>
        {onOpenSettings ? (
          <Pressable
            style={styles.iconButton}
            onPress={onOpenSettings}
            accessibilityLabel="Open settings"
          >
            <SettingsIcon size={24} color={Colors.text} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 124 + bottomInset }]}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>My Cookbooks</Text>
          <Text style={styles.subtitle}>Your collection of recipes and memories.</Text>
        </View>

        {isStale && onRefresh ? <StaleDataNotice subject="cookbooks" onRefresh={onRefresh} /> : null}

        <View style={styles.grid}>
          {cookbooks.map((book) => (
            <Pressable
              key={book.id}
              style={[styles.bookCard, { width: cardWidth }]}
              onPress={() => onSelectCookbook(book)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${book.title}`}
            >
              <BookCover
                title={book.title}
                coverStyle={book.coverStyle}
                pageCount={book.pageCount}
                imageAsset={book.coverImageAsset}
                width={coverWidth}
                showPageCount={false}
              />
              <View style={styles.bookMeta}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.bookSub} numberOfLines={1}>
                  {formatRecipeCount(book.pageCount)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fabButton, { bottom: insets.bottom + 28 + bottomInset }]}
        onPress={onAddCookbook}
        accessibilityRole="button"
        accessibilityLabel="Add a new cookbook"
      >
        <Plus size={32} color={Colors.onPrimary} strokeWidth={1.8} />
      </Pressable>
    </LinearGradient>
  );
}

function formatRecipeCount(pageCount?: number) {
  const recipes = pageCount ?? 0;
  if (recipes === 0) return 'Empty cookbook';
  return recipes === 1 ? '1 recipe' : `${recipes} recipes`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  logo: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  heading: {
    gap: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Fonts.ui.regular,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    alignItems: 'flex-start',
  },
  bookCard: {
    gap: Spacing.md,
  },
  bookMeta: {
    gap: 3,
    paddingHorizontal: 2,
  },
  bookTitle: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.display.semibold,
  },
  bookSub: {
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: Fonts.ui.medium,
  },
  fabButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 0,
    boxShadow: Colors.book.liftedShadow,
  },
});
