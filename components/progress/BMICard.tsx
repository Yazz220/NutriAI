import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

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

function computeMarkerPosition(bmi?: number) {
  if (!bmi || Number.isNaN(bmi)) return 0;
  if (bmi <= 18.5) return 0.12;
  if (bmi <= 25) return 0.38;
  if (bmi <= 30) return 0.68;
  return 0.95;
}

export const BMICard: React.FC<BMICardProps> = ({ onPress, onHelpPress, heightCm, weightKg }) => {
  const hasMetrics = Boolean(heightCm && weightKg && heightCm > 0);
  const bmi = hasMetrics ? weightKg! / Math.pow((heightCm! / 100), 2) : undefined;
  const category = bmi
    ? BMI_CATEGORIES.find((entry) => bmi < entry.max) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1]
    : undefined;
  const position = computeMarkerPosition(bmi);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
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
              <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
              <Text style={styles.bmiDescription}>
                You&apos;re currently{' '}
                <Text style={[styles.categoryText, { color: category?.color ?? Colors.text }]}>
                  {category?.label ?? 'in range'}
                </Text>
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                {SEGMENT_COLORS.map((segment) => (
                  <View key={segment} style={[styles.progressSegment, { backgroundColor: segment }]} />
                ))}
              </View>
              <View style={[styles.marker, { left: `${position * 100}%` }]} />
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardContent: {},
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
  progressSegment: {
    flex: 1,
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

