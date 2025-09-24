import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { FlatList, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import { useNutrition } from '@/hooks/useNutrition';
import DayCell from './DayCell';
import { FitnessRing, RingSpec } from '@/components/ui/FitnessRing';

interface DateCarouselProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  daysToShow?: number;
}

const DateCarousel: React.FC<DateCarouselProps> = ({
  selectedDate,
  onSelectDate,
  daysToShow = 7,
}) => {
  const listRef = useRef<FlatList<Date> | null>(null);
  const itemWidth = 64; // width of the day bubble
  const itemMargin = 8;
  const totalItemSize = itemWidth + itemMargin * 2;
  const windowWidth = Dimensions.get('window').width;
  const centerIndex = Math.floor(daysToShow / 2);

  const { loggedMeals, goals } = useNutrition();

  const buildDates = useCallback(() => {
    const center = new Date(selectedDate);
    const arr: Date[] = [];
    for (let i = -centerIndex; i <= centerIndex; i++) {
      const d = new Date(center);
      d.setDate(center.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [selectedDate, daysToShow, centerIndex]);

  const dates = useMemo(buildDates, [buildDates]);

  useEffect(() => {
    // always scroll so the selected item sits at the center position
    // using viewPosition 0.5 centers the item in the viewport
    listRef.current?.scrollToIndex({ index: centerIndex, animated: true, viewPosition: 0.5 });
  }, [selectedDate, centerIndex]);

  const handleDatePress = useCallback((iso: string) => {
    onSelectDate(iso);
  }, [onSelectDate]);

  const renderItem = useCallback(({ item }: { item: Date }) => {
    const d = item;
    const iso = d.toISOString().split('T')[0];
    const isSel = iso === selectedDate;
    const todayISO = new Date().toISOString().split('T')[0];
    const isToday = iso === todayISO;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];
    const isYesterday = iso === yesterdayISO;
    const isFuture = new Date(iso) > new Date(todayISO);

    // Optional status for the selected day only, driven by existing daily state
    let status: 'met' | 'missed' | undefined;
    if (isSel) {
      const calorieGoal = goals?.dailyCalories ?? 0;
      const dayTotals = loggedMeals
        .filter(m => m.date === iso)
        .reduce((acc, m) => ({ calories: acc.calories + m.calories }), { calories: 0 });
      status = calorieGoal > 0 && dayTotals.calories >= calorieGoal ? 'met' : undefined;
    }

    // Build per-day macro rings (outer->inner): Carbs, Protein, Fat
    const dayMacros = loggedMeals
      .filter((m) => m.date === iso)
      .reduce(
        (acc, m) => ({
          carbs: acc.carbs + m.carbs,
          protein: acc.protein + m.protein,
          fats: acc.fats + m.fats,
        }),
        { carbs: 0, protein: 0, fats: 0 }
      );
    const carbGoal = goals?.carbs || 0;
    const proteinGoal = goals?.protein || 0;
    const fatGoal = goals?.fats || 0;
    const rings: RingSpec[] = [
      { pct: carbGoal ? Math.min(1, dayMacros.carbs / carbGoal) : 0, color: Colors.nutrition.carbs },
      { pct: proteinGoal ? Math.min(1, dayMacros.protein / proteinGoal) : 0, color: Colors.nutrition.protein },
      { pct: fatGoal ? Math.min(1, dayMacros.fats / fatGoal) : 0, color: Colors.nutrition.fats },
    ];

    return (
      <DayCell
        date={d}
        selected={isSel}
        isToday={isToday}
        isYesterday={isYesterday}
        isFuture={isFuture}
        status={status}
        rings={rings}
        onPress={() => handleDatePress(iso)}
      />
    );
  }, [selectedDate, goals, loggedMeals, handleDatePress]);

  return (
    <FlatList
      ref={(r) => { listRef.current = r; }}
      horizontal
      data={dates}
      keyExtractor={(d) => d.toISOString()}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Math.max(12, (windowWidth - itemWidth) / 2 - itemMargin)
      }}
      renderItem={renderItem}
      snapToInterval={totalItemSize}
      decelerationRate="fast"
      getItemLayout={(_, index) => ({ length: totalItemSize, offset: totalItemSize * index, index })}
      initialScrollIndex={centerIndex}
    />
  );
};

export default React.memo(DateCarousel);
