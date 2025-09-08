import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { X, ChevronLeft, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

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
  value: string;
  isHeader?: boolean;
}

const NutritionRow: React.FC<NutritionRowProps> = ({ label, value, isHeader = false }) => (
  <View style={[styles.nutritionRow, isHeader && styles.nutritionHeaderRow]}>
    <Text style={[styles.nutritionLabel, isHeader && styles.nutritionHeaderLabel]}>{label}</Text>
    <Text style={[styles.nutritionValue, isHeader && styles.nutritionHeaderValue]}>{value}</Text>
  </View>
);

export const NutritionDetailModal: React.FC<NutritionDetailModalProps> = ({
  visible,
  onClose,
  calories,
  protein,
  carbs,
  fats,
  goals,
}) => {
  const remainingCalories = Math.max(0, goals.dailyCalories - calories);
  
  // Calculate detailed nutrition breakdown (mock data - replace with real data)
  const detailedNutrition = {
    // Fats breakdown
    saturatedFat: Math.round(fats * 0.3),
    monounsaturatedFat: Math.round(fats * 0.4),
    polyunsaturatedFat: Math.round(fats * 0.2),
    transFat: Math.round(fats * 0.1),
    
    // Other nutrients
    cholesterol: Math.round(calories * 0.1),
    sodium: Math.round(calories * 2.3),
    salt: Math.round(calories * 0.006),
    water: Math.round(calories * 1.2),
    alcohol: 0,
    
    // Vitamins (mock percentages of daily value)
    vitaminA: Math.round(Math.random() * 100),
    vitaminB1: Math.round(Math.random() * 100),
    vitaminB11: Math.round(Math.random() * 100),
    vitaminB12: Math.round(Math.random() * 100),
    vitaminB2: Math.round(Math.random() * 100),
    vitaminB3: Math.round(Math.random() * 100),
    vitaminB5: Math.round(Math.random() * 100),
    vitaminB6: Math.round(Math.random() * 100),
    vitaminB7: Math.round(Math.random() * 100),
    vitaminC: Math.round(Math.random() * 100),
    vitaminD: Math.round(Math.random() * 100),
    vitaminE: Math.round(Math.random() * 100),
    vitaminK: Math.round(Math.random() * 100),
    
    // Minerals
    calcium: Math.round(Math.random() * 100),
    copper: Math.round(Math.random() * 100),
    iron: Math.round(Math.random() * 100),
    magnesium: Math.round(Math.random() * 100),
    manganese: Math.round(Math.random() * 100),
    phosphorus: Math.round(Math.random() * 100),
    potassium: Math.round(Math.random() * 100),
    selenium: Math.round(Math.random() * 100),
    zinc: Math.round(Math.random() * 100),
  };

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
          <Text style={styles.headerTitle}>Today</Text>
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
                current={calories}
                goal={goals.dailyCalories}
                unit="kcal"
                color="#FDB813"
              />
              <ProgressBar
                label="Carbs"
                current={carbs}
                goal={goals.carbs}
                unit="g"
                color="#45B7D1"
              />
              <ProgressBar
                label="Protein"
                current={protein}
                goal={goals.protein}
                unit="g"
                color="#FF6B6B"
              />
              <ProgressBar
                label="Fat"
                current={fats}
                goal={goals.fats}
                unit="g"
                color="#4ECDC4"
              />
            </View>
          </View>

          {/* Meals Section */}
          <View style={styles.section}>
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
            
            {/* Macronutrients */}
            <View style={styles.nutritionCard}>
              <NutritionRow label="Calories" value={`${Math.round(calories)} kcal`} isHeader />
              <NutritionRow label="Protein" value={`${Math.round(protein)} g`} isHeader />
              <NutritionRow label="Carbs" value={`${Math.round(carbs)} g`} isHeader />
              <View style={styles.subNutrientContainer}>
                <NutritionRow label="Dietary Fiber" value="-- g" />
                <NutritionRow label="Total Sugars" value="-- g" />
                <NutritionRow label="Added Sugars" value="-- g" />
              </View>
              
              <NutritionRow label="Fat" value={`${Math.round(fats)} g`} isHeader />
              <View style={styles.subNutrientContainer}>
                <NutritionRow label="Saturated Fat" value={`${detailedNutrition.saturatedFat} g`} />
                <NutritionRow label="Monounsaturated Fat" value={`${detailedNutrition.monounsaturatedFat} g`} />
                <NutritionRow label="Polyunsaturated Fat" value={`${detailedNutrition.polyunsaturatedFat} g`} />
                <NutritionRow label="Trans Fat" value={`${detailedNutrition.transFat} g`} />
              </View>
            </View>

            {/* Other Nutrients */}
            <View style={styles.nutritionCard}>
              <NutritionRow label="Other" value="" isHeader />
              <NutritionRow label="Cholesterol" value={`${detailedNutrition.cholesterol} mg`} />
              <NutritionRow label="Sodium" value={`${detailedNutrition.sodium} mg`} />
              <NutritionRow label="Salt" value={`${detailedNutrition.salt} g`} />
              <NutritionRow label="Water" value={`${detailedNutrition.water} ml`} />
              <NutritionRow label="Alcohol" value={`${detailedNutrition.alcohol} g`} />
            </View>

            {/* Vitamins */}
            <View style={styles.nutritionCard}>
              <NutritionRow label="Vitamins" value="" isHeader />
              <NutritionRow label="Vitamin A" value={`${detailedNutrition.vitaminA}% DV`} />
              <NutritionRow label="Vitamin B1 (Thiamin)" value={`${detailedNutrition.vitaminB1}% DV`} />
              <NutritionRow label="Vitamin B11 (Folic Acid/Folate)" value={`${detailedNutrition.vitaminB11}% DV`} />
              <NutritionRow label="Vitamin B12" value={`${detailedNutrition.vitaminB12}% DV`} />
              <NutritionRow label="Vitamin B2 (Riboflavin)" value={`${detailedNutrition.vitaminB2}% DV`} />
              <NutritionRow label="Vitamin B3 (Niacin)" value={`${detailedNutrition.vitaminB3}% DV`} />
              <NutritionRow label="Vitamin B5 (Pantothenic Acid)" value={`${detailedNutrition.vitaminB5}% DV`} />
              <NutritionRow label="Vitamin B6" value={`${detailedNutrition.vitaminB6}% DV`} />
              <NutritionRow label="Vitamin B7 (Biotin)" value={`${detailedNutrition.vitaminB7}% DV`} />
              <NutritionRow label="Vitamin C" value={`${detailedNutrition.vitaminC}% DV`} />
              <NutritionRow label="Vitamin D" value={`${detailedNutrition.vitaminD}% DV`} />
              <NutritionRow label="Vitamin E" value={`${detailedNutrition.vitaminE}% DV`} />
              <NutritionRow label="Vitamin K" value={`${detailedNutrition.vitaminK}% DV`} />
            </View>

            {/* Minerals */}
            <View style={styles.nutritionCard}>
              <NutritionRow label="Minerals" value="" isHeader />
              <NutritionRow label="Calcium" value={`${detailedNutrition.calcium}% DV`} />
              <NutritionRow label="Copper" value={`${detailedNutrition.copper}% DV`} />
              <NutritionRow label="Iron" value={`${detailedNutrition.iron}% DV`} />
              <NutritionRow label="Magnesium" value={`${detailedNutrition.magnesium}% DV`} />
              <NutritionRow label="Manganese" value={`${detailedNutrition.manganese}% DV`} />
              <NutritionRow label="Phosphorus" value={`${detailedNutrition.phosphorus}% DV`} />
              <NutritionRow label="Potassium" value={`${detailedNutrition.potassium}% DV`} />
              <NutritionRow label="Selenium" value={`${detailedNutrition.selenium}% DV`} />
              <NutritionRow label="Zinc" value={`${detailedNutrition.zinc}% DV`} />
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
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
