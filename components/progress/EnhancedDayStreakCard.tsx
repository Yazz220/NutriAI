import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Flame, Calendar } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface EnhancedDayStreakCardProps {
  streak: number;
  lastTracked: string;
  onPress?: () => void;
}

export function EnhancedDayStreakCard({
  streak = 7,
  lastTracked = '2025-09-15',
  onPress,
}: EnhancedDayStreakCardProps) {
  const scaleAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // gentle pulse on mount
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => onPress?.());
  };

  const getStreakMessage = () => {
    if (streak === 0) return "Start your first day!";
    if (streak === 1) return "Day 1 – great start!";
    if (streak < 7) return `Keep it up – ${streak} days!`;
    if (streak === 7) return "1-week streak!";
    return `${streak}-day streak!`;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <ProgressCardContainer onPress={handlePress} style={styles.card} padding={20} noMargins>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Day Streak</Text>
            <Calendar size={18} color={Colors.lightText} />
          </View>

          {/* Centered flame & count */}
          <View style={styles.center}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Flame size={40} color={Colors.secondary} strokeWidth={2.5} />
            </Animated.View>

            <Text style={styles.count}>{streak}</Text>
            <Text style={styles.label}>days in a row</Text>
          </View>

          {/* Motivational line (compact) */}
          <Text style={styles.message}>{getStreakMessage()}</Text>

          {/* Mini calendar dots */}
          <View style={styles.miniCalendar}>
            {[...Array(7)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < streak ? styles.dotFilled : styles.dotEmpty,
                ]}
              />
            ))}
          </View>
      </ProgressCardContainer>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    color: Colors.text,
  },
  center: {
    alignItems: 'center',
    marginVertical: 12,
  },
  count: {
    fontSize: 28,
    color: Colors.secondary,
    fontWeight: '700',
    marginTop: 8,
  },
  label: {
    color: Colors.lightText,
    marginTop: 2,
    fontSize: 14,
  },
  message: {
    color: Colors.text,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
  },
  miniCalendar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: Colors.secondary,
  },
  dotEmpty: {
    backgroundColor: Colors.border,
  },
});
