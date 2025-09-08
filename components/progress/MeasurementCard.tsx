import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ruler, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

interface MeasurementCardProps {
  onPress: () => void;
  lastUpdatedLabel?: string;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({ onPress, lastUpdatedLabel = 'No entries yet' }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={[Colors.card, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <Ruler size={28} color={Colors.primary} />
            </View>
            <View style={styles.textContent}>
              <Text style={styles.title}>Measurements</Text>
              <Text style={styles.subtitle}>Last update: {lastUpdatedLabel}</Text>
            </View>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.ctaText}>Log</Text>
            <ChevronRight size={18} color={Colors.primary} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientBackground: {
    borderRadius: 20,
    padding: 24,
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
