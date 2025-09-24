import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChevronRight, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { DailyProgress, useNutrition } from '@/hooks/useNutrition';
import { useMeals } from '@/hooks/useMealsStore';
import { NutritionDetailModal } from './NutritionDetailModal';

interface CompactNutritionRingsProps {
  dailyProgress: DailyProgress;
  onPress?: () => void;
  isLoading?: boolean;
}


export const CompactNutritionRings: React.FC<CompactNutritionRingsProps> = ({
  dailyProgress,
  onPress,
  isLoading = false,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { loggedMeals } = useNutrition();
  const { meals } = useMeals();
  
  const { calories, macros } = dailyProgress;
  
  // Calculate remaining calories
  const remainingCalories = Math.max(0, calories.goal - calories.consumed);
  const isOverGoal = calories.consumed > calories.goal;
  
  // Main calorie ring calculations - now with macro segments
  const percentage = calories.goal > 0 ? calories.consumed / calories.goal : 0;
  const radius = 85; // Reduced from 100 for more compact design
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate calories from macros for the ring segments
  const proteinCalories = macros.protein.consumed * 4;
  const carbsCalories = macros.carbs.consumed * 4;
  const fatsCalories = macros.fats.consumed * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatsCalories;
  
  // Calculate progress toward daily goal for each macro segment
  // Each segment should show its contribution to the overall daily progress
  const proteinProgress = calories.goal > 0 ? (proteinCalories / calories.goal) * 100 : 0;
  const carbsProgress = calories.goal > 0 ? (carbsCalories / calories.goal) * 100 : 0;
  const fatsProgress = calories.goal > 0 ? (fatsCalories / calories.goal) * 100 : 0;
  
  // Calculate stroke dash arrays for each segment based on goal progress
  const proteinDashArray = `${(proteinProgress / 100) * circumference} ${circumference}`;
  const carbsDashArray = `${(carbsProgress / 100) * circumference} ${circumference}`;
  const fatsDashArray = `${(fatsProgress / 100) * circumference} ${circumference}`;
  
  // Calculate stroke dash offsets to position segments sequentially
  const proteinDashOffset = 0;
  const carbsDashOffset = -(proteinProgress / 100) * circumference;
  const fatsDashOffset = -((proteinProgress + carbsProgress) / 100) * circumference;

  // Determine display values - show total calories consumed
  const displayValue = calories.consumed;
  const displayLabel = 'CALORIES';

  // Dynamic font size for calorie number
  const calorieFontSize = useMemo(() => {
    const numDigits = Math.abs(displayValue).toString().length;
    if (numDigits > 4) return 28;
    if (numDigits > 3) return 30;
    return 32;
  }, [displayValue]);

  // Macro ring calculations - showing progress toward individual goals
  const macroRings = [
    { 
      name: 'PROTEIN', 
      consumed: macros.protein.consumed, 
      goal: macros.protein.goal,
      calories: proteinCalories, 
      color: Colors.nutrition.protein, 
      position: 'left' 
    },
    { 
      name: 'CARBS', 
      consumed: macros.carbs.consumed, 
      goal: macros.carbs.goal,
      calories: carbsCalories, 
      color: Colors.nutrition.carbs, 
      position: 'center' 
    },
    { 
      name: 'FAT', 
      consumed: macros.fats.consumed, 
      goal: macros.fats.goal,
      calories: fatsCalories, 
      color: Colors.nutrition.fats, 
      position: 'right' 
    },
  ];

  const macroRingSize = 80; // Smaller macro rings
  const macroStrokeWidth = 8;
  const macroRadius = (macroRingSize - macroStrokeWidth) / 2;
  const macroCircumference = 2 * Math.PI * macroRadius;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowDetailModal(true);
    }
  };

  // Build per-meal breakdown for the selected date
  const mealBreakdown = useMemo(() => {
    type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
    const compute = (mt?: MealType) => {
      const dayMeals = loggedMeals.filter(m => m.date === dailyProgress.date && (!mt || m.mealType === mt));
      let c = 0, p = 0, cb = 0, f = 0;
      let fiberTotal = 0, sugarTotal = 0, sodiumTotal = 0;
      let hadMicroSource = false;
      for (const m of dayMeals) {
        c += m.calories; p += m.protein; cb += m.carbs; f += m.fats;
        if (m.mealId) {
          const meal = meals.find(x => x.id === m.mealId);
          const per = meal?.nutritionPerServing as any;
          if (per) {
            hadMicroSource = hadMicroSource || per.fiber != null || per.sugar != null || per.sodium != null;
            if (typeof per.fiber === 'number') fiberTotal += per.fiber * (m.servings || 1);
            if (typeof per.sugar === 'number') sugarTotal += per.sugar * (m.servings || 1);
            if (typeof per.sodium === 'number') sodiumTotal += per.sodium * (m.servings || 1);
          }
        }
      }
      return {
        calories: Math.round(c),
        protein: Math.round(p),
        carbs: Math.round(cb),
        fats: Math.round(f),
        fiber: hadMicroSource ? Math.round(fiberTotal) : null,
        sugar: hadMicroSource ? Math.round(sugarTotal) : null,
        sodium: hadMicroSource ? Math.round(sodiumTotal) : null,
      };
    };
    return {
      all: compute(),
      breakfast: compute('breakfast'),
      lunch: compute('lunch'),
      dinner: compute('dinner'),
      snack: compute('snack'),
    } as const;
  }, [loggedMeals, meals, dailyProgress.date]);

  const dateLabel = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    return dailyProgress.date === todayISO ? 'Today' : dailyProgress.date;
  }, [dailyProgress.date]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingRing}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={[Colors.card, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Header with title and details button */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Nutrition</Text>
            <TouchableOpacity style={styles.detailsButton} onPress={() => setShowDetailModal(true)}>
              <Text style={styles.detailsText}>Details</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Remaining Calories Tag */}
          <View style={styles.remainingCaloriesTag}>
            <View style={styles.tagIcon}>
              <Target size={14} color={isOverGoal ? Colors.error : Colors.primary} />
            </View>
            <View style={styles.tagContent}>
              <Text style={[styles.tagValue, { color: isOverGoal ? Colors.error : Colors.primary }]}>
                {isOverGoal ? `+${Math.abs(remainingCalories)}` : remainingCalories}
              </Text>
              <Text style={styles.tagLabel}>
                {isOverGoal ? 'Over goal' : 'Remaining'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            {/* Main Calorie Ring */}
            <View style={styles.mainRingContainer}>
              <Svg width={200} height={200}>
                {/* Background circle */}
                <Circle
                  cx={100}
                  cy={100}
                  r={radius}
                  stroke={Colors.border}
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={0.3}
                />

                {/* Protein segment (green) */}
                <Circle
                  cx={100}
                  cy={100}
                  r={radius}
                  stroke={Colors.nutrition.protein}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={proteinDashArray}
                  strokeDashoffset={proteinDashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 100 100)`}
                />

                {/* Carbs segment (orange) */}
                <Circle
                  cx={100}
                  cy={100}
                  r={radius}
                  stroke={Colors.nutrition.carbs}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={carbsDashArray}
                  strokeDashoffset={carbsDashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 100 100)`}
                />

                {/* Fats segment (red) */}
                <Circle
                  cx={100}
                  cy={100}
                  r={radius}
                  stroke={Colors.nutrition.fats}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={fatsDashArray}
                  strokeDashoffset={fatsDashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 100 100)`}
                />
              </Svg>

              {/* Center Content */}
              <View style={styles.centerContent}>
                <Text style={[styles.calorieNumber, { fontSize: calorieFontSize }]}>{Math.round(displayValue)}</Text>
                <Text style={styles.calorieLabel}>{displayLabel}</Text>
              </View>
            </View>

            {/* Compact Macro Rings - positioned closer to main ring */}
            <View style={styles.macroRingsContainer}>
              {macroRings.map((macro, index) => {
                // Calculate progress percentage for this macro
                const macroProgress = macro.goal > 0 ? macro.consumed / macro.goal : 0;
                const progressPercentage = Math.min(macroProgress * 100, 100); // Cap at 100%
                
                // Calculate stroke dash array for progress
                const progressDashArray = `${(progressPercentage / 100) * macroCircumference} ${macroCircumference}`;
                
                return (
                  <View key={macro.name} style={styles.macroRingItem}>
                    <Svg width={macroRingSize} height={macroRingSize}>
                      {/* Background circle */}
                      <Circle
                        cx={macroRingSize / 2}
                        cy={macroRingSize / 2}
                        r={macroRadius}
                        stroke={macro.color + '20'}
                        strokeWidth={macroStrokeWidth}
                        fill="none"
                      />

                      {/* Progress circle with macro color */}
                      <Circle
                        cx={macroRingSize / 2}
                        cy={macroRingSize / 2}
                        r={macroRadius}
                        stroke={macro.color}
                        strokeWidth={macroStrokeWidth}
                        fill="none"
                        strokeDasharray={progressDashArray}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${macroRingSize / 2} ${macroRingSize / 2})`}
                      />
                    </Svg>

                    {/* Macro Center Content */}
                    <View style={styles.macroCenterContent}>
                      <Text style={[styles.macroValue, { color: macro.color }]}>
                        {Math.round(macro.consumed)}
                      </Text>
                    </View>

                    {/* Macro Label */}
                    <Text style={styles.macroLabel}>{macro.name}</Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Comprehensive Nutrition Detail Modal */}
      <NutritionDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        calories={calories.consumed}
        protein={macros.protein.consumed}
        carbs={macros.carbs.consumed}
        fats={macros.fats.consumed}
        goals={{
          dailyCalories: calories.goal,
          protein: macros.protein.goal,
          carbs: macros.carbs.goal,
          fats: macros.fats.goal,
        }}
        mealBreakdown={mealBreakdown as any}
        dateLabel={dateLabel}
      />
    </>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientBackground: {
    borderRadius: 20,
    padding: 20,
    minHeight: 320, // Ensure consistent card height
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
    borderRadius: 8,
    backgroundColor: Colors.card,
  },
  detailsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  remainingCaloriesTag: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tagIcon: {
    marginRight: 6,
  },
  tagContent: {
    alignItems: 'center',
  },
  tagValue: {
    fontSize: 14,
    fontWeight: Typography.weights.bold,
    lineHeight: 16,
  },
  tagLabel: {
    fontSize: 10,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  mainRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: 200,
    height: 200,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  calorieNumber: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    lineHeight: 36,
    textAlign: 'center',
  },
  calorieLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  macroRingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  macroRingItem: {
    alignItems: 'center',
    position: 'relative',
    width: 80,
    height: 100,
  },
  macroCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20, // Leave space for label
  },
  macroValue: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    lineHeight: 18,
    textAlign: 'center',
  },
  macroLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    letterSpacing: 0.5,
  },
  loadingRing: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    color: Colors.lightText,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Modal styles (reused from EnhancedCalorieRing)
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  
  // Status section
  statusSection: {
    marginVertical: Spacing.md,
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.sm,
  },
  statusDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 20,
  },
  
  // Section styles
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  
  // Breakdown styles
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  breakdownSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  breakdownLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  breakdownSubLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  breakdownValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  breakdownSubValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  
  // Macro styles
  macroCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  macroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  macroName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  macroValues: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  macroProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroPercentage: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    minWidth: 35,
    textAlign: 'right',
  },
  
  // Tips styles
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 20,
    marginLeft: Spacing.sm,
  },
});
