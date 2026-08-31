import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Ellipsis, Sparkles } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion, type AnimatedRef } from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import Sortable, { type SortableGridDragEndParams, type SortableGridRenderItem } from 'react-native-sortables';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { ContextActionMenu } from '@/components/ui/ContextActionMenu';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { COOKBOOK_GEOMETRY } from '@/constants/cookbookGeometry';
import { Radii, Shadows, Spacing, Typography } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import { buildCookbookPageGridItems, type CookbookPageGridItem } from '@/utils/cookbook/pageGrid';
import { getBeforePageId } from '@/utils/cookbook/pageOrder';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import { Fonts } from '@/utils/fonts';
import { flattenContextActions, type ContextActionGroup, type ContextActionId } from '@/utils/cookbook/contextActions';

interface CookbookPageGridProps {
  cookbookId: string;
  pageSlots: CookbookPage[];
  captures?: RecipeCapture[];
  onOpenPage?: (page: CookbookPage) => void;
  onPageActions?: (page: CookbookPage) => void;
  contextActionsFor?: (page: CookbookPage) => ContextActionGroup[];
  onContextAction?: (page: CookbookPage, actionId: ContextActionId) => void;
  onMovePage?: (input: { pageId: string; beforePageId: string | null }) => Promise<unknown> | void;
  scrollableRef?: AnimatedRef<Animated.ScrollView>;
  emptyTitle?: string;
  emptyDetail?: string;
  showPattern?: boolean;
  testID?: string;
}

const CUSTOM_ACTIONS = {
  earlier: 'moveEarlier',
  later: 'moveLater',
  actions: 'showActions',
} as const;

function DottedWorkspaceBackground() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="cookbook-grid-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <Circle cx="2" cy="2" r="0.8" fill="rgba(75, 72, 66, 0.22)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#cookbook-grid-dots)" />
    </Svg>
  );
}

function ProcessingPage({ item }: { item: CookbookPageGridItem }) {
  const needsAttention = item.phase === 'attention';
  return (
    <LinearGradient
      colors={
        needsAttention
          ? [Colors.errorDark, Colors.warmUmber]
          : [Colors.burnishedBronze, Colors.warmUmber, Colors.carbon]
      }
      style={styles.processingPage}
    >
      <View style={styles.processingGlow} />
      {needsAttention ? (
        <Sparkles size={20} color={Colors.white} />
      ) : (
        <ActivityIndicator size="small" color={Colors.white} />
      )}
      <Text style={styles.processingLabel} numberOfLines={2} maxFontSizeMultiplier={1.25}>
        {item.statusLabel ?? 'Designing page'}
      </Text>
      <Text style={styles.processingTitle} numberOfLines={3} maxFontSizeMultiplier={1.25}>
        {item.title}
      </Text>
    </LinearGradient>
  );
}

function PageThumbnail({ page }: { page: CookbookPage }) {
  const source = getCookbookPageImageSource(page);
  if (source !== null) {
    return (
      <Image
        source={typeof source === 'number' ? source : { uri: source }}
        style={styles.pageImage}
        resizeMode="contain"
        accessible={false}
      />
    );
  }

  return (
    <View importantForAccessibility="no-hide-descendants" style={styles.pageImage}>
      <PageCanvas page={page} bookMode />
    </View>
  );
}

export function CookbookPageGrid({
  cookbookId,
  pageSlots,
  captures,
  onOpenPage,
  onPageActions,
  contextActionsFor,
  onContextAction,
  onMovePage,
  scrollableRef,
  emptyTitle = 'Your cookbook pages will appear here.',
  emptyDetail = 'Add a recipe and watch the book assemble itself.',
  showPattern = true,
  testID,
}: CookbookPageGridProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const columns = width >= 720 ? 4 : width >= 520 ? 3 : 2;
  const items = useMemo(
    () => buildCookbookPageGridItems({ cookbookId, pageSlots, captures }),
    [captures, cookbookId, pageSlots],
  );
  const [orderedItems, setOrderedItems] = useState(items);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const commitOrder = useCallback(
    (nextItems: CookbookPageGridItem[], movedKey: string) => {
      setOrderedItems(nextItems);
      const movedItem = nextItems.find((item) => item.key === movedKey);
      if (!movedItem?.page || !movedItem.isDraggable || !onMovePage) return;
      const orderedPageIds = nextItems.flatMap((item) => (item.page ? [item.page.id] : []));
      void onMovePage({
        pageId: movedItem.page.id,
        beforePageId: getBeforePageId(orderedPageIds, movedItem.page.id),
      });
    },
    [onMovePage],
  );

  const moveAccessibly = useCallback(
    (item: CookbookPageGridItem, direction: -1 | 1) => {
      if (!item.page || !item.isDraggable || !onMovePage) return;
      const fromIndex = orderedItems.findIndex((candidate) => candidate.key === item.key);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= orderedItems.length) return;
      if (!orderedItems[toIndex].isDraggable) return;
      const nextItems = [...orderedItems];
      nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, item);
      commitOrder(nextItems, item.key);
    },
    [commitOrder, onMovePage, orderedItems],
  );

  const renderItem = useCallback<SortableGridRenderItem<CookbookPageGridItem>>(
    ({ item, index }) => {
      const canOpen = Boolean(item.page && item.phase === 'ready');
      const contextActions = item.page ? (contextActionsFor?.(item.page) ?? []) : [];
      const flatContextActions = flattenContextActions(contextActions);
      const canMoveEarlier = Boolean(
        onMovePage && item.isDraggable && index > 0 && orderedItems[index - 1]?.isDraggable,
      );
      const canMoveLater = Boolean(
        onMovePage && item.isDraggable && index < orderedItems.length - 1 && orderedItems[index + 1]?.isDraggable,
      );
      const actions = [
        { name: 'activate' as const, label: canOpen ? `Open ${item.title}` : `View status for ${item.title}` },
        ...(canMoveEarlier ? [{ name: CUSTOM_ACTIONS.earlier, label: 'Move page earlier' }] : []),
        ...(canMoveLater ? [{ name: CUSTOM_ACTIONS.later, label: 'Move page later' }] : []),
        ...flatContextActions.map((action) => ({ name: action.id, label: action.title })),
        ...(item.page && !contextActionsFor && flatContextActions.length === 0 && onPageActions
          ? [{ name: CUSTOM_ACTIONS.actions, label: 'Show page actions' }]
          : []),
      ];

      function handleAccessibilityAction(event: AccessibilityActionEvent) {
        const action = event.nativeEvent.actionName;
        if (action === 'activate' && canOpen && item.page) onOpenPage?.(item.page);
        if (action === CUSTOM_ACTIONS.earlier) moveAccessibly(item, -1);
        if (action === CUSTOM_ACTIONS.later) moveAccessibly(item, 1);
        if (action === CUSTOM_ACTIONS.actions && item.page) onPageActions?.(item.page);
        if (item.page && flatContextActions.some((contextAction) => contextAction.id === action)) {
          onContextAction?.(item.page, action as ContextActionId);
        }
      }

      return (
        <Sortable.Handle
          mode={onMovePage ? (item.isDraggable ? 'draggable' : 'fixed-order') : 'non-draggable'}
          style={styles.sortableHandle}
        >
          <View style={styles.tile}>
            <Pressable
              style={({ pressed }) => [styles.pagePressable, pressed && canOpen && styles.pagePressed]}
              onPress={() => {
                if (canOpen && item.page) onOpenPage?.(item.page);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.statusLabel ?? `Page ${index + 1}`}.`}
              accessibilityHint={canOpen ? 'Double tap to open. Long press and drag to reorder.' : undefined}
              accessibilityActions={actions}
              onAccessibilityAction={handleAccessibilityAction}
            >
              <View style={styles.pageFrame}>
                {canOpen && item.page ? (
                  <Animated.View
                    key={`ready:${item.key}`}
                    entering={reduceMotion ? undefined : FadeIn.duration(180)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(120)}
                    style={StyleSheet.absoluteFill}
                  >
                    <PageThumbnail page={item.page} />
                  </Animated.View>
                ) : (
                  <ProcessingPage item={item} />
                )}
              </View>
            </Pressable>

            <View style={styles.tileFooter}>
              <Text style={styles.pageNumber} maxFontSizeMultiplier={1.2}>
                {index + 1}
              </Text>
              <Text style={styles.pageTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {item.title}
              </Text>
              {item.page && contextActions.length > 0 && onContextAction ? (
                <ContextActionMenu
                  actions={contextActions}
                  onSelect={(actionId) => onContextAction(item.page!, actionId)}
                  fallbackOnPress={onPageActions ? () => onPageActions(item.page!) : undefined}
                  accessibilityLabel={`Actions for ${item.title}`}
                  style={styles.moreButton}
                  title={item.title}
                  testID={`page-context-menu-${item.page.id}`}
                >
                  <Ellipsis size={18} color={Colors.textSecondary} />
                </ContextActionMenu>
              ) : item.page && !contextActionsFor && onPageActions ? (
                <Pressable
                  style={({ pressed }) => [styles.moreButton, pressed && styles.moreButtonPressed]}
                  onPress={() => onPageActions(item.page!)}
                  accessibilityRole="button"
                  accessibilityLabel={`Actions for ${item.title}`}
                >
                  <Ellipsis size={18} color={Colors.textSecondary} />
                </Pressable>
              ) : (
                <View style={styles.moreButton} />
              )}
            </View>
          </View>
        </Sortable.Handle>
      );
    },
    [
      contextActionsFor,
      moveAccessibly,
      onContextAction,
      onMovePage,
      onOpenPage,
      onPageActions,
      orderedItems,
      reduceMotion,
    ],
  );

  if (orderedItems.length === 0) {
    return (
      <View style={styles.workspace} testID={testID}>
        {showPattern ? <DottedWorkspaceBackground /> : null}
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <BookOpen size={21} color={Colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          {emptyDetail ? <Text style={styles.emptyDetail}>{emptyDetail}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.workspace} testID={testID}>
      {showPattern ? <DottedWorkspaceBackground /> : null}
      <Sortable.Grid
        data={orderedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        columns={columns}
        rowGap={Spacing.lg}
        columnGap={Spacing.md}
        strategy="insert"
        customHandle
        sortEnabled={Boolean(onMovePage)}
        dragActivationDelay={260}
        activationAnimationDuration={reduceMotion ? 0 : 160}
        dropAnimationDuration={reduceMotion ? 0 : 190}
        activeItemScale={reduceMotion ? 1 : 1.025}
        inactiveItemOpacity={reduceMotion ? 1 : 0.72}
        hapticsEnabled={Boolean(onMovePage)}
        showDropIndicator={Boolean(onMovePage)}
        dropIndicatorStyle={styles.dropIndicator}
        scrollableRef={scrollableRef}
        autoScrollEnabled={Boolean(scrollableRef)}
        onDragEnd={(params: SortableGridDragEndParams<CookbookPageGridItem>) => {
          if (params.fromIndex === params.toIndex) return;
          commitOrder(params.data, params.key);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(251, 250, 246, 0.78)',
    padding: Spacing.lg,
    minHeight: 260,
  },
  sortableHandle: { flex: 1 },
  tile: { flex: 1, gap: Spacing.sm },
  pagePressable: { flex: 1 },
  pagePressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  pageFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: COOKBOOK_GEOMETRY.page.aspectRatio,
    overflow: 'hidden',
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.alabaster,
    boxShadow: Shadows.md.boxShadow,
  },
  pageImage: { width: '100%', height: '100%' },
  processingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  processingGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(232, 170, 66, 0.12)',
  },
  processingLabel: {
    color: Colors.white,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  processingTitle: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: Fonts.display.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight16,
    textAlign: 'center',
  },
  tileFooter: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pageNumber: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.sm,
    minWidth: 18,
  },
  pageTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonPressed: { backgroundColor: Colors.surfaceMuted, transform: [{ scale: 0.96 }] },
  dropIndicator: {
    backgroundColor: 'rgba(232, 170, 66, 0.12)',
    borderColor: Colors.accent,
    borderRadius: Radii.sm,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  emptyState: {
    flex: 1,
    minHeight: 226,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
  },
  emptyDetail: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
    maxWidth: 280,
  },
});
