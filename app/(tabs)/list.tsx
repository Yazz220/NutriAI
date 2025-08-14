import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SectionList,
  ScrollView,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Sparkles, RotateCcw, ShoppingCart, CheckCircle, Clock } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
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

  // Calculate stats
  const totalItems = shoppingList.length;
  const checkedItems = shoppingList.filter(item => item.checked).length;
  const uncheckedItems = totalItems - checkedItems;

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <View style={styles.container}>
        {/* Enhanced Hero Header */}
        <ExpoLinearGradient
          colors={[Colors.background, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.statusBarSpacer} />
          
          {/* Header */}
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              <ShoppingCart size={28} color={Colors.white} />
              <Text style={styles.heroTitle}>Shopping List</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
              <Plus size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.shoppingStats}>
            <StatCard 
              icon={<ShoppingCart size={20} color={Colors.primary} />} 
              label="Total Items" 
              value={totalItems.toString()} 
            />
            <StatCard 
              icon={<CheckCircle size={20} color={Colors.primary} />} 
              label="Completed" 
              value={checkedItems.toString()} 
            />
            <StatCard 
              icon={<Clock size={20} color={Colors.error} />} 
              label="Remaining" 
              value={uncheckedItems.toString()} 
            />
          </View>
        </ExpoLinearGradient>

        {/* Enhanced Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.smartListButton} onPress={handleGenerateSmartList}>
            <Sparkles size={18} color={Colors.white} />
            <Text style={styles.smartListText}>Smart List</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportButton} onPress={() => setExportVisible(true)}>
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
          
          {shoppingList.some(item => item.checked) && (
            <TouchableOpacity style={styles.clearButton} onPress={clearCheckedItems}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
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

// Enhanced Component Definitions
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    minHeight: 260,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shoppingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  smartListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  smartListText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  exportButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.error,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 16,
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