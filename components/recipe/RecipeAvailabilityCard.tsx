import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle, ShoppingCart, Package, ChefHat } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { RecipeAvailability, formatAvailabilityStatus, getShoppingSuggestions } from '@/utils/inventoryRecipeMatching';

interface RecipeAvailabilityCardProps {
  availability: RecipeAvailability;
  recipeName: string;
  onStartCooking?: () => void;
  onAddToShoppingList?: (items: string[]) => void;
  onViewMissingIngredients?: () => void;
  compact?: boolean;
}

function getUrgencyColor(urgencyScore: number): string {
  if (urgencyScore >= 10) return Colors.error;
  if (urgencyScore >= 5) return Colors.warning || '#F59E0B';
  return Colors.success;
}

function getUrgencyLabel(urgencyScore: number): string {
  if (urgencyScore >= 10) return 'Cook Today!';
  if (urgencyScore >= 5) return 'Use Soon';
  return 'Fresh Ingredients';
}

export const RecipeAvailabilityCard: React.FC<RecipeAvailabilityCardProps> = ({
  availability,
  recipeName,
  onStartCooking,
  onAddToShoppingList,
  onViewMissingIngredients,
  compact = false
}) => {
  const shoppingSuggestions = getShoppingSuggestions(availability);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.compactStatus}>
            {availability.canCookNow ? (
              <CheckCircle size={16} color={Colors.success} />
            ) : (
              <ShoppingCart size={16} color={Colors.warning} />
            )}
            <Text style={styles.compactStatusText}>
              {availability.availabilityPercentage}% available
            </Text>
          </View>
        </View>

        {availability.canCookNow && onStartCooking && (
          <TouchableOpacity style={styles.compactCookButton} onPress={onStartCooking}>
            <ChefHat size={14} color={Colors.white} />
            <Text style={styles.compactCookButtonText}>Cook Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Package size={20} color={Colors.text} />
          <Text style={styles.title}>Ingredient Availability</Text>
        </View>
      </View>

      {/* Status Summary */}
      <View style={styles.statusSection}>
        <Text style={styles.statusText}>
          {formatAvailabilityStatus(availability)}
        </Text>
        <Text style={styles.reasonText}>
          {availability.recommendationReason}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${availability.availabilityPercentage}%`,
                backgroundColor: availability.canCookNow ? Colors.success : Colors.primary
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {availability.availableIngredients} of {availability.totalIngredients} ingredients
        </Text>
      </View>

      {/* Ingredient Details */}
      <View style={styles.detailsSection}>
        {/* Available Ingredients */}
        {availability.availableIngredients > 0 && (
          <View style={styles.detailRow}>
            <CheckCircle size={16} color={Colors.success} />
            <Text style={[styles.detailLabel, { color: Colors.success }]}>
              Available ({availability.availableIngredients})
            </Text>
          </View>
        )}

        {/* Missing Ingredients */}
        {availability.missingIngredients.length > 0 && (
          <View style={styles.detailRow}>
            <ShoppingCart size={16} color={Colors.warning} />
            <Text style={[styles.detailLabel, { color: Colors.warning }]}>
              Missing ({availability.missingIngredients.length})
            </Text>
          </View>
        )}
      </View>

      {/* Missing Ingredients List */}
      {availability.missingIngredients.length > 0 && (
        <View style={styles.missingSection}>
          <Text style={styles.sectionTitle}>Missing Ingredients:</Text>
          <View style={styles.missingList}>
            {availability.missingIngredients.slice(0, 3).map((ingredient, index) => (
              <Text key={index} style={styles.missingItem}>
                • {ingredient.name} ({ingredient.requiredQuantity} {ingredient.requiredUnit})
              </Text>
            ))}
            {availability.missingIngredients.length > 3 && (
              <TouchableOpacity onPress={onViewMissingIngredients}>
                <Text style={styles.viewMoreText}>
                  +{availability.missingIngredients.length - 3} more ingredients
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {availability.canCookNow ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.cookButton]} 
            onPress={onStartCooking}
          >
            <ChefHat size={16} color={Colors.white} />
            <Text style={styles.cookButtonText}>Start Cooking</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            {onAddToShoppingList && shoppingSuggestions.length > 0 && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.shoppingButton]} 
                onPress={() => onAddToShoppingList(shoppingSuggestions)}
              >
                <ShoppingCart size={16} color={Colors.primary} />
                <Text style={styles.shoppingButtonText}>Add to Shopping List</Text>
              </TouchableOpacity>
            )}
          </View>
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactContainer: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusSection: {
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  expiringSection: {
    marginBottom: Spacing.md,
  },
  expiringList: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  expiringItem: {
    backgroundColor: Colors.errorLight || '#FEF2F2',
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error,
    minWidth: 80,
  },
  expiringName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 2,
  },
  expiringDays: {
    fontSize: 10,
    color: Colors.error,
  },
  missingSection: {
    marginBottom: Spacing.md,
  },
  missingList: {
    gap: 4,
  },
  missingItem: {
    fontSize: 12,
    color: Colors.lightText,
  },
  viewMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  actionSection: {
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    flex: 1,
  },
  cookButton: {
    backgroundColor: Colors.success,
  },
  cookButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  shoppingButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  shoppingButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  compactHeader: {
    flex: 1,
    gap: 4,
  },
  compactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  compactUrgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactUrgencyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  compactCookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  compactCookButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});