import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { InventoryItem, ItemCategory } from '@/types';

interface InventorySummaryProps {
  inventory: InventoryItem[];
  onCategoryPress?: (category: ItemCategory) => void;
  showCategories?: boolean;
}

interface CategorySummary {
  category: ItemCategory;
  count: number;
}

interface FreshnessSummary {
  untracked: number;
}

function calculateCategorySummary(inventory: InventoryItem[]): CategorySummary[] {
  const categoryMap = new Map<ItemCategory, CategorySummary>();
  
  const allCategories: ItemCategory[] = [
    'Produce', 'Dairy', 'Meat', 'Seafood', 'Frozen', 
    'Pantry', 'Bakery', 'Beverages', 'Other'
  ];
  
  allCategories.forEach(category => {
    categoryMap.set(category, {
      category,
      count: 0,
    });
  });
  
  inventory.forEach(item => {
    const category = item.category || 'Other';
    const summary = categoryMap.get(category)!;
    summary.count++;
  });
  
  return Array.from(categoryMap.values()).filter(summary => summary.count > 0);
}

function calculateFreshnessSummary(inventory: InventoryItem[]): FreshnessSummary {
  return { untracked: inventory.length };
}

export const InventorySummary: React.FC<InventorySummaryProps> = ({
  inventory,
  onCategoryPress,
  showCategories = true
}) => {
  const freshnessSummary = calculateFreshnessSummary(inventory);
  const categorySummary = calculateCategorySummary(inventory);
  
  return (
    <View style={styles.container}>
      <View style={styles.overallStats}>
        <View style={styles.totalSection}>
          <Package size={24} color={Colors.primary} />
          <View>
            <Text style={styles.totalNumber}>{inventory.length}</Text>
            <Text style={styles.totalLabel}>Total Items</Text>
          </View>
        </View>
      </View>
      
      {showCategories && categorySummary.length > 0 && (
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <View style={styles.categoriesGrid}>
            {categorySummary.map(category => (
              <TouchableOpacity
                key={category.category}
                style={styles.categoryCard}
                onPress={() => onCategoryPress?.(category.category)}
                disabled={!onCategoryPress}
              >
                <Text style={styles.categoryName}>{category.category}</Text>
                <Text style={styles.categoryCount}>{category.count} items</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overallStats: {
    marginBottom: Spacing.lg,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  totalNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  freshnessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  freshnessItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  freshnessCount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  freshnessLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  categoriesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    minWidth: '45%',
    flex: 1,
    maxWidth: '48%',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  categoryAlerts: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  categoryAlertText: {
    fontSize: 11,
    fontWeight: '500',
  },
});