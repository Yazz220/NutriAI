import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  SectionList,
  ScrollView
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Sparkles, RotateCcw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { ShoppingListItem as ShoppingListItemComponent } from '@/components/ShoppingListItem';
import { AddToListModal } from '@/components/AddToListModal';
import { ExpirationDateModal } from '@/components/ExpirationDateModal';
import { ShoppingListItem } from '@/types';

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
    clearRecentlyPurchased
  } = useShoppingList();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [expirationModalVisible, setExpirationModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
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
    setSelectedItem(item);
    setExpirationModalVisible(true);
  };

  const handleConfirmExpiration = (expirationDate: Date) => {
    if (selectedItem) {
      moveToInventory({
        name: selectedItem.name,
        quantity: selectedItem.quantity,
        unit: selectedItem.unit,
        category: selectedItem.category,
        expiryDate: expirationDate.toISOString(),
        addedDate: new Date().toISOString(),
      });
    }
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
          <TouchableOpacity 
            style={styles.smartListButton}
            onPress={handleGenerateSmartList}
            testID="generate-smart-list-button"
          >
            <Sparkles size={16} color={Colors.white} />
            <Text style={styles.smartListText}>Generate Smart List</Text>
          </TouchableOpacity>
          
          {shoppingList.some(item => item.checked) && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearCheckedItems}
              testID="clear-checked-items-button"
            >
              <Text style={styles.clearButtonText}>Clear Checked</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShoppingListItemComponent item={item} />
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
        
        {recentlyPurchased.length > 0 && (
          <View style={styles.recentlyPurchasedContainer}>
            <Text style={styles.recentlyPurchasedTitle}>Recently Purchased</Text>
            <ScrollView style={styles.recentlyPurchasedList}>
              {recentlyPurchased.map((item) => (
                <View key={item.id} style={styles.recentlyPurchasedItem}>
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