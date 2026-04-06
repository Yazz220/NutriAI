import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useMeals } from '@/hooks/useMealsStore';
import { MealPlanModal } from '@/components/MealPlanModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import ScreenHeader from '@/components/ui/ScreenHeader';
import CalendarIcon from '@/assets/icons/Calender.svg';
import { MealType, PlannedMeal, Meal } from '@/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function getWeekDates(offsetWeeks: number): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(toISO(new Date()));
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planMealType, setPlanMealType] = useState<MealType>('dinner');
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | undefined>(undefined);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);

  const { plannedMeals, addPlannedMeal, updatePlannedMeal, removePlannedMeal } = useMealPlanner();
  const { meals: savedRecipes } = useMeals();

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const todayISO = toISO(new Date());

  const mealsForDate = useMemo(() => {
    return plannedMeals.filter((pm) => pm.date === selectedDate);
  }, [plannedMeals, selectedDate]);

  const getMealForType = useCallback(
    (mealType: MealType) => mealsForDate.find((pm) => pm.mealType === mealType),
    [mealsForDate]
  );

  const getRecipeForPlannedMeal = useCallback(
    (pm: PlannedMeal) => savedRecipes.find((r) => r.id === pm.recipeId),
    [savedRecipes]
  );

  const handleAddMeal = (mealType: MealType) => {
    setPlanMealType(mealType);
    setEditingMeal(undefined);
    setShowPlanModal(true);
  };

  const handleEditMeal = (pm: PlannedMeal) => {
    setEditingMeal(pm);
    setPlanMealType(pm.mealType);
    setShowPlanModal(true);
  };

  const handleSavePlan = (planned: Omit<PlannedMeal, 'id'>) => {
    if (editingMeal) {
      updatePlannedMeal({ ...planned, id: editingMeal.id });
    } else {
      addPlannedMeal(planned);
    }
    setShowPlanModal(false);
  };

  const handleRemoveMeal = (pm: PlannedMeal) => {
    removePlannedMeal(pm.id);
  };

  const handleRecipePress = (pm: PlannedMeal) => {
    const recipe = getRecipeForPlannedMeal(pm);
    if (recipe) {
      setDetailMeal(recipe);
      setShowDetailModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="Meal Plan"
        icon={
          <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
            <CalendarIcon width={38} height={38} color={Colors.text} />
          </View>
        }
        includeStatusBarSpacer
        containerStyle={{ paddingBottom: 0, paddingHorizontal: 20 }}
      />

      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)} style={styles.navBtn}>
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {weekDates[0] && weekDates[6]
            ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : ''}
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} style={styles.navBtn}>
          <ChevronRight size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <View style={styles.dayStrip}>
        {weekDates.map((date, idx) => {
          const iso = toISO(date);
          const isSelected = iso === selectedDate;
          const isToday = iso === todayISO;
          const hasPlanned = plannedMeals.some((pm) => pm.date === iso);
          return (
            <TouchableOpacity
              key={iso}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(iso)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {DAY_LABELS[idx]}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isToday && styles.dayNumToday]}>
                {date.getDate()}
              </Text>
              {hasPlanned && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Meal slots for selected day */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (insets?.bottom ?? 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.selectedDateLabel}>
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {MEAL_TYPES.map((mealType) => {
          const planned = getMealForType(mealType);
          const recipe = planned ? getRecipeForPlannedMeal(planned) : undefined;

          return (
            <View key={mealType} style={styles.mealSlot}>
              <View style={styles.mealSlotHeader}>
                <Text style={styles.mealTypeLabel}>{MEAL_LABELS[mealType]}</Text>
                {!planned && (
                  <TouchableOpacity
                    style={styles.addMealBtn}
                    onPress={() => handleAddMeal(mealType)}
                  >
                    <Plus size={16} color={Colors.primary} />
                    <Text style={styles.addMealText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              {planned ? (
                <TouchableOpacity
                  style={styles.plannedCard}
                  onPress={() => handleRecipePress(planned)}
                  activeOpacity={0.8}
                >
                  {recipe?.image ? (
                    <Image source={{ uri: recipe.image }} style={styles.plannedImage} />
                  ) : (
                    <View style={[styles.plannedImage, styles.plannedImagePlaceholder]} />
                  )}
                  <View style={styles.plannedInfo}>
                    <Text style={styles.plannedName} numberOfLines={2}>
                      {recipe?.name || planned.recipeId}
                    </Text>
                    {planned.servings && planned.servings > 1 && (
                      <Text style={styles.plannedServings}>{planned.servings} servings</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removeMealBtn}
                    onPress={() => handleRemoveMeal(planned)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <X size={16} color={Colors.lightText} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptySlot}
                  onPress={() => handleAddMeal(mealType)}
                >
                  <Text style={styles.emptySlotText}>Tap to plan {MEAL_LABELS[mealType].toLowerCase()}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <MealPlanModal
        visible={showPlanModal}
        selectedDate={selectedDate}
        selectedMealType={planMealType}
        existingMeal={editingMeal}
        lockMealType={!!editingMeal}
        onSave={handleSavePlan}
        onClose={() => setShowPlanModal(false)}
        onDelete={editingMeal ? () => { removePlannedMeal(editingMeal.id); setShowPlanModal(false); } : undefined}
      />

      <MealDetailModal
        visible={showDetailModal}
        meal={detailMeal as any}
        onClose={() => setShowDetailModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBtn: {
    padding: 8,
  },
  weekLabel: {
    ...Type.body,
    fontWeight: '600',
    color: Colors.text,
  },
  dayStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayName: {
    ...Type.caption,
    color: Colors.lightText,
    marginBottom: 4,
    fontSize: 11,
  },
  dayNameSelected: {
    color: Colors.white,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  dayNumSelected: {
    color: Colors.white,
  },
  dayNumToday: {
    color: Colors.primary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
  dotSelected: {
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  selectedDateLabel: {
    ...Type.h3,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 16,
  },
  mealSlot: {
    marginBottom: 16,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mealTypeLabel: {
    ...Type.body,
    fontWeight: '700',
    color: Colors.text,
    fontSize: 15,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  addMealText: {
    ...Type.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  plannedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plannedImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  plannedImagePlaceholder: {
    backgroundColor: Colors.secondary,
  },
  plannedInfo: {
    flex: 1,
  },
  plannedName: {
    ...Type.body,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  plannedServings: {
    ...Type.caption,
    color: Colors.lightText,
  },
  removeMealBtn: {
    padding: 4,
    marginLeft: 8,
  },
  emptySlot: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptySlotText: {
    ...Type.caption,
    color: Colors.lightText,
  },
});
