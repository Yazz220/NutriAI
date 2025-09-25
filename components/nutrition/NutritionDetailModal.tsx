import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { X, ChevronLeft, TrendingUp, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all';

type NutrientTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null; // mg
};

interface NutritionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  goals: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  mealBreakdown?: Partial<Record<MealType, NutrientTotals>>;
  dateLabel?: string;
}

interface ProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, goal, unit, color }) => {
  const percentage = Math.min((current / goal) * 100, 100);
  
  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarHeader}>
        <Text style={styles.progressBarLabel}>{label}</Text>
        <Text style={styles.progressBarValue}>{Math.round(current)} / {goal} {unit}</Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
};

interface NutritionRowProps {
  label: string;
  primary?: string; // main left value (e.g., "0g/98g (Goal)")
  secondary?: string; // small subtext under primary
  percent?: string; // right side percent text
  onPress?: () => void;
}

const NutritionRow: React.FC<NutritionRowProps> = ({ label, primary = '', secondary = '', percent = '', onPress }) => {
  const Row = onPress ? TouchableOpacity : View;
  return (
    <Row style={styles.nutritionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.nutritionLeft}>
        <Text style={styles.nutritionLabel}>{label}</Text>
        {!!primary && <Text style={styles.nutritionPrimary}>{primary}</Text>}
        {!!secondary && <Text style={styles.nutritionSecondary}>{secondary}</Text>}
      </View>
      <View style={styles.nutritionRight}>
        <Text style={styles.nutritionPercent}>{percent}</Text>
        <ChevronRight size={18} color={Colors.lightText} />
      </View>
    </Row>
  );
};

export const NutritionDetailModal: React.FC<NutritionDetailModalProps> = ({
  visible,
  onClose,
  calories,
  protein,
  carbs,
  fats,
  goals,
  mealBreakdown,
  dateLabel,
}) => {
  const [activeMeal, setActiveMeal] = useState<MealType>('all');
  const remainingCalories = Math.max(0, goals.dailyCalories - calories);
  
  // Select totals based on active meal (fallback to aggregated props)
  const selectedTotals: NutrientTotals = useMemo(() => {
    const fallback: NutrientTotals = {
      calories,
      protein,
      carbs,
      fats,
      fiber: null,
      sugar: null,
      sodium: null,
    };
    if (!mealBreakdown) return fallback;
    const mb = mealBreakdown[activeMeal] || mealBreakdown.all;
    return mb ? { ...fallback, ...mb } : fallback;
  }, [activeMeal, mealBreakdown, calories, protein, carbs, fats]);

  // Derived rows for the Nutrition Facts list based on available data
  const nutritionFacts = useMemo(() => {
    return {
      carbs: {
        fiber: selectedTotals.fiber,
        sugar: selectedTotals.sugar,
      },
      other: {
        sodium: selectedTotals.sodium, // mg
      },
    } as const;
  }, [selectedTotals]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{dateLabel || 'Today'}</Text>
          <TouchableOpacity style={styles.chartButton}>
            <TrendingUp size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Dietary Intake Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dietary Intake</Text>
            <View style={styles.intakeCard}>
              <ProgressBar
                label="Calories"
                current={selectedTotals.calories}
                goal={goals.dailyCalories}
                unit="kcal"
                color={Colors.nutrition.calories}
              />
              <ProgressBar
                label="Carbs"
                current={selectedTotals.carbs}
                goal={goals.carbs}
                unit="g"
                color={Colors.nutrition.carbs}
              />
              <ProgressBar
                label="Protein"
                current={selectedTotals.protein}
                goal={goals.protein}
                unit="g"
                color={Colors.nutrition.protein}
              />
              <ProgressBar
                label="Fat"
                current={selectedTotals.fats}
                goal={goals.fats}
                unit="g"
                color={Colors.nutrition.fats}
              />
            </View>
          </View>

          {/* Meal Selector (interactive) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meals</Text>
            <View style={styles.mealsContainer}>
              {([
                { key: 'all', label: 'All' },
                { key: 'breakfast', label: '🍳 Breakfast' },
                { key: 'lunch', label: '🥗 Lunch' },
                { key: 'dinner', label: '🍽️ Dinner' },
                { key: 'snack', label: '🍎 Snacks' },
              ] as { key: MealType; label: string }[]).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.mealChip,
                    activeMeal === key && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
                  ]}
                  onPress={() => setActiveMeal(key)}
                >
                  <Text style={[styles.mealChipText, activeMeal === key && { color: Colors.primary }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meals Section (legacy hidden) */}
          <View style={[styles.section, { display: 'none' }]}>
            <Text style={styles.sectionTitle}>Meals (Example)</Text>
            <View style={styles.mealsContainer}>
              <View style={styles.mealChip}>
                <Text style={styles.mealChipText}>🍳 Breakfast</Text>
              </View>
              <View style={styles.mealChip}>
                <Text style={styles.mealChipText}>🥗 Lunch</Text>
              </View>
              <View style={styles.mealChip}>
                <Text style={styles.mealChipText}>🍽️ Dinner</Text>
              </View>
              <View style={styles.mealChip}>
                <Text style={styles.mealChipText}>🍎 Snacks</Text>
              </View>
            </View>
          </View>

          {/* Nutrition Facts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Facts</Text>

            {/* Calories and Macronutrients summary */}
            <View style={styles.nutritionCard}>
              <NutritionRow label="Calories" primary={`${Math.round(selectedTotals.calories)} kcal`} />
              <NutritionRow label="Protein" primary={`${Math.round(selectedTotals.protein)} g`} />
              <View style={styles.nutritionHeaderRow}>
                <Text style={styles.nutritionHeaderLabel}>Carbs</Text>
                <Text style={styles.nutritionHeaderValue}>{Math.round(selectedTotals.carbs)} g</Text>
              </View>
              {/* Carbs sub-rows */}
              <View style={styles.subNutrientContainer}>
                <NutritionRow label="Dietary Fiber" primary={
                  nutritionFacts.carbs.fiber != null ? `${Math.round(nutritionFacts.carbs.fiber)} g` : '�'
                } />
                <NutritionRow label="Total Sugars" primary={
                  nutritionFacts.carbs.sugar != null ? `${Math.round(nutritionFacts.carbs.sugar)} g` : '�'
                } />
              </View>

              <View style={styles.nutritionHeaderRow}>
                <Text style={styles.nutritionHeaderLabel}>Fat</Text>
                <Text style={styles.nutritionHeaderValue}>{Math.round(selectedTotals.fats)} g</Text>
              </View>
              {/* Fat sub-rows (not yet tracked) */}
              <View style={styles.subNutrientContainer}>
                <NutritionRow label="Saturated Fat" primary={'�'} />
                <NutritionRow label="Monounsaturated Fat" primary={'�'} />
                <NutritionRow label="Polyunsaturated Fat" primary={'�'} />
                <NutritionRow label="Trans Fat" primary={'�'} />
              </View>
            </View>

            {/* Other nutrients */}
            <View style={styles.nutritionCard}>
              <NutritionRow label="Sodium" primary={
                nutritionFacts.other.sodium != null ? `${Math.round(nutritionFacts.other.sodium)} mg` : '�'
              } />
              <NutritionRow label="Cholesterol" primary={'�'} />
              <NutritionRow label="Water" primary={'�'} />
              <NutritionRow label="Alcohol" primary={'�'} />
            </View>

            {/* Vitamins */}
            <View style={styles.nutritionCard}>
              {['Vitamin A','Vitamin B1 (Thiamin)','Folate (B9)','Vitamin B12','Vitamin C','Vitamin D','Vitamin E','Vitamin K'].map((v) => (
                <NutritionRow key={v} label={v} primary={'�'} />
              ))}
            </View>

            {/* Minerals */}
            <View style={styles.nutritionCard}>
              {['Calcium','Iron','Magnesium','Potassium','Zinc'].map((m) => (
                <NutritionRow key={m} label={m} primary={'�'} />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  chartButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  intakeCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarLabel: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  progressBarValue: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealChip: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealChipText: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  nutritionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mainCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  nutritionLeft: {
    flex: 1,
    paddingRight: 12,
  },
  nutritionPrimary: {
    fontSize: 14,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
  },
  nutritionSecondary: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  nutritionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  nutritionPercent: {
    fontSize: 14,
    color: Colors.lightText,
    marginRight: 6,
  },
  nutritionHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 14,
    color: Colors.lightText,
    flex: 1,
  },
  nutritionHeaderLabel: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  nutritionHeaderValue: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  subNutrientContainer: {
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: 12,
  },
});
