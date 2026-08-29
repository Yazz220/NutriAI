import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Ellipsis, Settings as SettingsIcon } from 'lucide-react-native';
import { NoshHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { PhysicalBook, resolveSpineWidth } from '@/components/physical-book/PhysicalBook';
import { SpineFace } from '@/components/physical-book/SpineFace';
import { CreateBookSpine, CreateBookVolume } from '@/components/shelf/CreateBookVolume';
import { ShelfBoard, SHELF_LIP_HEIGHT } from '@/components/shelf/ShelfBoard';
import { ShelfCarousel } from '@/components/shelf/ShelfCarousel';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { resolveCookbookBinding } from '@/constants/cookbookBindings';
import { Radii, Spacing , Typography} from '@/constants/spacing';
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
// Board surface top = BOARD_BOTTOM + lip + board height. Books stand on the
// board surface, so the carousel needs this as the book bottom edge.
const BOARD_CLEARANCE = BOARD_BOTTOM + SHELF_LIP_HEIGHT + BOARD_HEIGHT;

interface ShelfSceneProps {
  cookbooks: Cookbook[];
  onSelectCookbook: (cookbook: Cookbook) => void;
  onAddCookbook: () => void;
  onOpenSettings?: () => void;
  bottomInset?: number;
  isStale?: boolean;
  onRefresh?: () => void;
}

export function ShelfScene({
  cookbooks,
  onSelectCookbook,
  onAddCookbook,
  onOpenSettings,
  bottomInset = 0,
  isStale = false,
  onRefresh,
}: ShelfSceneProps) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const shelfTextMultiplier = fontScale >= 2 ? 1.35 : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeBook = activeIndex < cookbooks.length ? cookbooks[activeIndex] : undefined;
  const isEmptyShelf = cookbooks.length === 0;

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <NoshHorizontalLockup width={112} />
        {onOpenSettings ? (
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
        <Text variant="h1" style={styles.title} maxFontSizeMultiplier={shelfTextMultiplier}>My Cookbooks</Text>
        {isStale && onRefresh ? (
          <View style={styles.staleNotice}>
            <StaleDataNotice subject="cookbooks" onRefresh={onRefresh} />
          </View>
        ) : null}
      </View>

      <View style={styles.stage}>
        {/* Wall backdrop: subtle warm gradient with a faint horizon line
            where wall meets the shelf area, giving the shelf a sense of
            being mounted on a real wall rather than floating. */}
        <LinearGradient
          colors={[Colors.legacySurface.v63, Colors.legacySurface.v50, Colors.legacySurface.v48]}
          style={styles.wallBackdrop}
          pointerEvents="none"
        />
        {/* Wall shadow where the wall meets the shelf board — deeper now
            to ground the board on the wall */}
        <LinearGradient
          colors={[Colors.legacySurface.v61, Colors.legacySurface.v53, Colors.legacySurface.v56]}
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
              coverFinishId={book.coverFinishId}
              coverColorId={book.coverColorId}
              pageCount={book.pageCount}
              imageAsset={book.coverImageAsset}
              width={width}
              showShadow={false}
            />
          )}
          renderSpine={(book, spineWidth, height) => (
            <SpineFace
              title={book.title}
              binding={resolveCookbookBinding({
                finishId: book.coverFinishId,
                colorId: book.coverColorId,
                legacyStyleId: book.coverStyle,
              })}
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
            <Text variant="h3" style={styles.metaTitle} maxFontSizeMultiplier={shelfTextMultiplier}>
              A shelf waiting to be filled
            </Text>
          </>
        ) : activeBook ? (
          <>
            <Text variant="h3" style={styles.metaTitle} numberOfLines={1} maxFontSizeMultiplier={shelfTextMultiplier}>
              {activeBook.title}
            </Text>
            <Text variant="bodySmall" style={styles.metaSub} maxFontSizeMultiplier={shelfTextMultiplier}>
              {formatRecipeCount(activeBook.pageCount)}
            </Text>
          </>
        ) : (
          <>
            <Text variant="h3" style={styles.metaTitle} maxFontSizeMultiplier={shelfTextMultiplier}>New cookbook</Text>
            <Text variant="bodySmall" style={styles.metaSub} maxFontSizeMultiplier={shelfTextMultiplier}>
            </Text>
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
  heading: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  title: {
    color: Colors.text,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight24,
    fontFamily: Fonts.ui.regular,
  },
  staleNotice: {
    marginTop: Spacing.sm,
  },
  stage: {
    flex: 1,
    overflow: 'visible',
  },
  wallBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wallShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 32,
  },
  meta: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[4],
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
    textAlign: 'center',
  },
  metaSub: {
    color: Colors.textMuted,
    textAlign: 'center',
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
