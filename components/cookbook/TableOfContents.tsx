import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookPageSummary } from '@/types/cookbook';
import { groupPagesBySection } from '@/utils/cookbook/sections';

interface TableOfContentsProps {
  pages: CookbookPageSummary[];
  onSelectPage: (id: string) => void;
}

export function TableOfContents({ pages, onSelectPage }: TableOfContentsProps) {
  const sections = groupPagesBySection(pages);

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.coverCard}>
        <Text style={styles.eyebrow}>Recipe index</Text>
        <Text style={styles.title}>Table of Contents</Text>
        <Text style={styles.subtitle}>{pages.length} pages organized like a real cookbook.</Text>
      </View>

      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <Text style={styles.sectionCount}>{section.pages.length}</Text>
          </View>
          {section.pages.map((page) => (
            <Pressable key={page.id} style={styles.row} onPress={() => onSelectPage(page.id)}>
              <View style={styles.pageNumber}>
                <Text style={styles.pageNumberText}>{page.pageNumber}</Text>
              </View>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {page.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A3220',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  coverCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D8BE8E',
    backgroundColor: '#FFF9EF',
    padding: Spacing.lg,
    gap: Spacing.xs,
    boxShadow: '0 14px 28px rgba(34, 21, 10, 0.18)',
  },
  eyebrow: {
    color: '#806A46',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#3E2C1B',
    fontFamily: Fonts.display.bold,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    color: '#6D5738',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 239, 0.22)',
    backgroundColor: 'rgba(255, 249, 239, 0.13)',
    overflow: 'hidden',
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255, 249, 239, 0.18)',
  },
  sectionTitle: {
    color: '#FFF9EF',
    fontFamily: Fonts.display.semibold,
    fontSize: 20,
  },
  sectionCount: {
    color: '#4A3220',
    minWidth: 28,
    textAlign: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F5D8A6',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 249, 239, 0.16)',
  },
  pageNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9EF',
  },
  pageNumberText: {
    color: '#6A4527',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rowTitle: {
    flex: 1,
    color: '#FFF9EF',
    fontSize: 15,
    fontWeight: '700',
  },
});
