import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, BookOpen, Plus } from 'lucide-react-native';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

interface PageAddedScreenProps {
  cookbook: Cookbook | null;
  page: CookbookPage;
  onViewInBook: () => void;
  onAddAnother: () => void;
}

export function GenerationResult({
  cookbook,
  page,
  onViewInBook,
  onAddAnother,
}: PageAddedScreenProps) {
  const preset = getCookbookStyle(cookbook?.coverStyle ?? null);
  const cookbookTitle = cookbook?.title ?? 'your cookbook';

  return (
    <LinearGradient colors={preset.palette.shelfBackground} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Page added</Text>
          <Text style={styles.title}>Page added</Text>
          <Text style={styles.subtitle}>
            {`${page.title} has been added to ${cookbookTitle}.`}
          </Text>
        </View>

        <View style={styles.previewWrap}>
          <View style={styles.preview}>
            <PageCanvas page={page} />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={onViewInBook}
            accessibilityRole="button"
            accessibilityLabel={`View ${page.title} in ${cookbookTitle}`}
          >
            <BookOpen size={20} color={Colors.onPrimary} />
            <Text style={styles.primaryText}>View in book</Text>
            <ArrowRight size={20} color={Colors.onPrimary} />
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onAddAnother}
            accessibilityRole="button"
            accessibilityLabel={`Add another page to ${cookbookTitle}`}
          >
            <Plus size={18} color={Colors.text} />
            <Text style={styles.secondaryText}>Add another page</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  previewWrap: {
    alignItems: 'center',
  },
  preview: {
    width: '88%',
    maxWidth: 320,
    aspectRatio: 2 / 3,
    borderRadius: Radii.lg,
    backgroundColor: Colors.book.page,
    borderWidth: 1,
    borderColor: Colors.ash,
    overflow: 'hidden',
    boxShadow: Colors.book.paperShadow,
  },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderWidth: 0,
    boxShadow: Colors.book.cardShadow,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    letterSpacing: 0,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.charcoal,
  },
  secondaryText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
});
