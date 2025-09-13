import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ruler, CaretRight } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { GlassSurface } from '@/components/common/GlassSurface';
import { useMeasurements } from '@/hooks/useMeasurements';

interface MeasurementCardProps {
  onPress: () => void;
  lastUpdatedLabel?: string;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({ onPress, lastUpdatedLabel }) => {
  const { latestByMetric, lastUpdatedLabel: label } = useMeasurements();

  const weight = latestByMetric.weight?.value;
  const waist = latestByMetric.waist?.value;
  const bodyFat = latestByMetric.bodyFat?.value;

  const info = useMemo(() => ([
    { label: 'Weight', value: typeof weight === 'number' ? `${weight} kg` : '—' },
    { label: 'Waist', value: typeof waist === 'number' ? `${waist} cm` : '—' },
    { label: 'Body fat', value: typeof bodyFat === 'number' ? `${bodyFat}%` : '—' },
  ]), [weight, waist, bodyFat]);

  return (
    <GlassSurface pressable onPress={onPress} style={styles.card} padding={18}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Ruler size={22} color={Colors.primary} weight="bold" />
        </View>
        <Text style={styles.title}>Measurements</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.ctaText}>Log</Text>
        <CaretRight size={16} color={Colors.primary} weight="bold" />
      </View>

      <View style={styles.metricsRow}>
        {info.map((m) => (
          <View key={m.label} style={styles.metricCell}>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.updatedText}>Last update: {lastUpdatedLabel ?? label}</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  metricCell: { width: '30%', alignItems: 'center' },
  metricValue: { fontSize: 16, fontWeight: Typography.weights.semibold, color: Colors.text },
  metricLabel: { fontSize: 12, color: Colors.lightText, marginTop: 2 },
  updatedText: { marginTop: 12, fontSize: 12, color: Colors.lightText, textAlign: 'right' },
});
