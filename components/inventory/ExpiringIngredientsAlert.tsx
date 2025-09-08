import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, Clock, ChefHat, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { InventoryItem } from '@/types';

interface ExpiringIngredientsAlertProps {
  expiringItems: InventoryItem[];
  onSuggestRecipes?: (ingredients: string[]) => void;
  onDismiss?: () => void;
  onViewItem?: (item: InventoryItem) => void;
}

interface ExpiringItemWithUrgency extends InventoryItem {
  daysUntilExpiry: number;
  urgencyLevel: 'critical' | 'warning' | 'notice';
}

function categorizeExpiringItems(items: InventoryItem[]): ExpiringItemWithUrgency[] {
  const now = new Date();
  
  return items
    .filter(item => item.expiryDate)
    .map(item => {
      const expiryDate = new Date(item.expiryDate!);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgencyLevel: 'critical' | 'warning' | 'notice' = 'notice';
      if (daysUntilExpiry <= 0) urgencyLevel = 'critical';
      else if (daysUntilExpiry <= 1) urgencyLevel = 'critical';
      else if (daysUntilExpiry <= 3) urgencyLevel = 'warning';
      
      return {
        ...item,
        daysUntilExpiry,
        urgencyLevel
      };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

function getUrgencyColor(urgencyLevel: 'critical' | 'warning' | 'notice'): string {
  switch (urgencyLevel) {
    case 'critical': return Colors.error;
    case 'warning': return Colors.warning;
    case 'notice': return Colors.info || Colors.primary;
  }
}

function getUrgencyIcon(urgencyLevel: 'critical' | 'warning' | 'notice') {
  switch (urgencyLevel) {
    case 'critical': return AlertTriangle;
    case 'warning': return Clock;
    case 'notice': return Clock;
  }
}

function formatExpiryText(daysUntilExpiry: number): string {
  if (daysUntilExpiry <= 0) return 'Expired';
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  return `Expires in ${daysUntilExpiry} days`;
}

export const ExpiringIngredientsAlert: React.FC<ExpiringIngredientsAlertProps> = ({
  expiringItems,
  onSuggestRecipes,
  onDismiss,
  onViewItem
}) => {
  const categorizedItems = categorizeExpiringItems(expiringItems);
  
  if (categorizedItems.length === 0) return null;

  const criticalItems = categorizedItems.filter(item => item.urgencyLevel === 'critical');
  const warningItems = categorizedItems.filter(item => item.urgencyLevel === 'warning');
  
  const handleSuggestRecipes = () => {
    const ingredientNames = categorizedItems.slice(0, 5).map(item => item.name);
    onSuggestRecipes?.(ingredientNames);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AlertTriangle size={20} color={Colors.error} />
          <Text style={styles.title}>Ingredients Expiring Soon</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <X size={16} color={Colors.lightText} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsContainer}
      >
        {categorizedItems.slice(0, 6).map((item, index) => {
          const UrgencyIcon = getUrgencyIcon(item.urgencyLevel);
          const urgencyColor = getUrgencyColor(item.urgencyLevel);
          
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                { borderLeftColor: urgencyColor }
              ]}
              onPress={() => onViewItem?.(item)}
            >
              <View style={styles.itemHeader}>
                <UrgencyIcon size={14} color={urgencyColor} />
                <Text style={[styles.itemName]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              
              <Text style={styles.itemQuantity}>
                {item.quantity} {item.unit}
              </Text>
              
              <Text style={[styles.expiryText, { color: urgencyColor }]}>
                {formatExpiryText(item.daysUntilExpiry)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.actionContainer}>
        <Text style={styles.suggestionText}>
          {criticalItems.length > 0 
            ? `${criticalItems.length} ingredient${criticalItems.length !== 1 ? 's' : ''} need immediate attention`
            : `${warningItems.length} ingredient${warningItems.length !== 1 ? 's' : ''} should be used soon`
          }
        </Text>
        
        {onSuggestRecipes && (
          <TouchableOpacity 
            onPress={handleSuggestRecipes}
            style={styles.recipeButton}
          >
            <ChefHat size={16} color={Colors.white} />
            <Text style={styles.recipeButtonText}>Get Recipe Ideas</Text>
          </TouchableOpacity>
        )}
      </View>
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
    borderColor: Colors.error,
    borderLeftWidth: 4,
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
    color: Colors.error,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  itemCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    minWidth: 120,
    maxWidth: 140,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  recipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  recipeButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});