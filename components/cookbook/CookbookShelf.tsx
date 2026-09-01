import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Ellipsis, LayoutTemplate, Plus, Settings as SettingsIcon } from 'lucide-react-native';
import { BookCover } from '@/components/cookbook/BookCover';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { Cookbook } from '@/types/cookbook';

interface CookbookShelfProps {
  cookbooks: Cookbook[];
  onSelectCookbook: (cookbook: Cookbook) => void;
  onAddCookbook: () => void;
  onOpenTemplates?: () => void;
  onOpenSettings?: () => void;
  bottomInset?: number;
  isStale?: boolean;
  onRefresh?: () => void;
}

export function CookbookShelf({
  cookbooks,
  onSelectCookbook,
  onAddCookbook,
  onOpenTemplates,
  onOpenSettings,
  bottomInset = 0,
  isStale = false,
  onRefresh,
}: CookbookShelfProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const compactHeader = width < 520;
  const gap = Spacing.lg;
  const horizontal = Spacing.xl;
  const cardWidth = Math.floor((width - horizontal * 2 - gap) / 2);
  const coverWidth = Math.max(130, Math.min(178, cardWidth - 18));

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.logo}>Folio</Text>
        {onOpenTemplates || onOpenSettings ? (
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Open library menu"
          >
            <Ellipsis size={24} color={Colors.text} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xxxl + bottomInset },
        ]}
      >
        <View style={styles.headingRow}>
          <View style={styles.heading}>
            <Text style={styles.title}>My Cookbooks</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              compactHeader ? styles.addIconButton : styles.addButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={onAddCookbook}
            accessibilityRole="button"
            accessibilityLabel="Create a new cookbook"
          >
            <Plus size={compactHeader ? 23 : 18} color={Colors.onPrimary} strokeWidth={1.9} />
            {!compactHeader ? <Text style={styles.addButtonText}>New cookbook</Text> : null}
          </Pressable>
        </View>

        {isStale && onRefresh ? <StaleDataNotice subject="cookbooks" onRefresh={onRefresh} /> : null}

        {cookbooks.length ? (
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
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyRule} />
            <Text style={styles.emptyTitle}>A shelf waiting to be filled</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuLayer}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Close library menu"
          />
          <View style={[styles.menuPanel, { top: insets.top + 58 }]}>
            {onOpenTemplates ? (
              <MenuItem
                icon={<LayoutTemplate size={19} color={Colors.text} strokeWidth={1.7} />}
                title="Page templates"
                onPress={() => {
                  setMenuOpen(false);
                  onOpenTemplates();
                }}
              />
            ) : null}
            {onOpenSettings ? (
              <MenuItem
                icon={<SettingsIcon size={19} color={Colors.text} strokeWidth={1.7} />}
                title="Settings"
                onPress={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text style={styles.menuItemTitle}>{title}</Text>
      <ChevronRight size={18} color={Colors.textMuted} />
    </Pressable>
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight30,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.numeric[22],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.legacySurface.v81,
  },
  buttonPressed: {
    backgroundColor: Colors.parchment,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  heading: {
    flex: 1,
    gap: Spacing.xs,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight38,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight24,
    fontFamily: Fonts.ui.regular,
  },
  addButton: {
    minHeight: 46,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.cardShadow,
  },
  addIconButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.numeric[24],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.cardShadow,
  },
  addButtonText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  primaryButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    alignItems: 'flex-start',
  },
  emptyState: {
    minHeight: 280,
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyRule: {
    width: 48,
    height: 1,
    backgroundColor: Colors.ash,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight30,
    textAlign: 'center',
  },
  emptyCopy: {
    color: Colors.slate,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight22,
    textAlign: 'center',
  },
  bookCard: {
    gap: Spacing.md,
  },
  bookMeta: {
    gap: Spacing.values[3],
    paddingHorizontal: Spacing.values[2],
  },
  bookTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    fontFamily: Fonts.display.semibold,
  },
  bookSub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight15,
    fontFamily: Fonts.ui.medium,
  },
  menuLayer: {
    flex: 1,
    backgroundColor: Colors.legacySurface.v56,
  },
  menuPanel: {
    position: 'absolute',
    right: Spacing.xl,
    width: 292,
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    boxShadow: Colors.book.liftedShadow,
  },
  menuEyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.metrics.letterSpacing12,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  menuItem: {
    minHeight: 64,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemPressed: {
    backgroundColor: Colors.parchment,
  },
  menuItemIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.numeric[19],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  menuItemCopy: {
    flex: 1,
    gap: Spacing.values[2],
  },
  menuItemTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  menuItemSubtitle: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight15,
  },
});
