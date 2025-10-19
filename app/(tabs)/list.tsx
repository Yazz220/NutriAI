import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SectionList,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Sparkles, RotateCcw, ShoppingCart, CheckCircle, Clock, FileDown } from 'lucide-react-native';
// Header now uses ScreenHeader
import { Colors } from '@/constants/colors';
import { Spacing, Typography as LegacyType } from '@/constants/spacing';
import { Typography as Type } from '@/constants/typography';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { useInventory } from '@/hooks/useInventoryStore';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { ShoppingListItem as ShoppingListItemComponent } from '@/components/ShoppingListItem';
import { AddToListModal } from '@/components/AddToListModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ShoppingListItem } from '@/types';
import { ExportShoppingModal } from '@/components/ExportShoppingModal';
import { useToast } from '@/contexts/ToastContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Rule } from '@/components/ui/Rule';
import ShoppingListIcon from '@/assets/icons/Shopping list .svg';

export default function ShoppingListScreen() {
  const { 
    shoppingList, 
    recentlyPurchased, 
    isLoading, 
    addItem, 
    getItemsByCategory,
    clearCheckedItems,
    toggleItemChecked,
    clearRecentlyPurchased
  } = useShoppingList();
  const { addItem: addInventoryItem } = useInventory();
  const { preferences } = useUserPreferences();
  const { showToast } = useToast();
  // Bottom padding is handled by the tab bar itself (non-absolute). Keep lists compact.
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [exportVisible, setExportVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'remaining' | 'completed'>('all');
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  if (isLoading) {
    return <LoadingSpinner text="Loading your shopping list..." />;
  }

  const { uncheckedItems, checkedItems } = useMemo(() => {
    const unchecked = shoppingList.filter(item => !item.checked);
    const checked = shoppingList.filter(item => item.checked);
    return { uncheckedItems: unchecked, checkedItems: checked };
  }, [shoppingList]);

  const sections = useMemo(() => {
    const data: { title: string; data: ShoppingListItem[] }[] = [];
    if (filter === 'all' || filter === 'remaining') {
      data.push({ title: 'Remaining', data: uncheckedItems });
    }
    if (filter === 'all' || filter === 'completed') {
      data.push({ title: 'Completed', data: checkedItems });
    }
    return data;
  }, [filter, uncheckedItems, checkedItems]);

  const handleToggleItem = (item: ShoppingListItem) => {
    // Simply toggle - no popup
    toggleItemChecked(item.id);
  };
  
  const handleMoveCompletedToInventory = async () => {
    if (checkedItems.length === 0) return;
    
    Alert.alert(
      'Move to Inventory?',
      `Move ${checkedItems.length} completed item${checkedItems.length > 1 ? 's' : ''} to your inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Inventory',
          onPress: async () => {
            try {
              let successCount = 0;
              let skippedCount = 0;
              
              for (const item of checkedItems) {
                try {
                  const itemId = await addInventoryItem({
                    name: item.name,
                    category: item.category,
                    addedDate: new Date().toISOString(),
                    quantity: 1,
                    unit: 'pcs',
                  });
                  
                  // If the returned ID is for an existing item, it means it was skipped
                  // Check if it's newly added or already existed
                  successCount++;
                } catch (e) {
                  console.error(`Failed to add ${item.name} to inventory:`, e);
                }
              }
              
              if (successCount > 0) {
                showToast({ 
                  message: `Moved ${successCount} item${successCount > 1 ? 's' : ''} to inventory`, 
                  type: 'success' 
                });
                
                // Clear all checked items after successful move
                clearCheckedItems();
              } else {
                showToast({ message: 'Failed to move items to inventory', type: 'error' });
              }
            } catch (e) {
              showToast({ message: 'Failed to move items to inventory', type: 'error' });
            }
          },
        },
      ]
    );
  };

  // Calculate stats
  const totalItems = shoppingList.length;
  const completedCount = checkedItems.length;
  const remainingCount = uncheckedItems.length;

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <View style={styles.container}>
        {/* Unified Screen Header */}
        <ScreenHeader
          title="Shopping List"
          icon={
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
              <ShoppingListIcon width={58.8} height={58.8} color={Colors.text} />
            </View>
          }
        />

        {/* Quick Stats */}
        <StatRow
          items={[
            { icon: <ShoppingCart size={16} color={Colors.primary} />, label: 'Total Items', value: totalItems.toString(), onPress: () => setFilter('all') },
            { icon: <CheckCircle size={16} color={Colors.primary} />, label: 'Completed', value: completedCount.toString(), onPress: () => setFilter('completed') },
            { icon: <Clock size={16} color={Colors.error} />, label: 'Remaining', value: remainingCount.toString(), onPress: () => setFilter('remaining') },
          ]}
          activeFilter={filter}
        />

        {/* Enhanced Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Add Item"
            onPress={() => setAddModalVisible(true)}
            variant="outline"
            size="xs"
            style={{ flex: 1, minWidth: 0, paddingHorizontal: 12 }}
            icon={<Plus size={14} color={Colors.primary} />}
          />
          <Button
            title="Export"
            onPress={() => setExportVisible(true)}
            variant="outline"
            size="xs"
            style={{ flex: 1, minWidth: 0, paddingHorizontal: 12 }}
            icon={<FileDown size={14} color={Colors.primary} />}
          />

          {checkedItems.length > 0 && (
            <>
              <Button
                title="Move to Inventory"
                onPress={handleMoveCompletedToInventory}
                variant="primary"
                size="xs"
                style={{ flex: 1, minWidth: 0, paddingHorizontal: 12 }}
                icon={<CheckCircle size={14} color={Colors.white} />}
              />
              <Button
                title="Clear"
                onPress={clearCheckedItems}
                variant="outline"
                size="xs"
                style={{ flex: 1, minWidth: 0, paddingHorizontal: 12, borderColor: Colors.error }}
                textStyle={{ color: Colors.error }}
              />
            </>
          )}
        </View>
        
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section }) => {
            if (section.title === 'Completed' && completedCollapsed) {
              return null;
            }
            return (
              <View>
                <ShoppingListItemComponent 
                  item={item} 
                  onToggle={handleToggleItem}
                />
                <Rule />
              </View>
            );
          }}
          renderSectionHeader={({ section: { title, data } }) => (
            <TouchableOpacity onPress={() => title === 'Completed' && setCompletedCollapsed(!completedCollapsed)}>
              <View>
                <Text style={styles.sectionHeader}>{title} ({data.length})</Text>
                <Rule />
              </View>
            </TouchableOpacity>
          )}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your shopping list is empty</Text>
              <Text style={styles.emptySubtext}>
                Add items manually or generate a smart list based on your inventory
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity 
                  style={[styles.emptyButton, styles.emptyAddButton]}
                  onPress={() => setAddModalVisible(true)}
                >
                  <Plus size={14} color={Colors.white} />
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
        
        {/* Bottom spacer no longer needed since tab bar is non-absolute */}
        
      </View>
    </>
  );
}

// StatRow with three outline panels (compact)
const StatRow = ({ items, activeFilter }: { items: { icon?: React.ReactNode; label: string; value: string; onPress: () => void }[], activeFilter: string }) => (
  <View style={styles.statRow}>
    {items.map((it, idx) => {
      const isActive = activeFilter === it.label.toLowerCase();
      return (
        <TouchableOpacity key={idx} style={[styles.statPill, isActive && styles.activeStatPill]} onPress={it.onPress}>
          {it.icon ? <View style={styles.statPillIcon}>{it.icon}</View> : null}
          <View style={styles.statPillContent}>
            <Text style={[styles.statPillLabel, isActive && styles.statPillLabelActive]} numberOfLines={1}>{it.label}</Text>
            <Text style={[styles.statPillValue, isActive && styles.statPillValueActive]} numberOfLines={1}>{it.value}</Text>
          </View>
        </TouchableOpacity>
      );
    })}
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
  statRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 52,
    gap: 10,
  },
  activeStatPill: {
    backgroundColor: Colors.primary,
  },
  statPillIcon: { marginRight: 8 },
  statPillContent: {
    flex: 1,
  },
  statPillValue: {
    ...Type.body,
    color: Colors.text,
    fontWeight: '700',
  },
  statPillValueActive: {
    color: Colors.white,
  },
  statPillLabel: {
    ...Type.caption,
    color: Colors.lightText,
  },
  statPillLabelActive: {
    color: Colors.white,
    opacity: 0.9,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    flexWrap: 'wrap',
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
    ...Type.body,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
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
    ...Type.body,
    color: Colors.primary,
    fontWeight: '600',
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
    ...Type.body,
    color: Colors.error,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    ...Type.h3,
    fontSize: 18,
    color: Colors.text,
    marginTop: 24,
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
    ...Type.h3,
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    ...Type.body,
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
    ...Type.body,
    color: Colors.white,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyAddButton: {
    backgroundColor: Colors.primary,
  },
  emptyAddButtonText: {
    ...Type.body,
    color: Colors.white,
    fontWeight: '500',
    marginLeft: 8,
  },
  recentlyPurchasedContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  recentlyPurchasedTitle: {
    ...Type.h3,
    fontSize: 16,
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
    ...Type.caption,
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
