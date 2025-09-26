import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { useUserProfileStore } from '@/hooks/useEnhancedUserProfile';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface BMICardProps {
  onPress: () => void;
  onHelpPress?: () => void;
  heightCm?: number | null;
  weightKg?: number | null;
}

const BMI_CATEGORIES = [
  { max: 18.5, label: 'Underweight', color: Colors.info },
  { max: 25, label: 'Healthy', color: Colors.success },
  { max: 30, label: 'Overweight', color: Colors.warning },
  { max: Infinity, label: 'Obese', color: Colors.error },
] as const;

const SEGMENT_COLORS = [Colors.info, Colors.success, Colors.warning, Colors.error] as const;

export const BMICard: React.FC<BMICardProps> = ({ onPress, onHelpPress, heightCm, weightKg }) => {
  // Pull current metrics if props are not provided
  const { getCurrentWeight } = useWeightTracking();
  const currentWeight = getCurrentWeight();
  const { profile } = useUserProfileStore();

  const effectiveWeightKg = typeof weightKg === 'number' ? weightKg : (currentWeight?.weight ?? undefined);
  const effectiveHeightCm = typeof heightCm === 'number' ? heightCm : (profile?.height ? Number(profile.height) : undefined);

  const hasMetrics = Boolean(effectiveHeightCm && effectiveWeightKg && (effectiveHeightCm as number) > 0);
  const bmi = hasMetrics ? (effectiveWeightKg as number) / Math.pow(((effectiveHeightCm as number) / 100), 2) : undefined;
  const category = bmi
    ? BMI_CATEGORIES.find((entry) => bmi < entry.max) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1]
    : undefined;

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={18}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your BMI</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={onHelpPress}
            accessibilityRole="button"
            accessibilityLabel="Learn more about BMI"
          >
            <HelpCircle size={16} color={Colors.lightText} />
          </TouchableOpacity>
        </View>

        {bmi ? (
          <>
            <View style={styles.bmiDisplay}>
              <View style={styles.bmiRow}>
                <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
                <Text style={styles.bmiHelper}> Your weight is </Text>
                <View style={[styles.badge, { backgroundColor: category?.color ?? Colors.text }]}>
                  <Text style={styles.badgeText}>{category?.label ?? 'In range'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                {SEGMENT_COLORS.map((segment) => (
                  <View key={segment} style={[styles.progressSegment, { backgroundColor: segment }]} />
                ))}
              </View>
            </View>

            <View style={styles.legend}>
              {BMI_CATEGORIES.map((entry) => (
                <View key={entry.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
                  <Text style={styles.legendText}>{entry.label}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.bmiValue}>--</Text>
            <Text style={styles.emptyText}>Add your latest height and weight to see your BMI zone.</Text>
          </View>
        )}
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
  },
  cardContent: {},
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  helpButton: {
    position: 'absolute',
    right: 0,
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
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bmiValue: {
    fontSize: 40,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  bmiHelper: {
    fontSize: 14,
    color: Colors.lightText,
    marginLeft: 8,
    marginRight: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  progressBarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressSegment: {
    flex: 1,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.lightText,
    textAlign: 'center',
  },
});

