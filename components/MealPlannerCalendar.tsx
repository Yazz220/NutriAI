import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { WeeklyMealPlan, PlannedMeal, MealType } from '@/types';
import { useMeals } from '@/hooks/useMealsStore';

interface MealPlannerCalendarProps {
  weeklyPlan: WeeklyMealPlan;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onDayPress: (date: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

const MEAL_TYPE_COLORS = {
  breakfast: '#FFE4B5',
  lunch: '#E6F3FF',
  dinner: '#F0E6FF',
  snack: '#E6FFE6',
};

const MEAL_TYPE_LABELS = {
  breakfast: 'B',
  lunch: 'L',
  dinner: 'D',
  snack: 'S',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  navigationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  calendarGrid: {
    flexDirection: 'row',
    minHeight: 120,
  },
  dayColumn: {
    flex: 1,
    marginHorizontal: 2,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    marginBottom: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  dayNumber: {
    fontSize: 10,
    color: Colors.lightText,
    marginTop: 2,
  },
  dayContent: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 4,
    minHeight: 80,
  },
  mealSlot: {
    marginBottom: 2,
    minHeight: 20,
  },
  mealItem: {
    backgroundColor: Colors.white,
    borderRadius: 4,
    padding: 4,
    marginBottom: 2,
    borderLeftWidth: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mealText: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '500',
  },
  mealType: {
    fontSize: 8,
    color: Colors.lightText,
    marginTop: 1,
  },
  addMealButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addMealText: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
  },
  todayIndicator: {
    backgroundColor: Colors.primary,
  },
  todayText: {
    color: Colors.white,
  },
  completedMeal: {
    opacity: 0.6,
  },
  emptySlot: {
    height: 20,
  },
});

export const MealPlannerCalendar: React.FC<MealPlannerCalendarProps> = ({
  weeklyPlan,
  onPreviousWeek,
  onNextWeek,
  onDayPress,
  onMealPress,
}) => {
  const { meals } = useMeals();
  const formatWeekTitle = (weekStartDate: string): string => {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  };

  const isToday = (date: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const getMealTypeColor = (mealType: MealType): string => {
    return MEAL_TYPE_COLORS[mealType] || MEAL_TYPE_COLORS.snack;
  };

  const renderMealItem = (meal: PlannedMeal) => {
    const recipe = meals.find(m => m.id === meal.recipeId);
    const recipeName = recipe ? recipe.name : `Recipe ${meal.recipeId.slice(-4)}`;
    
    return (
      <TouchableOpacity
        key={meal.id}
        style={[
          styles.mealItem,
          { borderLeftColor: getMealTypeColor(meal.mealType) },
          meal.isCompleted && styles.completedMeal,
        ]}
        onPress={() => onMealPress(meal)}
      >
        <Text style={styles.mealText} numberOfLines={1}>
          {recipeName}
        </Text>
        <Text style={styles.mealType}>
          {MEAL_TYPE_LABELS[meal.mealType]} • {meal.servings}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDayColumn = (dayData: typeof weeklyPlan.days[0], index: number) => {
    const date = new Date(dayData.date);
    const dayNumber = date.getDate();
    const isCurrentDay = isToday(dayData.date);

    // Group meals by type for better organization
    const mealsByType = MEAL_TYPES.reduce((acc, mealType) => {
      acc[mealType] = dayData.meals.filter(meal => meal.mealType === mealType);
      return acc;
    }, {} as Record<MealType, PlannedMeal[]>);

    return (
      <View key={dayData.date} style={styles.dayColumn}>
        <TouchableOpacity
          style={[styles.dayHeader, isCurrentDay && styles.todayIndicator]}
          onPress={() => onDayPress(dayData.date)}
        >
          <Text style={[styles.dayHeaderText, isCurrentDay && styles.todayText]}>
            {DAYS_OF_WEEK[index]}
          </Text>
          <Text style={[styles.dayNumber, isCurrentDay && styles.todayText]}>
            {dayNumber}
          </Text>
        </TouchableOpacity>

        <View style={styles.dayContent}>
          {MEAL_TYPES.map(mealType => (
            <View key={mealType} style={styles.mealSlot}>
              {mealsByType[mealType].length > 0 ? (
                mealsByType[mealType].map(renderMealItem)
              ) : (
                <View style={styles.emptySlot} />
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.addMealButton}
            onPress={() => onDayPress(dayData.date)}
          >
            <Plus size={12} color={Colors.primary} />
            <Text style={styles.addMealText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navigationButton} onPress={onPreviousWeek}>
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.weekTitle}>
          {formatWeekTitle(weeklyPlan.weekStartDate)}
        </Text>
        
        <TouchableOpacity style={styles.navigationButton} onPress={onNextWeek}>
          <ChevronRight size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.calendarGrid}>
          {weeklyPlan.days.map((dayData, index) => renderDayColumn(dayData, index))}
        </View>
      </ScrollView>
    </View>
  );
};