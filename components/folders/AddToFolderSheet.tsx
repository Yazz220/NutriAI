import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Modal } from '@/components/ui/Modal';
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

  const assignedIds = recipeId ? new Set(getFoldersForRecipe(recipeId).map(f => f.id)) : new Set<string>();

  return (
    <Modal visible={visible} onClose={onClose} title="Add to Folder">
      <View style={styles.container}>
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[200] || '#e5e7eb',
  },
  name: { fontSize: 16, color: Colors.text },
  empty: { color: Colors.lightText, paddingVertical: 12 },
  footer: { marginTop: Spacing.md, alignItems: 'flex-end' },
  newBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  newBtnText: { color: Colors.primary, fontWeight: '600' },
});
