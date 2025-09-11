import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';

interface BMICardProps {
  onPress: () => void;
}

export const BMICard: React.FC<BMICardProps> = ({ onPress }) => {
  const { getCurrentWeight } = useWeightTracking();
  const currentWeight = getCurrentWeight();
  
  // Mock height - in a real app, this would come from user profile
  const height = 1.75; // 175cm in meters
  const bmi = currentWeight ? (currentWeight.weight / (height * height)) : 274.1; // Using mock value from screenshot
  
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#3B82F6', position: 0.1 };
    if (bmi < 25) return { category: 'Normal', color: '#22C55E', position: 0.4 };
    if (bmi < 30) return { category: 'Overweight', color: '#F59E0B', position: 0.7 };
    return { category: 'Obese', color: '#EF4444', position: 0.95 };
  };

  const bmiData = getBMICategory(bmi);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your BMI</Text>
          <TouchableOpacity style={styles.helpButton}>
            <HelpCircle size={16} color={Colors.lightText} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.bmiDisplay}>
          <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
          <Text style={styles.bmiDescription}>
            Your weight is <Text style={[styles.categoryText, { color: bmiData.color }]}>{bmiData.category}</Text>
          </Text>
        </View>

        {/* Color-coded progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressBarBlue, { flex: 1 }]} />
            <View style={[styles.progressBarGreen, { flex: 1 }]} />
            <View style={[styles.progressBarYellow, { flex: 1 }]} />
            <View style={[styles.progressBarRed, { flex: 1 }]} />
          </View>
          <View style={[styles.marker, { left: `${bmiData.position * 100}%` }]} />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Underweight</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>Healthy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Overweight</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Obese</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  cardContent: {
    // No specific styling needed
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmiDisplay: {
    marginBottom: 20,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  bmiDescription: {
    fontSize: 14,
    color: Colors.lightText,
  },
  categoryText: {
    fontWeight: Typography.weights.semibold,
  },
  progressBarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarBlue: {
    backgroundColor: '#3B82F6',
  },
  progressBarGreen: {
    backgroundColor: '#22C55E',
  },
  progressBarYellow: {
    backgroundColor: '#F59E0B',
  },
  progressBarRed: {
    backgroundColor: '#EF4444',
  },
  marker: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 16,
    backgroundColor: Colors.text,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.lightText,
  },
});
