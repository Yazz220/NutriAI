import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { NutritionTrends } from '@/components/nutrition/NutritionTrends';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';

export default function TrendsFullScreen() {
  const { weeklyTrends, getDailyProgress } = useNutritionWithMealPlan();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  return (
    <SafeAreaView style={styles.container}>
      <NutritionTrends
        weeklyTrends={weeklyTrends}
        getDailyProgress={getDailyProgress}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        fullScreen
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

