import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Check, History, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react-native';
import { ThreadListPrimitive, useAui, useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
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
              <Text style={styles.itemMeta} numberOfLines={1}>{isRunning ? 'Nosh is still working' : isMain ? 'Current conversation' : 'Saved conversation'}</Text>
            </View>
          </Pressable>
          {!confirmingDelete ? <Pressable onPress={() => { setDraftTitle(title || 'New conversation'); setIsRenaming(true); }} style={styles.smallAction} accessibilityRole="button" accessibilityLabel={`Rename ${title || 'conversation'}`}><Pencil size={15} color={Colors.textMuted} /></Pressable> : null}
        </>
      )}
      {!isRenaming && confirmingDelete ? (
        <View style={styles.deleteConfirm}>
          <Pressable onPress={() => setConfirmingDelete(false)} disabled={isDeleting} style={styles.deleteCancel} accessibilityRole="button"><Text style={styles.deleteCancelText}>Keep</Text></Pressable>
          <Pressable onPress={() => void deleteThread()} disabled={isDeleting} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel="Delete conversation permanently"><Text style={styles.deleteText}>{isDeleting ? 'Deleting…' : 'Delete'}</Text></Pressable>
        </View>
      ) : !isRenaming ? (
        <Pressable onPress={() => setConfirmingDelete(true)} style={styles.deleteAction} accessibilityRole="button" accessibilityLabel={`Delete ${title || 'conversation'}`}><Trash2 size={16} color={Colors.textMuted} /></Pressable>
      ) : null}
    </View>
  );
}

export function NoshThreadHistory({ onNewConversation, onOpenConversation, onDeleteActive }: {
  onNewConversation: () => void;
  onOpenConversation: () => void;
  onDeleteActive: () => void;
}) {
  const threadCount = useAuiState((state) => state.threads.threadIds.length);
  const isLoading = useAuiState((state) => state.threads.isLoading);
  return (
    <View style={styles.panel}>
      <View style={styles.intro}>
        <View><Text style={styles.heading}>Your conversations</Text><Text style={styles.copy}>Saved privately on this device.</Text></View>
        <Pressable onPress={onNewConversation} style={styles.newButton} accessibilityRole="button" accessibilityLabel="Start a new conversation"><MessageSquarePlus size={17} color={Colors.onPrimary} /><Text style={styles.newText}>New</Text></Pressable>
      </View>
      {isLoading ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Opening your recipe journal…</Text></View>
      ) : threadCount === 0 ? (
        <View style={styles.empty}><History size={28} color={Colors.textMuted} /><Text style={styles.emptyTitle}>No saved conversations yet</Text><Text style={styles.emptyCopy}>Your first conversation will appear here after you send a message.</Text></View>
      ) : (
        <ThreadListPrimitive.Root style={styles.listRoot}><ThreadListPrimitive.Items contentContainerStyle={styles.listContent} renderItem={() => <HistoryItem onOpen={onOpenConversation} onDeleteActive={onDeleteActive} />} /></ThreadListPrimitive.Root>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 260, gap: Spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.ash, paddingBottom: Spacing.md },
  heading: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 19 },
  copy: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 12, marginTop: 2 },
  newButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radii.full, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md },
  newText: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: 13 },
  listRoot: { flex: 1 }, listContent: { gap: Spacing.sm, paddingBottom: Spacing.md },
  item: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white, padding: Spacing.xs },
  itemActive: { borderColor: Colors.charcoal, backgroundColor: Colors.parchment },
  itemMain: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm },
  mark: { width: 8, height: 28, borderRadius: 4, backgroundColor: Colors.ash }, markActive: { backgroundColor: Colors.butterscotch },
  itemText: { flex: 1, gap: 3 }, itemTitle: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 14 }, itemMeta: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: 11 },
  smallAction: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  renameEditor: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: Spacing.sm },
  renameInput: { flex: 1, minHeight: 44, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.charcoal, backgroundColor: Colors.white, color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 13, paddingHorizontal: Spacing.sm, paddingVertical: 7 },
  deleteConfirm: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
  deleteCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 7 }, deleteCancelText: { color: Colors.textMuted, fontFamily: Fonts.ui.medium, fontSize: 11 },
  deleteButton: { minHeight: 44, justifyContent: 'center', borderRadius: Radii.full, backgroundColor: Colors.error, paddingHorizontal: Spacing.sm }, deleteText: { color: Colors.onError, fontFamily: Fonts.ui.medium, fontSize: 11 },
  deleteAction: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.ash, backgroundColor: Colors.parchment, padding: Spacing.xl },
  emptyTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 16, textAlign: 'center' },
  emptyCopy: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 280 },
});
