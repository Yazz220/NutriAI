import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ruler, CaretRight } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { GlassSurface } from '@/components/common/GlassSurface';

interface MeasurementCardProps {
  onPress: () => void;
  lastUpdatedLabel?: string;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({ onPress, lastUpdatedLabel = 'No entries yet' }) => {
  return (
    <GlassSurface pressable onPress={onPress} style={styles.card} padding={24}>
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Ruler size={28} color={Colors.primary} weight="bold" />
          </View>
          <View style={styles.textContent}>
            <Text style={styles.title}>Measurements</Text>
            <Text style={styles.subtitle}>Last update: {lastUpdatedLabel}</Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.ctaText}>Log</Text>
          <CaretRight size={18} color={Colors.primary} weight="bold" />
        </View>
      </View>
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    // Shadows and border handled by GlassSurface
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
});
