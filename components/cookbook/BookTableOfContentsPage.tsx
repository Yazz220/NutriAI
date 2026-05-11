import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { groupPagesBySection, resolveCookbookSections } from '@/utils/cookbook/sections';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

interface BookTableOfContentsPageProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  onSelectPage: (page: CookbookPage) => void;
  bookMode?: boolean;
}

export function BookTableOfContentsPage({
  cookbook,
  pages,
  onSelectPage,
  bookMode = false,
}: BookTableOfContentsPageProps) {
  const sectionEntries = resolveCookbookSections(cookbook, pages);
  const sections = groupPagesBySection(pages, sectionEntries);

  return (
    <View style={[styles.page, bookMode && styles.bookPage]}>
      <View style={[styles.inner, bookMode && styles.bookInner]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{cookbook?.title ?? 'Cookbook'}</Text>
          <Text style={styles.title}>Table of Contents</Text>
          <Text style={styles.subtitle}>
            {pages.length === 1 ? '1 page' : `${pages.length} pages`} organized from recipes in this book.
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.length > 0 ? (
            sections.map((section) => (
              <View key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                  <Text style={styles.sectionCount}>{section.pages.length}</Text>
                </View>
                {section.pages.map((page) => (
                  <Pressable
                    key={page.id}
                    style={styles.row}
                    onPress={() => {
                      const fullPage = pages.find((candidate) => candidate.id === page.id);
                      if (fullPage) onSelectPage(fullPage);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to page ${page.pageNumber}, ${page.title}`}
                  >
                    <Text style={styles.pageNumber}>{page.pageNumber}</Text>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {page.title}
                    </Text>
                    <View style={styles.dots} />
                  </Pressable>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No recipe pages yet</Text>
              <Text style={styles.emptyText}>Add pages and this table will build itself from the recipes inside.</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Contents</Text>
          <Text style={styles.footerText}>{pages.length ? 'Swipe to begin' : 'Add a page'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 430,
    aspectRatio: 2 / 3,
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.ash,
    overflow: 'hidden',
    boxShadow: Colors.book.paperShadow,
    padding: 10,
  },
  bookPage: {
    width: '100%',
    maxWidth: undefined,
    height: '100%',
    aspectRatio: undefined,
    borderRadius: 0,
    borderWidth: 0,
    boxShadow: 'none',
    padding: 0,
  },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    padding: 16,
    gap: Spacing.md,
  },
  bookInner: {
    borderWidth: 0,
    padding: 18,
  },
  header: {
    gap: 3,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 1,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 12,
    lineHeight: 17,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.ash,
  },
  sectionTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCount: {
    minWidth: 24,
    textAlign: 'right',
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontVariant: ['tabular-nums'],
  },
  row: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNumber: {
    width: 24,
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontVariant: ['tabular-nums'],
  },
  rowTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
    fontFamily: Fonts.ui.medium,
  },
  dots: {
    width: 34,
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderBottomColor: Colors.duskGrey,
  },
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.slate,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.ash,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
});
