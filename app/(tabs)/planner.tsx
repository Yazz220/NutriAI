import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Calendar, ChefHat } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMeals } from '@/hooks/useMealsStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { MealPlannerCalendar } from '@/components/MealPlannerCalendar';
import { NutritionSummary } from '@/components/NutritionSummary';
import { MealPlanModal } from '@/components/MealPlanModal';
import { CookMealModal } from '@/components/CookMealModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PlannedMeal } from '@/types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  sectionContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  quickActionText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 24,
  },
  getStartedButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  getStartedText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function PlannerScreen() {
  const { isLoading, getWeeklyMealPlan, getWeekStartDate, addPlannedMeal, plannedMeals } = useMealPlanner();
  const { inventory } = useInventory();
  const { meals } = useMeals();
  const { generateShoppingListFromMealPlan } = useShoppingList();
  
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return getWeekStartDate(today);
  });
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showCookModal, setShowCookModal] = useState(false);
  const [selectedMealToCook, setSelectedMealToCook] = useState<PlannedMeal | null>(null);

  const weeklyPlan = getWeeklyMealPlan(selectedWeekStart);
  const hasPlannedMeals = weeklyPlan.days.some(day => day.meals.length > 0);

  const handlePreviousWeek = () => {
    const currentWeek = new Date(selectedWeekStart);
    currentWeek.setDate(currentWeek.getDate() - 7);
    setSelectedWeekStart(currentWeek.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const currentWeek = new Date(selectedWeekStart);
    currentWeek.setDate(currentWeek.getDate() + 7);
    setSelectedWeekStart(currentWeek.toISOString().split('T')[0]);
  };

  const handleAddMeal = (date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    setSelectedDate(targetDate);
    setShowMealPlanModal(true);
  };

  const handleGenerateShoppingList = () => {
    try {
      const addedCount = generateShoppingListFromMealPlan(plannedMeals, meals, inventory);
      Alert.alert(
        'Shopping List Updated',
        `Added ${addedCount} missing ingredients to your shopping list.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate shopping list. Please try again.');
    }
  };

  const handleSavePlannedMeal = (plannedMeal: Omit<PlannedMeal, 'id'>) => {
    addPlannedMeal(plannedMeal);
    setShowMealPlanModal(false);
  };

  const handleDayPress = (date: string) => {
    handleAddMeal(date);
  };

  const handleMealPress = (meal: PlannedMeal) => {
    setSelectedMealToCook(meal);
    setShowCookModal(true);
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading your meal plan..." />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Meal Planner',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handleAddMeal}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Calendar Section */}
        <Card style={styles.calendarCard}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          
          <MealPlannerCalendar
            weeklyPlan={weeklyPlan}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onDayPress={handleDayPress}
            onMealPress={handleMealPress}
          />
        </Card>

        {/* Quick Actions Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <ChefHat size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleAddMeal}>
              <Plus size={16} color={Colors.white} />
              <Text style={styles.quickActionText}>Add Meal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { opacity: hasPlannedMeals ? 1 : 0.5 }]} 
              onPress={handleGenerateShoppingList}
              disabled={!hasPlannedMeals}
            >
              <Text style={styles.quickActionText}>Shopping List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition Summary Section */}
        {hasPlannedMeals && (
          <View style={styles.sectionContainer}>
            <NutritionSummary weeklyPlan={weeklyPlan} />
          </View>
        )}

        {/* Empty State */}
        {!hasPlannedMeals && (
          <View style={styles.sectionContainer}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No meals planned yet</Text>
              <Text style={styles.emptySubtext}>
                Start planning your meals to see your weekly overview and get personalized recommendations.
              </Text>
              <TouchableOpacity style={styles.getStartedButton} onPress={() => handleAddMeal()}>
                <Text style={styles.getStartedText}>Plan Your First Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Meal Plan Modal */}
      <MealPlanModal
        visible={showMealPlanModal}
        selectedDate={selectedDate}
        onSave={handleSavePlannedMeal}
        onClose={() => setShowMealPlanModal(false)}
      />

      {/* Cook Meal Modal */}
      <CookMealModal
        visible={showCookModal}
        plannedMeal={selectedMealToCook}
        onClose={() => {
          setShowCookModal(false);
          setSelectedMealToCook(null);
        }}
      />
    </View>
  );
}