import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
  // Calculate calories from macros for the ring segments
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatsCalories = fats * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatsCalories;
  
  // Calculate percentages for the ring segments
  const proteinPercent = totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0;
  const carbsPercent = totalMacroCalories > 0 ? (carbsCalories / totalMacroCalories) * 100 : 0;
  const fatsPercent = totalMacroCalories > 0 ? (fatsCalories / totalMacroCalories) * 100 : 0;
  
  // SVG circle properties
  const radius = 45;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash arrays for each segment
  const proteinDashArray = `${(proteinPercent / 100) * circumference} ${circumference}`;
  const carbsDashArray = `${(carbsPercent / 100) * circumference} ${circumference}`;
  const fatsDashArray = `${(fatsPercent / 100) * circumference} ${circumference}`;
  
  // Calculate stroke dash offsets to position segments
  const proteinDashOffset = 0;
  const carbsDashOffset = -(proteinPercent / 100) * circumference;
  const fatsDashOffset = -((proteinPercent + carbsPercent) / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Facts</Text>
      </View>
      
      <View style={styles.nutritionDisplay}>
        {/* Main Calorie Ring */}
        <View style={styles.calorieRingContainer}>
          <Svg width={110} height={110} style={styles.calorieRing}>
            {/* Background circle */}
            <Circle
              cx={55}
              cy={55}
              r={radius}
              stroke={Colors.border}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Protein segment (green) */}
            <Circle
              cx={55}
              cy={55}
              r={radius}
              stroke="#4ECDC4"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={proteinDashArray}
              strokeDashoffset={proteinDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 55 55)`}
            />
            {/* Carbs segment (orange) */}
            <Circle
              cx={55}
              cy={55}
              r={radius}
              stroke="#F0884D"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={carbsDashArray}
              strokeDashoffset={carbsDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 55 55)`}
            />
            {/* Fats segment (red) */}
            <Circle
              cx={55}
              cy={55}
              r={radius}
              stroke="#FF6B6B"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={fatsDashArray}
              strokeDashoffset={fatsDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 55 55)`}
            />
          </Svg>
          
          {/* Center content */}
          <View style={styles.calorieCenter}>
            <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
            <Text style={styles.caloriesLabel}>CALORIES</Text>
          </View>
        </View>
        
        {/* Macro Circles */}
        <View style={styles.macrosContainer}>
          <MacroCircle 
            label="PROTEIN" 
            calories={Math.round(proteinCalories)} 
            color="#4ECDC4" 
          />
          <MacroCircle 
            label="CARBS" 
            calories={Math.round(carbsCalories)} 
            color="#F0884D" 
          />
          <MacroCircle 
            label="FAT" 
            calories={Math.round(fatsCalories)} 
            color="#FF6B6B" 
          />
        </View>
      </View>
    </View>
  );
};

const MacroCircle: React.FC<{
  label: string;
  calories: number;
  color: string;
}> = ({ label, calories, color }) => (
  <View style={styles.macroCircleContainer}>
    <View style={[styles.macroCircle, { borderColor: color }]}>
      <Text style={styles.macroCalories}>{calories}</Text>
    </View>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  nutritionDisplay: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  calorieRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calorieRing: {
    position: 'absolute',
  },
  calorieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
  },
  caloriesValue: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 32,
  },
  caloriesLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  perServing: {
    fontSize: 10,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    marginTop: 1,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  macroCircleContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  macroCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  macroCalories: {
    fontSize: 14,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 16,
  },
  macroLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
  },
});
