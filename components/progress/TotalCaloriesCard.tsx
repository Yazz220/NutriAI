import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';

interface TotalCaloriesCardProps {
  onPress?: () => void;
}

const timeframes = ['This week', 'Last week', '2 wks. ago', '3 wks. ago'];

export const TotalCaloriesCard: React.FC<TotalCaloriesCardProps> = ({ onPress }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(0);
  const { getDailyProgress } = useNutritionWithMealPlan();
  
  // Mock data - in a real app, this would calculate based on selected timeframe
  const caloriesData = {
    total: 0,
    goal: 2000,
    hasData: false,
  };

  const getTimeframeData = (timeframeIndex: number) => {
    // This would calculate actual calories for the selected timeframe
    return {
      total: timeframeIndex === 0 ? 0 : Math.floor(Math.random() * 2000),
      goal: 2000,
      hasData: timeframeIndex !== 0,
    };
  };

  const currentData = getTimeframeData(selectedTimeframe);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Total Calories</Text>
      </View>
      
      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        {timeframes.map((timeframe, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeframeButton,
              selectedTimeframe === index && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe(index)}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === index && styles.timeframeTextActive,
              ]}
            >
              {timeframe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {currentData.hasData ? (
          <View style={styles.dataContainer}>
            <Text style={styles.caloriesValue}>{currentData.total}</Text>
            <Text style={styles.caloriesLabel}>calories consumed</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(100, (currentData.total / currentData.goal) * 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.goalText}>Goal: {currentData.goal} calories</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <BarChart3 size={32} color={Colors.lightText} />
            </View>
            <Text style={styles.emptyTitle}>No data to show</Text>
            <Text style={styles.emptySubtitle}>
              This will update as you log more food.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  timeframeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  timeframeButtonActive: {
    backgroundColor: Colors.text,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  timeframeTextActive: {
    color: Colors.white,
  },
  content: {
    minHeight: 120,
    justifyContent: 'center',
  },
  dataContainer: {
    alignItems: 'center',
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  caloriesLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  goalText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
});



