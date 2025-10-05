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
  title?: string;
  showGrams?: boolean; // If true, show grams instead of calories in macro circles
}


export const RecipeNutritionCard: React.FC<RecipeNutritionCardProps> = ({
  calories = 0,
  protein = 0,
  carbs = 0,
  fats = 0,
  servings = 1,
  title = "Nutrition Facts",
  showGrams = false
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
  
  // SVG circle properties for compact ring
  const ringRadius = 38;
  const ringStrokeWidth = 5;
  const svgSize = (ringRadius + ringStrokeWidth) * 2;
  const svgCenter = svgSize / 2;
  const circumference = 2 * Math.PI * ringRadius;
  
  // Calculate stroke dash arrays for each segment
  const proteinDashArray = `${(proteinPercent / 100) * circumference} ${circumference}`;
  const carbsDashArray = `${(carbsPercent / 100) * circumference} ${circumference}`;
  const fatsDashArray = `${(fatsPercent / 100) * circumference} ${circumference}`;
  
  // Calculate stroke dash offsets to position segments
  const proteinDashOffset = 0;
  const carbsDashOffset = -(proteinPercent / 100) * circumference;
  const fatsDashOffset = -((proteinPercent + carbsPercent) / 100) * circumference;

  // Use different layouts based on showGrams prop
  // showGrams=true: Onboarding (vertical with circles)
  // showGrams=false: Recipe detail (horizontal with bars)
  
  if (showGrams) {
    // Original vertical layout for onboarding
    return (
      <View style={styles.container}>
        {title ? (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        ) : null}
        
        <View style={styles.nutritionDisplayVertical}>
          {/* Main Calorie Ring */}
          <View style={styles.calorieRingContainer}>
            <Svg width={110} height={110} style={styles.calorieRing}>
              {/* Background circle */}
              <Circle
                cx={55}
                cy={55}
                r={45}
                stroke={Colors.border}
                strokeWidth={6}
                fill="none"
              />
              {/* Protein segment (green) */}
              <Circle
                cx={55}
                cy={55}
                r={45}
                stroke={Colors.nutrition.protein}
                strokeWidth={6}
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
                r={45}
                stroke={Colors.nutrition.carbs}
                strokeWidth={6}
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
                r={45}
                stroke={Colors.nutrition.fats}
                strokeWidth={6}
                fill="none"
                strokeDasharray={fatsDashArray}
                strokeDashoffset={fatsDashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 55 55)`}
              />
            </Svg>
            
            {/* Center content */}
            <View style={styles.calorieCenterLarge}>
              <Text style={styles.caloriesValueLarge}>{Math.round(calories)}</Text>
              <Text style={styles.caloriesLabel}>CALORIES</Text>
            </View>
          </View>
          
          {/* Macro Circles */}
          <View style={styles.macroCirclesContainer}>
            <MacroCircle 
              label="PROTEIN" 
              value={Math.round(protein)}
              unit="g"
              color={Colors.nutrition.protein} 
            />
            <MacroCircle 
              label="CARBS" 
              value={Math.round(carbs)}
              unit="g"
              color={Colors.nutrition.carbs} 
            />
            <MacroCircle 
              label="FAT" 
              value={Math.round(fats)}
              unit="g"
              color={Colors.nutrition.fats} 
            />
          </View>
        </View>
      </View>
    );
  }
  
  // Compact vertical layout for recipe detail (ring on top, bars below)
  return (
    <View style={styles.container}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      
      <View style={styles.nutritionDisplayCompact}>
        {/* Main Calorie Ring - Top Center */}
        <View style={[styles.calorieRingContainer, { width: svgSize, height: svgSize }]}>
          <Svg width={svgSize} height={svgSize} style={styles.calorieRing}>
            {/* Background circle */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke={Colors.border}
              strokeWidth={ringStrokeWidth}
              fill="none"
            />
            {/* Protein segment (green) */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke={Colors.nutrition.protein}
              strokeWidth={ringStrokeWidth}
              fill="none"
              strokeDasharray={proteinDashArray}
              strokeDashoffset={proteinDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
            />
            {/* Carbs segment (orange) */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke={Colors.nutrition.carbs}
              strokeWidth={ringStrokeWidth}
              fill="none"
              strokeDasharray={carbsDashArray}
              strokeDashoffset={carbsDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
            />
            {/* Fats segment (red) */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke={Colors.nutrition.fats}
              strokeWidth={ringStrokeWidth}
              fill="none"
              strokeDasharray={fatsDashArray}
              strokeDashoffset={fatsDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
            />
          </Svg>
          
          {/* Center content */}
          <View style={[styles.calorieCenter, { width: svgSize, height: svgSize }]}> 
            <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
            <Text style={styles.caloriesLabel}>kcal</Text>
          </View>
        </View>
        
        {/* Macro Bars - Below Ring */}
        <View style={styles.macrosContainerCompact}>
          <MacroBar 
            label="Protein" 
            value={Math.round(proteinCalories)}
            unit="cal"
            color={Colors.nutrition.protein}
          />
          <MacroBar 
            label="Carbs" 
            value={Math.round(carbsCalories)}
            unit="cal"
            color={Colors.nutrition.carbs}
          />
          <MacroBar 
            label="Fat" 
            value={Math.round(fatsCalories)}
            unit="cal"
            color={Colors.nutrition.fats}
          />
        </View>
      </View>
    </View>
  );
};

const MacroCircle: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <View style={styles.macroCircleContainer}>
    <View style={[styles.macroCircle, { borderColor: color }]}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
    </View>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const MacroBar: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <View style={styles.macroBarContainer}>
    <Text style={[styles.macroBarLabel, { color }]}>{label}</Text>
    <View style={[styles.macroBarTrack, { backgroundColor: color + '33' }]}>
      <View style={[styles.macroBarFill, { backgroundColor: color }]} />
    </View>
    <Text style={styles.macroBarValue}>{value}{unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md * 0.8,
    marginVertical: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'left',
  },
  servingInfo: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  // Vertical layout (onboarding with circles)
  nutritionDisplayVertical: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  calorieCenterLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
  },
  caloriesValueLarge: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 32,
  },
  macroCirclesContainer: {
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
  macroValue: {
    fontSize: 13,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 14,
  },
  macroUnit: {
    fontSize: 9,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    lineHeight: 10,
  },
  macroLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
  },
  // Compact vertical layout (recipe detail - ring on top, bars below)
  nutritionDisplayCompact: {
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
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 26,
  },
  caloriesLabel: {
    fontSize: 10,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
  },
  macrosContainerCompact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  macroBarContainer: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  macroBarContent: {
    alignItems: 'center',
    gap: 4,
  },
  macroBarTrack: {
    height: 6,
    width: 60,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    width: '100%',
    borderRadius: 3,
  },
  macroBarValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: Typography.weights.bold,
  },
  macroBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroBarLabel: {
    fontSize: 10,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
});
