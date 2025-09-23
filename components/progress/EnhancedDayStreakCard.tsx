import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Flame } from 'lucide-react-native';
import CalenderIcon from '@/assets/icons/Calender.svg';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface EnhancedDayStreakCardProps {
  streak: number;
  lastTrackedLabel?: string;
  onPress?: () => void;
}

export function EnhancedDayStreakCard({
  streak = 0,
  lastTrackedLabel,
  onPress,
}: EnhancedDayStreakCardProps) {
  const scaleAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const loop = Animated.loop(
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
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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
    if (streak <= 0) return 'Start your streak today';
    if (streak === 1) return 'Day 1 — great start!';
    if (streak < 7) return `Keep it up — ${streak} days!`;
    if (streak === 7) return 'One week strong!';
    return `${streak}-day streak!`;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <ProgressCardContainer onPress={handlePress} style={styles.card} padding={20} noMargins>
        <View style={styles.header}>
          <Text style={styles.title}>Day Streak</Text>
          <CalenderIcon width={18} height={18} color={Colors.lightText} />
        </View>

        <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Flame size={40} color={Colors.secondary} strokeWidth={2.5} />
          </Animated.View>

          <Text style={styles.count}>{streak}</Text>
          <Text style={styles.label}>days in a row</Text>
        </View>

        <Text style={styles.message}>{getStreakMessage()}</Text>
        <Text style={styles.subMessage}>
          {streak > 0 && lastTrackedLabel ? `Last log ${lastTrackedLabel}` : 'Log a meal to begin your streak'}
        </Text>

        <View style={styles.miniCalendar}>
          {Array.from({ length: 7 }).map((_, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              style={[styles.dot, index < streak ? styles.dotFilled : styles.dotEmpty]}
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
    fontWeight: Type.weights.medium,
  },
  subMessage: {
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: 2,
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
