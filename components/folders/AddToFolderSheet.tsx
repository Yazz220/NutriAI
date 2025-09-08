import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';

interface AddToFolderSheetProps {
  visible: boolean;
  recipeId: string | null;
  onClose: () => void;
  onCreateNew?: () => void;
}

export const AddToFolderSheet: React.FC<AddToFolderSheetProps> = ({ visible, recipeId, onClose, onCreateNew }) => {
  const { folders, addRecipeToFolder, removeRecipeFromFolder, getFoldersForRecipe } = useRecipeFolders();

  useEffect(() => {
    if (visible) {
      console.log('Folders in AddToFolderSheet:', folders);
    }
  }, [visible, folders]);

  const assignedIds = recipeId ? new Set(getFoldersForRecipe(recipeId).map(f => f.id)) : new Set<string>();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPressOut={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.container}>
            <Text style={styles.title}>Add to Folder</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {folders.length === 0 ? (
                <Text style={styles.empty}>No folders yet. Create one to organize your recipes.</Text>
              ) : (
                folders.map((f) => {
                  const inFolder = recipeId ? assignedIds.has(f.id) : false;
                  return (
                    <View key={f.id} style={styles.row}>
                      <Text style={styles.name}>{f.name}</Text>
                      {inFolder ? (
                        <Button title="Remove" variant="secondary" onPress={() => recipeId && removeRecipeFromFolder(f.id, recipeId)} />
                      ) : (
                        <Button title="Add" onPress={() => recipeId && addRecipeToFolder(f.id, recipeId)} />
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity style={styles.newBtn} onPress={onCreateNew}>
                <Text style={styles.newBtnText}>+ New Folder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  name: { fontSize: 16, color: Colors.text },
  empty: { color: Colors.lightText, paddingVertical: 12, textAlign: 'center' },
  footer: { marginTop: Spacing.md, alignItems: 'center' },
  newBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  newBtnText: { color: Colors.primary, fontWeight: '600' },
});
