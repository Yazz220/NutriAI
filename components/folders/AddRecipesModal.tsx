import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { BookOpen, Check } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Meal } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface AddRecipesModalProps {
  visible: boolean;
  folderId: string;
  folderName: string;
  availableRecipes: Meal[];
  existingRecipeIds: string[];
  onClose: () => void;
  onAddRecipes: (recipeIds: string[]) => void;
}

export const AddRecipesModal: React.FC<AddRecipesModalProps> = ({
  visible,
  folderId,
  folderName,
  availableRecipes,
  existingRecipeIds,
  onClose,
  onAddRecipes,
}) => {
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter out recipes that are already in the folder
  const selectableRecipes = useMemo(() => {
    return availableRecipes.filter(recipe => !existingRecipeIds.includes(recipe.id));
  }, [availableRecipes, existingRecipeIds]);

  const toggleSelection = (recipeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleAddRecipes = () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one recipe to add.');
      return;
    }

    const recipeIds = Array.from(selectedIds);
    onAddRecipes(recipeIds);

    const count = recipeIds.length;
    showToast({
      message: `Added ${count} recipe${count > 1 ? 's' : ''} to "${folderName}"`,
      type: 'success',
      duration: 2000,
    });

    setSelectedIds(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const renderRecipeItem = ({ item, index }: { item: Meal; index: number }) => {
    const isSelected = selectedIds.has(item.id);
    const isLeft = index % 2 === 0;

    return (
      <View style={[styles.recipeItem, { marginRight: isLeft ? Spacing.md : 0 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleSelection(item.id)}
          style={[
            styles.recipeCard,
            isSelected && styles.recipeCardSelected
          ]}
        >
          <View style={styles.imageContainer}>
            {item.image ? (
              <Image source={{ uri: String(item.image) }} style={styles.recipeImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <BookOpen size={32} color={Colors.lightText} />
              </View>
            )}
            {isSelected && (
              <View style={styles.checkOverlay}>
                <View style={styles.checkCircle}>
                  <Check size={16} color={Colors.white} />
                </View>
              </View>
            )}
          </View>
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.recipeMeta}>
              {item.ingredients?.length || 0} ingredients
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Add Recipes to Collection"
      size="lg"
      scrollable={true}
      hasHeader={true}
    >
      <View style={styles.container}>
        {selectableRecipes.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color={Colors.lightText} />
            <Text style={styles.emptyText}>
              {existingRecipeIds.length > 0
                ? 'All your recipes are already in this folder!'
                : 'No recipes available'}
            </Text>
            <Text style={styles.emptySubtext}>
              {existingRecipeIds.length > 0
                ? 'Import more recipes to add them to this folder.'
                : 'Add some recipes first, then you can organize them into folders.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.instruction}>
              Select recipes to add to "{folderName}":
            </Text>

            <FlatList
              data={selectableRecipes}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              renderItem={renderRecipeItem}
            />

            <View style={styles.footer}>
              <Text style={styles.selectionCount}>
                {selectedIds.size} selected
              </Text>
              <View style={styles.footerButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={handleClose}
                  style={{ marginRight: Spacing.sm }}
                />
                <Button
                  title={`Add ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
                  onPress={handleAddRecipes}
                  disabled={selectedIds.size === 0}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  instruction: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  gridContainer: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  recipeItem: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  recipeCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  recipeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: Colors.secondary,
    aspectRatio: 1,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  checkOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    padding: Spacing.sm,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  recipeMeta: {
    fontSize: 13,
    color: Colors.lightText,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  selectionCount: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: '500',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AddRecipesModal;