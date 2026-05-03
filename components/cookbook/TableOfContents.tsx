import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { CookbookPageSummary } from '@/types/cookbook';
import { groupPagesBySection } from '@/utils/cookbook/sections';

interface TableOfContentsProps {
  pages: CookbookPageSummary[];
  onSelectPage: (id: string) => void;
}

export function TableOfContents({ pages, onSelectPage }: TableOfContentsProps) {
  const sections = groupPagesBySection(pages);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Table of Contents</Text>
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.label}</Text>
          {section.pages.map((page) => (
            <TouchableOpacity key={page.id} style={styles.row} onPress={() => onSelectPage(page.id)}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {page.title}
              </Text>
              <Text style={styles.rowPage}>{page.pageNumber}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowTitle: {
    flex: 1,
    color: Colors.text,
  },
  rowPage: {
    color: Colors.textMuted,
  },
});
