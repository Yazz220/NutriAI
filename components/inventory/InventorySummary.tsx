import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, AlertTriangle, Clock, CheckCircle, HelpCircle } from 'lucide-react-native';
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
  expiring: number;
  aging: number;
  fresh: number;
  untracked: number;
}

interface FreshnessSummary {
  fresh: number;
  aging: number;
  expiring: number;
  untracked: number;
}

function getFreshnessStatus(expiryDateStr?: string): 'fresh' | 'aging' | 'expiring' | 'untracked' {
  if (!expiryDateStr) return 'untracked';

  const now = new Date();
  const expiryDate = new Date(expiryDateStr);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 1) return 'expiring';
  if (daysUntilExpiry <= 3) return 'aging';
  return 'fresh';
}

function calculateCategorySummary(inventory: InventoryItem[]): CategorySummary[] {
  const categoryMap = new Map<ItemCategory, CategorySummary>();
  
  // Initialize all categories
  const allCategories: ItemCategory[] = [
    'Produce', 'Dairy', 'Meat', 'Seafood', 'Frozen', 
    'Pantry', 'Bakery', 'Beverages', 'Other'
  ];
  
  allCategories.forEach(category => {
    categoryMap.set(category, {
      category,
      count: 0,
      expiring: 0,
      aging: 0,
      fresh: 0,
      untracked: 0
    });
  });
  
  // Count items by category and freshness
  inventory.forEach(item => {
    const category = item.category || 'Other';
    const summary = categoryMap.get(category)!;
    const freshness = getFreshnessStatus(item.expiryDate);
    
    summary.count++;
    summary[freshness]++;
  });
  
  // Return only categories with items
  return Array.from(categoryMap.values()).filter(summary => summary.count > 0);
}

function calculateFreshnessSummary(inventory: InventoryItem[]): FreshnessSummary {
  const summary: FreshnessSummary = {
    fresh: 0,
    aging: 0,
    expiring: 0,
    untracked: 0
  };
  
  inventory.forEach(item => {
    const freshness = getFreshnessStatus(item.expiryDate);
    summary[freshness]++;
  });
  
  return summary;
}

function getFreshnessIcon(status: keyof FreshnessSummary) {
  switch (status) {
    case 'fresh': return CheckCircle;
    case 'aging': return Clock;
    case 'expiring': return AlertTriangle;
    case 'untracked': return HelpCircle;
  }
}

function getFreshnessColor(status: keyof FreshnessSummary): string {
  switch (status) {
    case 'fresh': return Colors.success;
    case 'aging': return Colors.warning;
    case 'expiring': return Colors.error;
    case 'untracked': return Colors.lightText;
  }
}

function getFreshnessLabel(status: keyof FreshnessSummary): string {
  switch (status) {
    case 'fresh': return 'Fresh';
    case 'aging': return 'Use Soon';
    case 'expiring': return 'Expiring';
    case 'untracked': return 'No Date';
  }
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
      {/* Overall Stats */}
      <View style={styles.overallStats}>
        <View style={styles.totalSection}>
          <Package size={24} color={Colors.primary} />
          <View>
            <Text style={styles.totalNumber}>{inventory.length}</Text>
            <Text style={styles.totalLabel}>Total Items</Text>
          </View>
        </View>
        
        <View style={styles.freshnessGrid}>
          {(Object.keys(freshnessSummary) as Array<keyof FreshnessSummary>).map(status => {
            const count = freshnessSummary[status];
            if (count === 0) return null;
            
            const Icon = getFreshnessIcon(status);
            const color = getFreshnessColor(status);
            const label = getFreshnessLabel(status);
            
            return (
              <View key={status} style={styles.freshnessItem}>
                <Icon size={16} color={color} />
                <Text style={[styles.freshnessCount, { color }]}>{count}</Text>
                <Text style={styles.freshnessLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      
      {/* Category Breakdown */}
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
                
                {(category.expiring > 0 || category.aging > 0) && (
                  <View style={styles.categoryAlerts}>
                    {category.expiring > 0 && (
                      <View style={styles.categoryAlert}>
                        <AlertTriangle size={12} color={Colors.error} />
                        <Text style={[styles.categoryAlertText, { color: Colors.error }]}>
                          {category.expiring}
                        </Text>
                      </View>
                    )}
                    {category.aging > 0 && (
                      <View style={styles.categoryAlert}>
                        <Clock size={12} color={Colors.warning} />
                        <Text style={[styles.categoryAlertText, { color: Colors.warning }]}>
                          {category.aging}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
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