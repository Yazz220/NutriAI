import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowRight, BookOpen, Plus } from 'lucide-react-native';
import { BookCover } from '@/components/cookbook/BookCover';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { Cookbook } from '@/types/cookbook';

interface BookCoverReaderPageProps {
  cookbook: Cookbook | null;
  pageCount: number;
  onStartReading: () => void;
  onAddPage: () => void;
}

export function BookCoverReaderPage({
  cookbook,
  pageCount,
  onStartReading,
  onAddPage,
}: BookCoverReaderPageProps) {
  const title = cookbook?.title ?? 'My Cookbook';
  const pageText = pageCount === 1 ? '1 recipe page' : `${pageCount} recipe pages`;
  const canRead = pageCount > 0;

  return (
    <View style={styles.page}>
      <View style={styles.coverShadow}>
        <BookCover
          title={title}
          coverStyle={cookbook?.coverStyle ?? 'handwritten'}
          pageCount={pageCount}
          imageAsset={cookbook?.coverImageAsset}
          width={255}
          showPageCount={false}
          style={styles.cover}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          {title}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Everyday favorites</Text>
        <Text style={styles.pageCount}>{canRead ? pageText : 'Ready for its first page'}</Text>
      </View>

      <Pressable
        style={[styles.primaryButton, !canRead && styles.secondaryPrimary]}
        onPress={canRead ? onStartReading : onAddPage}
        accessibilityRole="button"
        accessibilityLabel={canRead ? `Start reading ${title}` : `Add the first page to ${title}`}
      >
        {canRead ? <BookOpen size={20} color={Colors.onPrimary} /> : <Plus size={20} color={Colors.onPrimary} />}
        <Text style={styles.primaryText}>{canRead ? 'Start reading' : 'Add first page'}</Text>
        {canRead ? <ArrowRight size={24} color={Colors.onPrimary} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  coverShadow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
  },
  cover: {
    transform: [{ rotate: '-0.5deg' }],
  },
  copy: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
    textAlign: 'center',
  },
  divider: {
    width: 72,
    height: 1,
    backgroundColor: Colors.duskGrey,
  },
  subtitle: {
    color: Colors.slate,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  pageCount: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 220,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderWidth: 0,
    boxShadow: Colors.book.cardShadow,
  },
  secondaryPrimary: {
    backgroundColor: Colors.primary,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
  },
});
