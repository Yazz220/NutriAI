import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, Plus } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { InventoryItem } from '@/types';

interface InventoryStatusBarProps {
  inventory: InventoryItem[];
  onViewInventory?: () => void;
  onAddIngredient?: () => void;
  compact?: boolean;
}

interface InventoryStats {
  total: number;
}

function calculateInventoryStats(inventory: InventoryItem[]): InventoryStats {
  return { total: inventory.length };
}

export const InventoryStatusBar: React.FC<InventoryStatusBarProps> = ({
  inventory,
  onViewInventory,
  onAddIngredient,
  compact = false
}) => {
  const stats = calculateInventoryStats(inventory);
  
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactStats}>
          <Package size={16} color={Colors.text} />
          <Text style={styles.compactText}>{stats.total} items</Text>
        </View>
        {onViewInventory && (
          <TouchableOpacity onPress={onViewInventory} style={styles.compactButton}>
            <Text style={styles.compactButtonText}>View</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Package size={20} color={Colors.text} />
          <Text style={styles.title}>Your Inventory</Text>
        </View>
        {onAddIngredient && (
          <TouchableOpacity onPress={onAddIngredient} style={styles.addButton}>
            <Plus size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
      </View>

      {onViewInventory && (
        <TouchableOpacity onPress={onViewInventory} style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Full Inventory</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  urgentStat: {
    backgroundColor: Colors.errorLight || '#FEF2F2',
    borderRadius: 8,
    paddingVertical: Spacing.xs,
    marginHorizontal: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
    textAlign: 'center',
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight || '#FEF2F2',
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  viewButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  compactButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
  },
  compactButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
});