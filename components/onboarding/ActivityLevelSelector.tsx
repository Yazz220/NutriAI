import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { OptionCard } from './OptionCard';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

export type ActivityLevel = 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active';

interface ActivityLevelSelectorProps {
  value: ActivityLevel | null;
  onValueChange: (level: ActivityLevel) => void;
  disabled?: boolean;
  variant?: 'detailed' | 'compact';
  levels?: ActivityLevel[]; // optional subset ordering for compact
}

const activityLevels: Array<{
  id: ActivityLevel;
  title: string;
  description: string;
  examples: string;
  icon: string;
  multiplier: number;
}> = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    description: 'Little or no exercise',
    examples: 'Desk job, minimal physical activity',
    icon: '🪑',
    multiplier: 1.2
  },
  {
    id: 'lightly-active',
    title: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
    examples: 'Walking, light yoga, occasional gym',
    icon: '🚶',
    multiplier: 1.375
  },
  {
    id: 'moderately-active',
    title: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    examples: 'Regular gym, sports, active lifestyle',
    icon: '🏃',
    multiplier: 1.55
  },
  {
    id: 'very-active',
    title: 'Very Active',
    description: 'Hard exercise 6-7 days/week',
    examples: 'Daily workouts, competitive sports',
    icon: '💪',
    multiplier: 1.725
  },
  {
    id: 'extremely-active',
    title: 'Extremely Active',
    description: 'Very hard exercise, physical job',
    examples: 'Professional athlete, manual labor',
    icon: '🏋️',
    multiplier: 1.9
  }
];

export function ActivityLevelSelector({
  value,
  onValueChange,
  disabled = false,
  variant = 'detailed',
  levels,
}: ActivityLevelSelectorProps) {

  const handleLevelSelect = (level: ActivityLevel) => {
    onValueChange(level);
  };

  const compactOrder: ActivityLevel[] = ['sedentary', 'lightly-active', 'moderately-active', 'very-active'];
  const list = (levels && levels.length ? levels : (variant === 'compact' ? compactOrder : activityLevels.map(a => a.id)))
    .map(id => activityLevels.find(a => a.id === id)!)
    .filter(Boolean);

  return (
    <View style={styles.container}>
      {variant === 'detailed' && (
        <View style={styles.header}>
          <Text style={styles.title}>Activity Level</Text>
          <Text style={styles.subtitle}>
            How active are you on a typical day?
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {list.map((level, idx) => (
          <View key={level.id} style={styles.optionContainer}>
            <OptionCard
              title={level.title}
              description={variant === 'compact' ? level.description : level.description}
              icon={variant === 'compact' ? <BarsIcon bars={idx + 1} /> : <Text style={styles.optionIcon}>{level.icon}</Text>}
              selected={value === level.id}
              onPress={() => handleLevelSelect(level.id)}
              disabled={disabled}
              accessibilityLabel={`Select ${level.title} activity level`}
              accessibilityHint={level.description}
            />

            {variant === 'detailed' && (
              <View style={styles.detailsContainer}>
                <Text style={styles.examplesText}>{level.examples}</Text>
                <View style={styles.multiplierContainer}>
                  <Text style={styles.multiplierLabel}>Calorie multiplier:</Text>
                  <Text style={styles.multiplierValue}>{level.multiplier}x</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {variant === 'detailed' && value && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedTitle}>Selected: {activityLevels.find(l => l.id === value)?.title}</Text>
          <Text style={styles.selectedDescription}>
            This will be used to calculate your daily calorie needs
          </Text>
        </View>
      )}
    </View>
  );
}

function BarsIcon({ bars }: { bars: number }) {
  // Render 4 bars with increasing height, highlight up to `bars`
  const heights = [10, 16, 22, 28];
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{ width: 6, height: h, borderRadius: 3, backgroundColor: i < bars ? Colors.secondary : Colors.lightGray }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
    maxHeight: 400, // Prevent taking too much space
  },
  optionContainer: {
    marginBottom: Spacing.md,
  },
  optionIcon: {
    fontSize: 24,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  examplesText: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  multiplierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiplierLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginRight: 4,
  },
  multiplierValue: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  selectedInfo: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  selectedDescription: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 16,
  },
});