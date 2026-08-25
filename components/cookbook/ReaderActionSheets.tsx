import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BookOpen, ChevronLeft, Download, ExternalLink, FileDown, Pencil, RefreshCw, Share2, Trash2 } from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { getRecipeSourceUrl } from '@/utils/cookbook/readerActions';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

interface RecipeActionsSheetProps {
  visible: boolean;
  page: CookbookPage | null;
  cookbookId: string;
  cookbooks: Cookbook[];
  onClose: () => void;
  onVisitSource: (page: CookbookPage) => Promise<void> | void;
  onShare: (page: CookbookPage) => Promise<void> | void;
  onExport: (page: CookbookPage) => Promise<void> | void;
  onEdit?: (page: CookbookPage) => void;
  onRedesign?: (page: CookbookPage) => void;
  onMove?: (page: CookbookPage, destination: Cookbook) => Promise<void> | void;
  onRemove?: (page: CookbookPage) => Promise<void> | void;
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
}: RecipeActionsSheetProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'actions' | 'move'>('actions');
  const sourceUrl = page ? getRecipeSourceUrl(page) : null;
  const hasPageImage = Boolean(page?.imageUrl ?? page?.pageImage?.imageUrl);
  const destinations = cookbooks.filter((cookbook) => cookbook.id !== cookbookId);
  const canRevise = Boolean(page?.recipeGraph && (onEdit || onRedesign));
  const hasStandardActions = Boolean(canRevise || sourceUrl || hasPageImage || (onMove && destinations.length > 0));

  useEffect(() => {
    if (!visible) return;
    setPendingAction(null);
    setError(null);
    setView('actions');
  }, [visible]);

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
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {view === 'move' ? 'Choose a cookbook' : page.title}
            </Text>
          </View>
        </View>
      }
    >
      {view === 'actions' ? (
        <>
          {hasStandardActions ? <View style={styles.actionGroup}>
            {page.recipeGraph && onEdit ? (
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
            {page.recipeGraph && onRedesign ? (
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
            {sourceUrl ? (
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
                <ActionRow
                  icon={<Download size={19} color={Colors.text} />}
                  title="Export page image"
                  pending={pendingAction === 'export'}
                  disabled={Boolean(pendingAction)}
                  onPress={() => void runAction('export', () => onExport(page))}
                />
                <ActionRow
                  icon={<Share2 size={19} color={Colors.text} />}
                  title="Share recipe"
                  pending={pendingAction === 'share'}
                  disabled={Boolean(pendingAction)}
                  onPress={() => void runAction('share', () => onShare(page))}
                />
              </>
            ) : null}
            {onMove && destinations.length > 0 ? (
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
          </View> : null}
          {onRemove ? (
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
          <Text style={styles.destinationIntro} numberOfLines={2}>{page.title}</Text>
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
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    </Sheet>
  );
}

interface CookbookSettingsSheetProps {
  visible: boolean;
  cookbook: Cookbook | null;
  onClose: () => void;
  onSaveTitle: (title: string) => Promise<void> | void;
  onExport?: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

export function CookbookSettingsSheet({
  visible,
  cookbook,
  onClose,
  onSaveTitle,
  onExport,
  onDelete,
}: CookbookSettingsSheetProps) {
  const [title, setTitle] = useState(cookbook?.title ?? '');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(cookbook?.title ?? '');
    setSaving(false);
    setExporting(false);
    setError(null);
  }, [cookbook?.title, visible]);

  if (!cookbook) return null;

  const trimmedTitle = title.trim();
  const canSave = Boolean(trimmedTitle) && trimmedTitle !== cookbook.title && !saving;

  async function saveTitle() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveTitle(trimmedTitle);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The cookbook name could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function exportCookbook() {
    if (!onExport || exporting || saving) return;
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
      keyboardAvoiding
      closeAccessibilityLabel="Close cookbook settings"
      closeButtonStyle={styles.closeButton}
      header={
        <View style={styles.headerCopy}>
          <Text style={styles.sheetTitle}>Cookbook settings</Text>
        </View>
      }
    >
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Book name</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!saving}
          maxLength={48}
          returnKeyType="done"
          onSubmitEditing={() => void saveTitle()}
          accessibilityLabel="Book name"
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          !canSave && styles.disabledButton,
          pressed && canSave && styles.pressed,
        ]}
        disabled={!canSave}
        onPress={() => void saveTitle()}
        accessibilityRole="button"
        accessibilityLabel="Save cookbook name"
      >
        {saving ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Save changes</Text>
        )}
      </Pressable>
      {onExport ? (
        <View style={styles.actionGroup}>
          <ActionRow
            icon={<FileDown size={19} color={Colors.text} />}
            title="Export cookbook"
            pending={exporting}
            disabled={saving || exporting}
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
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight13,
    letterSpacing: Typography.metrics.letterSpacing11,
  },
  sheetTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlMd,
    lineHeight: Typography.metrics.lineHeight29,
  },
  actionGroup: {
    overflow: 'hidden',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
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
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
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
  field: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  input: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  saveButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
  },
  disabledButton: {
    opacity: 0.38,
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
    opacity: 0.72,
  },
});
