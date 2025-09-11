import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

interface DayStreakCardProps {
  onPress?: () => void;
}

export const DayStreakCard: React.FC<DayStreakCardProps> = ({ onPress }) => {
  // Placeholder data (wire up to real streak logic later)
  const weekLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0=Sun
  const completedDays = [2]; // example: Tue completed
  const currentStreak = 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <View style={styles.flameBadge}>
          <Flame size={18} color={Colors.accentPrimary} />
          <View style={styles.flameCount}>
            <Text style={styles.flameCountText}>{currentStreak}</Text>
          </View>
        </View>
        <Text style={styles.title}>Day Streak</Text>
      </View>

      <View style={styles.dotsRow}>
        {weekLetters.map((_, idx) => {
          const isCompleted = completedDays.includes(idx);
          const isToday = idx === currentDayIndex;
          return (
            <View
              key={`dot-${idx}`}
              style={[
                styles.dot,
                isCompleted && styles.dotFilled,
                isToday && styles.dotToday,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.weekLettersRow}>
        {weekLetters.map((l, idx) => (
          <Text key={`lbl-${idx}`} style={styles.weekLetter}>{l}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20, // match WeightCard padding
    marginVertical: 8,
    shadowColor: '#000', // match WeightCard shadow style
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  flameBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameCount: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: Colors.accentPrimary,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameCountText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.accentPrimary,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  dotFilled: {
    backgroundColor: Colors.accentPrimary,
  },
  dotToday: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
  },
  weekLettersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekLetter: {
    fontSize: 10,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
});
