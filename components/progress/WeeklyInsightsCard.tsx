import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface WeeklyInsightsCardProps {
  positiveInsight?: string;
  improvementIdea?: string;
  coachingTip?: string;
}

export const WeeklyInsightsCard: React.FC<WeeklyInsightsCardProps> = ({
  positiveInsight,
  improvementIdea,
  coachingTip,
}) => {
  return (
    <ProgressCardContainer style={styles.card} padding={20}>
      <Text style={styles.title}>Coach notes</Text>
      <Text style={styles.subtitle}>A snapshot of what stood out this week.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What&apos;s working</Text>
        <Text style={styles.sectionText}>
          {positiveInsight ?? 'Keep logging meals consistently – every entry helps us personalize your plan.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Try this next</Text>
        <Text style={styles.sectionText}>
          {improvementIdea ?? 'Aim to log one extra home-cooked meal this week to improve accuracy.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Coach tip</Text>
        <Text style={styles.sectionText}>
          {coachingTip ?? 'Pair your evening snack with a short walk to boost recovery and digestion.'}
        </Text>
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 13,
    color: Colors.lightText,
    lineHeight: 18,
  },
});
