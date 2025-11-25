import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import ScaleIcon from '@/assets/icons/Scale.svg';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { WeightTrackingHandle } from '@/hooks/useWeightTracking';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface WeightCardProps {
  onUpdateWeight: () => void;
  tracking: WeightTrackingHandle;
}

const formatKg = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return `${value.toFixed(1)} kg`;
};

export const WeightCard: React.FC<WeightCardProps> = ({ onUpdateWeight, tracking }) => {
  const { goal, getCurrentWeight, getProgressStats } = tracking;

  const currentEntry = getCurrentWeight();
  const currentWeight = typeof currentEntry?.weight === 'number' ? currentEntry.weight : null;
  const goalStartWeight = typeof goal?.startWeight === 'number' ? goal.startWeight : null;
  const goalTargetWeight = typeof goal?.targetWeight === 'number' ? goal.targetWeight : null;

  const startWeight = goalStartWeight ?? currentWeight;
  const targetWeight = goalTargetWeight;

  // A goal exists if we have both start and target weights (even if they're equal for 'maintain')
  const hasGoal = goalStartWeight != null && goalTargetWeight != null;
  const progressStats = getProgressStats();
  const progressRatio = hasGoal ? Math.max(0, Math.min(1, progressStats.progress / 100)) : 0;

  const change = startWeight != null && currentWeight != null ? currentWeight - startWeight : null;
  
  // Determine goal direction with tolerance for maintain (within 0.5kg is considered maintain)
  const goalDirection = hasGoal && goalStartWeight != null && goalTargetWeight != null
    ? Math.abs(goalTargetWeight - goalStartWeight) < 0.5
      ? 'maintain'
      : goalTargetWeight > goalStartWeight
        ? 'gain'
        : 'lose'
    : null;

  let headline = 'Log your weight';
  if (typeof change === 'number') {
    const delta = Math.abs(change).toFixed(1);
    if (Math.abs(change) < 0.05 && currentWeight != null) {
      headline = `You're at ${currentWeight.toFixed(1)} kg`;
    } else if (change < 0) {
      headline = `You've lost ${delta} kg`;
    } else if (change > 0) {
      headline = `You've gained ${delta} kg`;
    }
  }

  let subtitle = 'Keep us posted on your latest weigh-ins to unlock deeper insights.';
  if (hasGoal && currentWeight != null && targetWeight != null && goalDirection) {
    if (goalDirection === 'maintain') {
      // For maintain goal, check if weight is within acceptable range (±1kg)
      const variance = Math.abs(currentWeight - targetWeight);
      if (variance < 1.0) {
        subtitle = `Maintaining at ${targetWeight.toFixed(1)} kg. Keep it up! 💪`;
      } else if (currentWeight > targetWeight) {
        subtitle = `${variance.toFixed(1)} kg above target. Stay mindful to maintain ${targetWeight.toFixed(1)} kg.`;
      } else {
        subtitle = `${variance.toFixed(1)} kg below target. Keep consistent to maintain ${targetWeight.toFixed(1)} kg.`;
      }
    } else {
      const remaining = goalDirection === 'lose'
        ? Math.max(0, currentWeight - targetWeight)
        : Math.max(0, targetWeight - currentWeight);
      const reachedGoal = remaining < 0.1;
      
      if (reachedGoal) {
        subtitle = 'You reached your goal weight! 🎉';
      } else if (goalDirection === 'lose') {
        subtitle = `${remaining.toFixed(1)} kg to go until ${targetWeight.toFixed(1)} kg`;
      } else if (goalDirection === 'gain') {
        subtitle = `${remaining.toFixed(1)} kg to reach ${targetWeight.toFixed(1)} kg`;
      }
    }
  } else if (!goal?.targetWeight) {
    subtitle = 'Set a goal weight to stay motivated.';
  }

  return (
    <ProgressCardContainer style={styles.card} padding={Spacing.xl}>
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Weight Goal</Text>

        <View style={styles.scaleContainer}>
          <View style={styles.scaleVisual}>
            <ScaleIcon width={132} height={132} />
          </View>
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {hasGoal && startWeight != null && targetWeight != null ? (
          <View style={styles.progressSection}>
            {goalDirection === 'maintain' ? (
              // For maintain goal, show current weight with range indicator
              <View style={styles.maintainIndicator}>
                <Text style={styles.maintainLabel}>Target: {formatKg(targetWeight)}</Text>
                <Text style={styles.maintainCurrent}>Current: {formatKg(currentWeight)}</Text>
                {currentWeight != null && Math.abs(currentWeight - targetWeight) < 1.0 && (
                  <Text style={styles.maintainSuccess}>✓ Within range</Text>
                )}
              </View>
            ) : (
              // For lose/gain goals, show progress bar
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>{formatKg(startWeight) ?? '--'}</Text>
                  <Text style={styles.progressLabel}>{formatKg(targetWeight) ?? '--'}</Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={styles.emptyProgress}>
            <Text style={styles.emptyProgressText}>Add a weight goal to see your progress here.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.updateButton} onPress={onUpdateWeight} activeOpacity={0.9}>
          <Text style={styles.updateButtonText}>Update your weight</Text>
        </TouchableOpacity>
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  content: {
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.lightText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    alignSelf: 'center',
  },
  scaleContainer: {
    marginVertical: Spacing.lg,
    alignItems: 'center',
    width: 132,
    height: 132,
    overflow: 'visible',
  },
  scaleVisual: {
    transform: [{ scale: 1.25 }], // +25% visual scale only
  },
  headline: {
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    lineHeight: 22,
    color: Colors.lightText,
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.successLight,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.success,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  emptyProgress: {
    width: '100%',
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.successLight,
  },
  emptyProgressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.successDark,
    textAlign: 'center',
  },
  updateButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignSelf: 'center',
  },
  updateButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  maintainIndicator: {
    width: '100%',
    padding: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  maintainLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  maintainCurrent: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  maintainSuccess: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
});
