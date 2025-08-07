import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { WeeklyMealPlan } from '@/types';

interface NutritionSummaryProps {
  weeklyPlan: WeeklyMealPlan;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  placeholder: {
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
});

export const NutritionSummary: React.FC<NutritionSummaryProps> = ({ weeklyPlan }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Activity size={20} color={Colors.primary} />
        <Text style={styles.title}>Nutrition Summary</Text>
      </View>
      
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Nutrition tracking will be implemented in a future update.
        </Text>
      </View>
    </View>
  );
};