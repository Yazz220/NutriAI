import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
  const ringRadius = 36;
  const ringStrokeWidth = 8; // Increased from 5 for modern look
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
            <Svg width={112} height={112} style={styles.calorieRing}>
              <Defs>
                <SvgLinearGradient id="proteinGradLarge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Colors.nutrition.protein} stopOpacity="1" />
                  <Stop offset="100%" stopColor={Colors.nutrition.protein} stopOpacity="0.75" />
                </SvgLinearGradient>
                <SvgLinearGradient id="carbsGradLarge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Colors.nutrition.carbs} stopOpacity="1" />
                  <Stop offset="100%" stopColor={Colors.nutrition.carbs} stopOpacity="0.75" />
                </SvgLinearGradient>
                <SvgLinearGradient id="fatsGradLarge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Colors.nutrition.fats} stopOpacity="1" />
                  <Stop offset="100%" stopColor={Colors.nutrition.fats} stopOpacity="0.75" />
                </SvgLinearGradient>
              </Defs>
              {/* Background circle */}
              <Circle
                cx={56}
                cy={56}
                r={44}
                stroke={Colors.border}
                strokeWidth={9}
                fill="none"
                opacity={0.2}
              />
              {/* Protein segment (green) with gradient */}
              <Circle
                cx={56}
                cy={56}
                r={44}
                stroke="url(#proteinGradLarge)"
                strokeWidth={9}
                fill="none"
                strokeDasharray={proteinDashArray}
                strokeDashoffset={proteinDashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 56 56)`}
              />
              {/* Carbs segment (orange) with gradient */}
              <Circle
                cx={56}
                cy={56}
                r={44}
                stroke="url(#carbsGradLarge)"
                strokeWidth={9}
                fill="none"
                strokeDasharray={carbsDashArray}
                strokeDashoffset={carbsDashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 56 56)`}
              />
              {/* Fats segment (red) with gradient */}
              <Circle
                cx={56}
                cy={56}
                r={44}
                stroke="url(#fatsGradLarge)"
                strokeWidth={9}
                fill="none"
                strokeDasharray={fatsDashArray}
                strokeDashoffset={fatsDashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 56 56)`}
              />
            </Svg>
            
            {/* Center content */}
            <View style={[styles.calorieCenterLarge, { width: 112, height: 112 }]}>
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
            <Defs>
              <SvgLinearGradient id="proteinGradSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.nutrition.protein} stopOpacity="1" />
                <Stop offset="100%" stopColor={Colors.nutrition.protein} stopOpacity="0.75" />
              </SvgLinearGradient>
              <SvgLinearGradient id="carbsGradSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.nutrition.carbs} stopOpacity="1" />
                <Stop offset="100%" stopColor={Colors.nutrition.carbs} stopOpacity="0.75" />
              </SvgLinearGradient>
              <SvgLinearGradient id="fatsGradSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.nutrition.fats} stopOpacity="1" />
                <Stop offset="100%" stopColor={Colors.nutrition.fats} stopOpacity="0.75" />
              </SvgLinearGradient>
            </Defs>
            {/* Background circle */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke={Colors.border}
              strokeWidth={ringStrokeWidth}
              fill="none"
              opacity={0.2}
            />
            {/* Protein segment (green) with gradient */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke="url(#proteinGradSmall)"
              strokeWidth={ringStrokeWidth}
              fill="none"
              strokeDasharray={proteinDashArray}
              strokeDashoffset={proteinDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
            />
            {/* Carbs segment (orange) with gradient */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke="url(#carbsGradSmall)"
              strokeWidth={ringStrokeWidth}
              fill="none"
              strokeDasharray={carbsDashArray}
              strokeDashoffset={carbsDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
            />
            {/* Fats segment (red) with gradient */}
            <Circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              stroke="url(#fatsGradSmall)"
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesValueLarge: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 32,
  },
  macroCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  macroCircleContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  macroCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    alignSelf: 'center',
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  calorieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
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
