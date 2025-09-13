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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Sparkles, RotateCcw, ShoppingCart, CheckCircle, Clock } from 'lucide-react-native';
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
  const { preferences, updateAutoAddPurchasedToInventory } = useUserPreferences();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56; // matches pill bar height in app/(tabs)/_layout.tsx
  const bottomPad = (insets?.bottom ?? 0) + TAB_BAR_HEIGHT + 24;
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
    toggleItemChecked(item.id);
    if (!item.checked) {
      if (preferences?.autoAddPurchasedToInventory) {
        // Auto add silently
        addInventoryItem({
          name: item.name,
          category: item.category,
          addedDate: new Date().toISOString(),
          quantity: 1,
          unit: 'pcs',
        }).then(() => showToast({ message: `Added ${item.name} to inventory`, type: 'success' }))
          .catch(() => showToast({ message: 'Failed to add to inventory', type: 'error' }));
      } else {
        Alert.alert(
          'Move to Inventory?',
          `Would you like to add ${item.name} to your inventory?`,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Yes, Add',
              onPress: async () => {
                try {
                  await addInventoryItem({
                    name: item.name,
                    category: item.category,
                    addedDate: new Date().toISOString(),
                    quantity: 1,
                    unit: 'pcs',
                  });
                  showToast({ message: `Added ${item.name} to inventory`, type: 'success' });
                } catch (e) {
                  showToast({ message: 'Failed to add to inventory', type: 'error' });
                }
              },
            },
          ]
        );
      }
    }
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
          icon={<ShoppingCart size={28} color={Colors.text} />}
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
          <View style={{ justifyContent: 'center', marginLeft: 8 }}>
            <TouchableOpacity onPress={() => updateAutoAddPurchasedToInventory(!preferences?.autoAddPurchasedToInventory)} style={styles.autoAddToggle}>
              <Text style={{ color: preferences?.autoAddPurchasedToInventory ? Colors.white : Colors.text, fontWeight: '600' }}>{preferences?.autoAddPurchasedToInventory ? 'Auto add: ON' : 'Auto add: OFF'}</Text>
            </TouchableOpacity>
          </View>
          <Button
            title="Export"
            onPress={() => setExportVisible(true)}
            variant="outline"
            size="xs"
            style={{ flex: 1, minWidth: 0, paddingHorizontal: 12 }}
          />

          {shoppingList.some(item => item.checked) && (
            <Button
              title="Clear"
              onPress={clearCheckedItems}
              variant="outline"
              size="xs"
              style={{ flex: 1, minWidth: 0, paddingHorizontal: 12, borderColor: Colors.error }}
              textStyle={{ color: Colors.error }}
            />
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
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
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
        
        {/* Bottom spacer to ensure content clears the absolute tab bar */}
        <View style={{ height: bottomPad }} />
        
      </View>
    </>
  );
}

// StatRow with three outline panels (compact)
const StatRow = ({ items, activeFilter }: { items: { icon?: React.ReactNode; label: string; value: string; onPress: () => void }[], activeFilter: string }) => (
  <View style={styles.statRow}>
    {items.map((it, idx) => (
      <TouchableOpacity key={idx} style={[styles.statPill, activeFilter === it.label.toLowerCase() && styles.activeStatPill]} onPress={it.onPress}>
        {it.icon ? <View style={{ marginRight: 6 }}>{it.icon}</View> : null}
        <Text style={styles.statPillValue}>{it.value}</Text>
        <Text style={styles.statPillLabel}>{it.label}</Text>
      </TouchableOpacity>
    ))}
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
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
  },
  activeStatPill: {
    backgroundColor: Colors.primary,
  },
  statPillValue: {
    ...Type.body,
    color: Colors.text,
    fontWeight: '700',
    marginRight: 6,
  },
  statPillLabel: {
    ...Type.caption,
    color: Colors.lightText,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  autoAddToggle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#FF6B6B',
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
