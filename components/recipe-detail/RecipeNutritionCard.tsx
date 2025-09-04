import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

interface RecipeNutritionCardProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  servings?: number;
}

export const RecipeNutritionCard: React.FC<RecipeNutritionCardProps> = ({
  calories = 0,
  protein = 0,
  carbs = 0,
  fats = 0,
  servings = 1,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Facts</Text>
        <Text style={styles.servingInfo}>Per {servings} serving{servings !== 1 ? 's' : ''}</Text>
      </View>
      
      <View style={styles.nutritionGrid}>
        {/* Calories - Main highlight */}
        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
          <Text style={styles.caloriesLabel}>Calories</Text>
        </View>
        
        {/* Macros */}
        <View style={styles.macrosContainer}>
          <MacroItem label="Protein" value={protein} unit="g" color="#FF6B6B" />
          <MacroItem label="Carbs" value={carbs} unit="g" color="#45B7D1" />
          <MacroItem label="Fat" value={fats} unit="g" color="#4ECDC4" />
        </View>
      </View>
    </View>
  );
};

const MacroItem: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <View style={styles.macroItem}>
    <View style={[styles.macroDot, { backgroundColor: color }]} />
    <Text style={styles.macroLabel}>{label}</Text>
    <Text style={styles.macroValue}>{Math.round(value)}{unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  servingInfo: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  nutritionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  caloriesCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    padding: Spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    lineHeight: 28,
  },
  caloriesLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
  },
  macrosContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  macroValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
});