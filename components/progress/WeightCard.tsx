import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { GlassSurface } from '@/components/common/GlassSurface';

interface WeightCardProps {
  onPress: () => void;
}

export const WeightCard: React.FC<WeightCardProps> = ({ onPress }) => {
  const { getCurrentWeight, goal } = useWeightTracking();
  const currentWeight = getCurrentWeight();
  
  // Mock data for demonstration - in a real app, this would come from user profile
  const currentWeightValue = currentWeight?.weight || 119.4;
  const goalWeight = goal?.targetWeight || 54.4;
  
  const progress = goalWeight > 0 ? Math.max(0, Math.min(1, (currentWeightValue - goalWeight) / (currentWeightValue - goalWeight))) : 0;
  const progressPercentage = Math.round(progress * 100);

  const formatLastWeighIn = () => {
    if (!currentWeight) return '7d';
    
    const entryDate = new Date(currentWeight.date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return '1d';
    return `${daysDiff}d`;
  };

  return (
    <GlassSurface pressable onPress={onPress} style={styles.card} padding={20}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title}>My Weight</Text>
        </View>
        
        <View style={styles.weightDisplay}>
          <Text style={styles.currentWeight}>{currentWeightValue.toFixed(1)} kg</Text>
          <Text style={styles.goalWeight}>Goal {goalWeight.toFixed(1)} kg</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.nextWeighIn}>Next weigh-in: {formatLastWeighIn()}</Text>
        </View>
      </View>
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 0, // padding handled by GlassSurface
    marginVertical: 8,
  },
  cardContent: {
    // No specific styling needed
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  weightDisplay: {
    marginBottom: 12,
  },
  currentWeight: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  goalWeight: {
    fontSize: 14,
    color: Colors.lightText,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  footer: {
    // No specific styling needed
  },
  nextWeighIn: {
    fontSize: 14,
    color: Colors.lightText,
  },
});
