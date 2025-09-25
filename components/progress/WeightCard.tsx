import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import ScaleIcon from '@/assets/icons/Scale.svg';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface WeightCardProps {
  onPress: () => void;
}

export const WeightCard: React.FC<WeightCardProps> = ({ onPress }) => {
  const { goal } = useWeightTracking();
  const goalWeight = goal?.targetWeight;

  const goalLabel = typeof goalWeight === 'number'
    ? `Goal weight: ${goalWeight.toFixed(1)} kg`
    : 'Set a goal weight to stay motivated';

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={Spacing.xl}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title}>My Weight</Text>
        </View>

        <View style={styles.illustration}>
          <ScaleIcon width={152} height={152} />
        </View>

        <Text style={styles.goalText}>{goalLabel}</Text>
        <Text style={styles.helperText}>
          Keep us posted on your latest weigh-ins to unlock deeper insights.
        </Text>

        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>Update weight</Text>
        </View>
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 0,
    marginVertical: 8,
  },
  cardContent: {
    alignItems: 'center',
  },
  header: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  illustration: {
    marginBottom: Spacing.md,
  },
  goalText: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  cta: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
