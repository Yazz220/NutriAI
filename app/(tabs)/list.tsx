import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SectionList,
  ScrollView
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Sparkles, RotateCcw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { ShoppingListItem as ShoppingListItemComponent } from '@/components/ShoppingListItem';
import { AddToListModal } from '@/components/AddToListModal';
import { ExpirationDateModal } from '@/components/ExpirationDateModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ShoppingListItem } from '@/types';
import { ExportShoppingModal } from '@/components/ExportShoppingModal';
import { useToast } from '@/contexts/ToastContext';

export default function ShoppingListScreen() {
  const { 
    shoppingList, 
    recentlyPurchased, 
    isLoading, 
    addItem, 
    getItemsByCategory,
    clearCheckedItems,
    generateSmartList,
    moveToInventory,
    toggleItemChecked,
    clearRecentlyPurchased
  } = useShoppingList();
  const { showToast } = useToast();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [expirationModalVisible, setExpirationModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [exportVisible, setExportVisible] = useState(false);

  if (isLoading) {
    return <LoadingSpinner text="Loading your shopping list..." />;
  }

  const itemsByCategory = getItemsByCategory();

  // Create sections for SectionList
  const sections = Object.entries(itemsByCategory)
    .filter(([_, items]) => items.length > 0)
    .map(([category, items]) => ({
      title: category,
      data: items
    }));

  const handleGenerateSmartList = () => {
    generateSmartList();
  };

  const handleToggleItem = (item: ShoppingListItem) => {
    if (!item.checked) {
      setSelectedItem(item);
      setExpirationModalVisible(true);
    } else {
      toggleItemChecked(item.id);
    }
  };



  const handleConfirmExpiration = (expirationDate: Date | null) => {
    if (selectedItem) {
      // Mark as purchased (checked) and move to inventory
      toggleItemChecked(selectedItem.id);
      const newId = moveToInventory({
        ...selectedItem,
        expiryDate: expirationDate ? expirationDate.toISOString() : undefined,
        addedDate: new Date().toISOString(),
      });
      showToast({
        message: `${selectedItem.name} moved to Inventory`,
        type: 'success',
        action: {
          label: 'Undo',
          onPress: () => {
            // Undo: remove from inventory and put back into recentlyPurchased
            // Note: Inventory store doesn't expose remove by id; simpler approach: add back to recently purchased list
            // For now, re-add to shopping list unchecked
            addItem({
              name: selectedItem.name,
              quantity: selectedItem.quantity,
              unit: selectedItem.unit,
              category: selectedItem.category,
              addedDate: selectedItem.addedDate,
              checked: false,
              addedBy: selectedItem.addedBy,
              mealId: selectedItem.mealId,
              plannedMealId: selectedItem.plannedMealId,
            });
          },
        },
      });
    }
    setExpirationModalVisible(false);
    setSelectedItem(null);
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Shopping List',
          headerRight: () => (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setAddModalVisible(true)}
              testID="add-to-shopping-list-button"
            >
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      
      <View style={styles.container}>
        <View style={styles.actionsContainer}>
          <Button
            title="Generate Smart List"
            onPress={handleGenerateSmartList}
            icon={<Sparkles size={16} color={Colors.white} />}
            size="sm"
            testID="generate-smart-list-button"
          />
          <View style={{ width: 12 }} />
          <Button
            title="Export / Share"
            onPress={() => setExportVisible(true)}
            variant="outline"
            size="sm"
            testID="export-shopping-list-button"
          />
          
          {shoppingList.some(item => item.checked) && (
            <Button
              title="Clear Checked"
              onPress={clearCheckedItems}
              variant="outline"
              size="sm"
              testID="clear-checked-items-button"
            />
          )}
        </View>
        
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShoppingListItemComponent 
              item={item} 
              onToggle={handleToggleItem} 
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your shopping list is empty</Text>
              <Text style={styles.emptySubtext}>
                Add items manually or generate a smart list based on your inventory
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity 
                  style={[styles.emptyButton, styles.emptySmartButton]}
                  onPress={handleGenerateSmartList}
                >
                  <Sparkles size={16} color={Colors.white} />
                  <Text style={styles.emptySmartButtonText}>Smart List</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.emptyButton, styles.emptyAddButton]}
                  onPress={() => setAddModalVisible(true)}
                >
                  <Plus size={16} color={Colors.white} />
                  <Text style={styles.emptyAddButtonText}>Add Items</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
        
        <AddToListModal 
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onAdd={(item) => addItem(item as Omit<ShoppingListItem, 'id'>)}
        />

        <ExportShoppingModal visible={exportVisible} onClose={() => setExportVisible(false)} />
        
        {recentlyPurchased.length > 0 && (
          <View style={styles.recentlyPurchasedContainer}>
            <Text style={styles.recentlyPurchasedTitle}>Recently Purchased</Text>
            <ScrollView style={styles.recentlyPurchasedList}>
              {recentlyPurchased.map((item) => (
                <View key={`recent-${item.id}`} style={styles.recentlyPurchasedItem}>
                  <Text style={[styles.recentlyPurchasedText, styles.checkedText]}>
                    {item.name} ({item.quantity} {item.unit})
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.clearRecentButton}
              onPress={clearRecentlyPurchased}
            >
              <Text style={styles.clearRecentButtonText}>Clear Recent</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <ExpirationDateModal
          visible={expirationModalVisible}
          onClose={() => setExpirationModalVisible(false)}
          onConfirm={handleConfirmExpiration}
          itemName={selectedItem?.name || ''}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  addButton: {
    padding: 8,
    marginRight: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  smartListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  smartListText: {
    color: Colors.white,
    fontWeight: '500',
    marginLeft: 8,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clearButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActions: {
    flexDirection: 'row',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  emptySmartButton: {
    backgroundColor: Colors.primary,
  },
  emptySmartButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyAddButton: {
    backgroundColor: Colors.primary,
  },
  emptyAddButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  recentlyPurchasedContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  recentlyPurchasedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  recentlyPurchasedList: {
    maxHeight: 200,
  },
  recentlyPurchasedItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 4,
  },
  recentlyPurchasedText: {
    fontSize: 14,
    color: Colors.lightText,
  },
  checkedText: {
    color: Colors.lightText,
    textDecorationLine: 'line-through',
  },
  clearRecentButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    alignSelf: 'center',
  },
  clearRecentButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
});