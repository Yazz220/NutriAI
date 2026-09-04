import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  BookOpen,
  ChevronLeft,
  Download,
  ExternalLink,
  FileDown,
  Flag,
  Palette,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import { getRecipeSourceUrl } from '@/utils/cookbook/readerActions';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

interface RecipeActionsSheetProps {
  visible: boolean;
  page: CookbookPage | null;
  cookbookId: string;
  cookbooks: Cookbook[];
  onClose: () => void;
  onVisitSource?: (page: CookbookPage) => Promise<void> | void;
  onShare?: (page: CookbookPage) => Promise<void> | void;
  onExport?: (page: CookbookPage) => Promise<void> | void;
  onEdit?: (page: CookbookPage) => void;
  onRedesign?: (page: CookbookPage) => void;
  onMove?: (page: CookbookPage, destination: Cookbook) => Promise<void> | void;
  onRemove?: (page: CookbookPage) => Promise<void> | void;
  onReport?: (page: CookbookPage) => void;
  readOnly?: boolean;
  initialView?: 'actions' | 'move';
}

export function RecipeActionsSheet({
  visible,
  page,
  cookbookId,
  cookbooks,
  onClose,
  onVisitSource,
  onShare,
  onExport,
  onEdit,
  onRedesign,
  onMove,
  onRemove,
  onReport,
  readOnly = false,
  initialView = 'actions',
}: RecipeActionsSheetProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'actions' | 'move'>(initialView);
  const sourceUrl = page ? getRecipeSourceUrl(page) : null;
  const hasPageImage = getCookbookPageImageSource(page) !== null;
  const destinations = cookbooks.filter((cookbook) => cookbook.id !== cookbookId);
  const canRevise = Boolean(!readOnly && page?.recipeGraph && (onEdit || onRedesign));
  const canMove = Boolean(!readOnly && onMove && destinations.length > 0);
  const hasStandardActions = Boolean(
    canRevise || (sourceUrl && onVisitSource) || (hasPageImage && (onExport || onShare)) || canMove || onReport,
  );

  useEffect(() => {
    if (!visible) return;
    setPendingAction(null);
    setError(null);
    setView(initialView);
  }, [initialView, visible]);

  if (!page) return null;

  async function runAction(key: string, action: () => Promise<void> | void) {
    if (pendingAction) return;
    setError(null);
    setPendingAction(key);
    try {
      await action();
      onClose();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'This action could not be completed.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      closeAccessibilityLabel="Close recipe actions"
      closeButtonStyle={styles.closeButton}
      maxHeight="82%"
      header={
        <View style={styles.sheetHeader}>
          {view === 'move' ? (
            <Pressable
              style={styles.headerBack}
              onPress={() => {
                setError(null);
                setView('actions');
              }}
              accessibilityRole="button"
              accessibilityLabel="Back to recipe actions"
            >
              <ChevronLeft size={20} color={Colors.text} />
            </Pressable>
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.15}>
              {view === 'move' ? 'MOVE RECIPE' : 'RECIPE ACTIONS'}
            </Text>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {view === 'move' ? 'Choose a cookbook' : page.title}
            </Text>
          </View>
        </View>
      }
    >
      {view === 'actions' ? (
        <>
          {hasStandardActions ? (
            <View style={styles.actionGroup}>
              {!readOnly && page.recipeGraph && onEdit ? (
                <ActionRow
                  icon={<Pencil size={19} color={Colors.text} />}
                  title="Edit recipe"
                  pending={false}
                  disabled={Boolean(pendingAction)}
                  onPress={() => {
                    onClose();
                    onEdit(page);
                  }}
                />
              ) : null}
              {!readOnly && page.recipeGraph && onRedesign ? (
                <ActionRow
                  icon={<RefreshCw size={19} color={Colors.text} />}
                  title="Try another design"
                  pending={false}
                  disabled={Boolean(pendingAction)}
                  onPress={() => {
                    onClose();
                    onRedesign(page);
                  }}
                />
              ) : null}
              {sourceUrl && onVisitSource ? (
                <ActionRow
                  icon={<ExternalLink size={19} color={Colors.text} />}
                  title="Visit original source"
                  pending={pendingAction === 'source'}
                  disabled={Boolean(pendingAction)}
                  onPress={() => void runAction('source', () => onVisitSource(page))}
                />
              ) : null}
              {hasPageImage ? (
                <>
                  {onExport ? (
                    <ActionRow
                      icon={<Download size={19} color={Colors.text} />}
                      title="Save page image"
                      pending={pendingAction === 'export'}
                      disabled={Boolean(pendingAction)}
                      onPress={() => void runAction('export', () => onExport(page))}
                    />
                  ) : null}
                  {onShare ? (
                    <ActionRow
                      icon={<Share2 size={19} color={Colors.text} />}
                      title="Share recipe"
                      pending={pendingAction === 'share'}
                      disabled={Boolean(pendingAction)}
                      onPress={() => void runAction('share', () => onShare(page))}
                    />
                  ) : null}
                </>
              ) : null}
              {canMove ? (
                <ActionRow
                  icon={<BookOpen size={19} color={Colors.text} />}
                  title="Move to another cookbook"
                  pending={false}
                  disabled={Boolean(pendingAction)}
                  onPress={() => {
                    setError(null);
                    setView('move');
                  }}
                />
              ) : null}
              {onReport ? (
                <ActionRow
                  icon={<Flag size={19} color={Colors.text} />}
                  title="Report issue or content"
                  pending={false}
                  disabled={Boolean(pendingAction)}
                  onPress={() => {
                    onClose();
                    onReport(page);
                  }}
                />
              ) : null}
            </View>
          ) : null}
          {!readOnly && onRemove ? (
            <View style={styles.recipeDangerSection}>
              <Pressable
                style={({ pressed }) => [styles.removeRecipeButton, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  void onRemove(page);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${page.title} from this cookbook`}
              >
                <Trash2 size={18} color={Colors.error} />
                <Text style={styles.deleteButtonText}>Remove from cookbook</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.destinationList} showsVerticalScrollIndicator={false}>
          <Text style={styles.destinationIntro} numberOfLines={2}>
            {page.title}
          </Text>
          <View style={styles.actionGroup}>
            {destinations.map((destination) => {
              const actionKey = `move:${destination.id}`;
              return (
                <ActionRow
                  key={destination.id}
                  icon={<BookOpen size={19} color={Colors.text} />}
                  title={destination.title}
                  pending={pendingAction === actionKey}
                  disabled={Boolean(pendingAction)}
                  onPress={() => void runAction(actionKey, () => onMove?.(page, destination))}
                />
              );
            })}
          </View>
        </ScrollView>
      )}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

interface CookbookSettingsSheetProps {
  visible: boolean;
  cookbook: Cookbook | null;
  onClose: () => void;
  onCustomize: () => void;
  onExport?: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

export function CookbookSettingsSheet({
  visible,
  cookbook,
  onClose,
  onCustomize,
  onExport,
  onDelete,
}: CookbookSettingsSheetProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setExporting(false);
    setError(null);
  }, [visible]);

  if (!cookbook) return null;

  async function exportCookbook() {
    if (!onExport || exporting) return;
    setExporting(true);
    setError(null);
    try {
      await onExport();
      onClose();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'The cookbook could not be exported.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      closeAccessibilityLabel="Close cookbook settings"
      closeButtonStyle={styles.closeButton}
      header={
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.15}>
            COOKBOOK
          </Text>
          <Text style={styles.sheetTitle}>Cookbook settings</Text>
        </View>
      }
    >
      <View style={styles.actionGroup}>
        <ActionRow
          icon={<Palette size={19} color={Colors.text} />}
          title="Customize cookbook"
          pending={false}
          disabled={exporting}
          onPress={() => {
            onClose();
            onCustomize();
          }}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {onExport ? (
        <View style={styles.actionGroup}>
          <ActionRow
            icon={<FileDown size={19} color={Colors.text} />}
            title="Download cookbook PDF"
            pending={exporting}
            disabled={exporting}
            onPress={() => void exportCookbook()}
          />
        </View>
      ) : null}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerHeading}>Remove book</Text>
        <Text style={styles.dangerCopy}>This permanently deletes the cookbook and all of its recipe pages.</Text>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          onPress={() => {
            onClose();
            void onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${cookbook.title}`}
        >
          <Trash2 size={18} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Delete cookbook</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function ActionRow({
  icon,
  title,
  pending,
  disabled,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && !disabled && styles.pressed]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.actionIcon}>{pending ? <ActivityIndicator color={Colors.text} /> : icon}</View>
      <Text style={styles.actionTitle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 44,
    height: 44,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.values[2],
  },
  sheetHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight12,
    letterSpacing: Typography.metrics.letterSpacing14,
  },
  sheetTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlMd,
    lineHeight: Typography.metrics.lineHeight29,
  },
  actionGroup: {
    overflow: 'hidden',
  },
  destinationList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  destinationIntro: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: Spacing.values[2],
  },
  actionTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight19,
  },
  actionDescription: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
  },
  dangerSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recipeDangerSection: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dangerHeading: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  dangerCopy: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight17,
  },
  deleteButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  deleteButtonText: {
    color: Colors.error,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
  },
  removeRecipeButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
  },
  error: {
    color: Colors.error,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
