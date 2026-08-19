import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Ellipsis, LayoutTemplate, Settings as SettingsIcon } from 'lucide-react-native';
import { PhysicalBook, resolveSpineWidth } from '@/components/physical-book/PhysicalBook';
import { SpineFace } from '@/components/physical-book/SpineFace';
import { CreateBookSpine, CreateBookVolume } from '@/components/shelf/CreateBookVolume';
import { ShelfBoard } from '@/components/shelf/ShelfBoard';
import { ShelfCarousel } from '@/components/shelf/ShelfCarousel';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookBindingForStyle } from '@/constants/cookbookBindings';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { Cookbook } from '@/types/cookbook';

/**
 * The spine-packed 3D library shelf: cookbooks stand tightly packed with
 * their spines facing out on a wooden board; the centered volume pivots
 * forward to show its front cover. Tap the centered book to open it, and
 * tap the dashed volume at the end to create a new cookbook.
 */

const BOARD_HEIGHT = 18;
const BOARD_BOTTOM = 10;
const BOARD_CLEARANCE = BOARD_BOTTOM + BOARD_HEIGHT;

interface ShelfSceneProps {
  cookbooks: Cookbook[];
  onSelectCookbook: (cookbook: Cookbook) => void;
  onAddCookbook: () => void;
  onOpenTemplates?: () => void;
  onOpenSettings?: () => void;
  bottomInset?: number;
  isStale?: boolean;
  onRefresh?: () => void;
}

export function ShelfScene({
  cookbooks,
  onSelectCookbook,
  onAddCookbook,
  onOpenTemplates,
  onOpenSettings,
  bottomInset = 0,
  isStale = false,
  onRefresh,
}: ShelfSceneProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeBook = activeIndex < cookbooks.length ? cookbooks[activeIndex] : undefined;
  const isEmptyShelf = cookbooks.length === 0;

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.logo}>Nosh</Text>
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

      <View style={styles.heading}>
        <Text style={styles.title}>My Cookbooks</Text>
        <Text style={styles.subtitle}>Your collection of recipes and memories.</Text>
        {isStale && onRefresh ? (
          <View style={styles.staleNotice}>
            <StaleDataNotice subject="cookbooks" onRefresh={onRefresh} />
          </View>
        ) : null}
      </View>

      <View style={styles.stage}>
        {/* Wall shadow where the wall meets the shelf board */}
        <LinearGradient
          colors={['rgba(23,22,20,0)', 'rgba(23,22,20,0.07)']}
          style={[styles.wallShadow, { bottom: BOARD_CLEARANCE }]}
          pointerEvents="none"
        />
        <ShelfBoard bottom={BOARD_BOTTOM} height={BOARD_HEIGHT} />

        <ShelfCarousel
          items={cookbooks}
          keyExtractor={(book) => book.id}
          onActiveIndexChange={setActiveIndex}
          onActivateItem={onSelectCookbook}
          accessibilityLabelFor={(book) => `Open ${book.title}`}
          spineWidthFor={(book, width) => resolveSpineWidth(width, book.pageCount ?? 12)}
          renderCover={(book, width) => (
            <PhysicalBook
              title={book.title}
              coverStyle={book.coverStyle}
              pageCount={book.pageCount}
              imageAsset={book.coverImageAsset}
              width={width}
              showShadow={false}
            />
          )}
          renderSpine={(book, spineWidth, height) => (
            <SpineFace
              title={book.title}
              binding={getCookbookBindingForStyle(book.coverStyle)}
              width={spineWidth}
              height={height}
            />
          )}
          trailingSlot={{
            accessibilityLabel: 'Create a new cookbook',
            onActivate: onAddCookbook,
            renderCover: (width) => <CreateBookVolume width={width} />,
            renderSpine: (spineWidth, height) => <CreateBookSpine width={spineWidth} height={height} />,
          }}
          boardClearance={BOARD_CLEARANCE}
        />
      </View>

      <View style={[styles.meta, { paddingBottom: insets.bottom + Spacing.xl + bottomInset }]}>
        {isEmptyShelf ? (
          <>
            <View style={styles.emptyRule} />
            <Text style={styles.metaTitle}>A shelf waiting to be filled</Text>
            <Text style={styles.metaSub}>
              Create your first cookbook, choose its cover, then bring recipes in one page at a time.
            </Text>
          </>
        ) : activeBook ? (
          <>
            <Text style={styles.metaTitle} numberOfLines={1}>
              {activeBook.title}
            </Text>
            <Text style={styles.metaSub}>{formatRecipeCount(activeBook.pageCount)}</Text>
          </>
        ) : (
          <>
            <Text style={styles.metaTitle}>New cookbook</Text>
            <Text style={styles.metaSub}>Choose a binding and name your book.</Text>
          </>
        )}
      </View>

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
            <Text style={styles.menuEyebrow}>LIBRARY</Text>
            {onOpenTemplates ? (
              <MenuItem
                icon={<LayoutTemplate size={19} color={Colors.text} strokeWidth={1.7} />}
                title="Page templates"
                subtitle="Styles for new recipe pages"
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
                subtitle="Account and library details"
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
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
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
      <View style={styles.menuItemCopy}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
      </View>
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
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  buttonPressed: {
    backgroundColor: Colors.parchment,
  },
  heading: {
    paddingHorizontal: Spacing.xl,
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
  staleNotice: {
    marginTop: Spacing.sm,
  },
  stage: {
    flex: 1,
    overflow: 'visible',
  },
  wallShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 26,
  },
  meta: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xl,
  },
  emptyRule: {
    width: 48,
    height: 1,
    backgroundColor: Colors.ash,
    marginBottom: Spacing.sm,
  },
  metaTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  metaSub: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  menuLayer: {
    flex: 1,
    backgroundColor: 'rgba(23,22,20,0.12)',
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
    fontSize: 9,
    letterSpacing: 1.2,
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
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  menuItemCopy: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  menuItemSubtitle: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: 11,
    lineHeight: 15,
  },
});
