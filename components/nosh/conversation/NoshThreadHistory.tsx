import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Check, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react-native';
import { ThreadListPrimitive, useAui, useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

function HistoryItem({ onOpen, onDeleteActive }: { onOpen: () => void; onDeleteActive: () => void }) {
  const aui = useAui();
  const itemId = useAuiState((state) => state.threadListItem.id);
  const title = useAuiState((state) => state.threadListItem.title);
  const isRunning = useAuiState((state) => state.threadListItem.isRunning);
  const mainThreadId = useAuiState((state) => state.threads.mainThreadId);
  const isMain = mainThreadId === itemId;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showingActions, setShowingActions] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title || 'New conversation');

  async function openThread() {
    await aui.threadListItem.switchTo();
    onOpen();
  }

  async function deleteThread() {
    setIsDeleting(true);
    try {
      if (isMain) onDeleteActive();
      await aui.threadListItem.delete();
    } catch (error) {
      Alert.alert('Could not delete conversation', error instanceof Error ? error.message : 'Please try again.');
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  }

  async function saveTitle() {
    const nextTitle = draftTitle.trim().slice(0, 60);
    if (!nextTitle) return;
    try {
      await aui.threadListItem.rename(nextTitle);
      setIsRenaming(false);
    } catch (error) {
      Alert.alert('Could not rename conversation', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <View style={[styles.item, isMain && styles.itemActive]}>
      {isRenaming ? (
        <View style={styles.renameEditor}>
          <TextInput value={draftTitle} onChangeText={setDraftTitle} onSubmitEditing={() => void saveTitle()} autoFocus selectTextOnFocus maxLength={60} style={styles.renameInput} accessibilityLabel="Conversation title" />
          <Pressable onPress={() => void saveTitle()} style={styles.smallAction} accessibilityRole="button" accessibilityLabel="Save conversation title"><Check size={16} color={Colors.success} /></Pressable>
          <Pressable onPress={() => { setDraftTitle(title || 'New conversation'); setIsRenaming(false); }} style={styles.smallAction} accessibilityRole="button" accessibilityLabel="Cancel renaming conversation"><X size={16} color={Colors.textMuted} /></Pressable>
        </View>
      ) : (
        <>
          <Pressable onPress={() => void openThread()} style={styles.itemMain} accessibilityRole="button" accessibilityLabel={`Open ${title || 'conversation'}`}>
            <View style={[styles.mark, isMain && styles.markActive]} />
            <View style={styles.itemText}>
              <Text style={styles.itemTitle} numberOfLines={1}>{title || 'New conversation'}</Text>
              {isRunning ? <Text style={styles.itemMeta}>Working</Text> : null}
            </View>
          </Pressable>
          {!confirmingDelete && showingActions ? (
            <>
              <Pressable onPress={() => { setDraftTitle(title || 'New conversation'); setIsRenaming(true); setShowingActions(false); }} style={styles.smallAction} accessibilityRole="button" accessibilityLabel={`Rename ${title || 'conversation'}`}><Pencil size={15} color={Colors.textMuted} /></Pressable>
              <Pressable onPress={() => { setConfirmingDelete(true); setShowingActions(false); }} style={styles.smallAction} accessibilityRole="button" accessibilityLabel={`Delete ${title || 'conversation'}`}><Trash2 size={16} color={Colors.textMuted} /></Pressable>
            </>
          ) : null}
        </>
      )}
      {!isRenaming && confirmingDelete ? (
        <View style={styles.deleteConfirm}>
          <Pressable onPress={() => setConfirmingDelete(false)} disabled={isDeleting} style={styles.deleteCancel} accessibilityRole="button"><Text style={styles.deleteCancelText}>Keep</Text></Pressable>
          <Pressable onPress={() => void deleteThread()} disabled={isDeleting} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel="Delete conversation permanently"><Text style={styles.deleteText}>{isDeleting ? 'Deleting…' : 'Delete'}</Text></Pressable>
        </View>
      ) : !isRenaming ? (
        <Pressable onPress={() => setShowingActions((current) => !current)} style={styles.smallAction} accessibilityRole="button" accessibilityLabel={`More actions for ${title || 'conversation'}`}><MoreHorizontal size={18} color={Colors.textMuted} /></Pressable>
      ) : null}
    </View>
  );
}

export function NoshThreadHistory({ onOpenConversation, onDeleteActive }: {
  onOpenConversation: () => void;
  onDeleteActive: () => void;
}) {
  const threadCount = useAuiState((state) => state.threads.threadIds.length);
  const isLoading = useAuiState((state) => state.threads.isLoading);
  return (
    <View style={styles.panel}>
      {isLoading ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Opening conversations…</Text></View>
      ) : threadCount === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No conversations yet</Text></View>
      ) : (
        <ThreadListPrimitive.Root style={styles.listRoot}><ThreadListPrimitive.Items contentContainerStyle={styles.listContent} renderItem={() => <HistoryItem onOpen={onOpenConversation} onDeleteActive={onDeleteActive} />} /></ThreadListPrimitive.Root>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, width: '100%', maxWidth: 760, minHeight: 260, alignSelf: 'center' },
  listRoot: { flex: 1 },
  listContent: { paddingBottom: Spacing.md },
  item: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: Spacing.values[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider, paddingVertical: Spacing.xs },
  itemActive: { backgroundColor: Colors.parchment },
  itemMain: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm },
  mark: { width: 6, height: 6, borderRadius: Radii.full, backgroundColor: 'transparent' }, markActive: { backgroundColor: Colors.primary },
  itemText: { flex: 1, gap: Spacing.values[3] }, itemTitle: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, }, itemMeta: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  smallAction: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  renameEditor: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: Spacing.values[2], paddingLeft: Spacing.sm },
  renameInput: { flex: 1, minHeight: 44, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.charcoal, backgroundColor: Colors.white, color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.values[7] },
  deleteConfirm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[4], paddingRight: Spacing.values[4] },
  deleteCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.values[7] }, deleteCancelText: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  deleteButton: { minHeight: 44, justifyContent: 'center', borderRadius: Radii.full, backgroundColor: Colors.error, paddingHorizontal: Spacing.sm }, deleteText: { color: Colors.onError, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  empty: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyTitle: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, textAlign: 'center' },
});
