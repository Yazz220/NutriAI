import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy, Target, Calendar } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useStreakTracking } from '@/hooks/useStreakTracking';

interface StreakCardProps {
  onPress?: () => void;
}

export const StreakCard: React.FC<StreakCardProps> = ({ onPress }) => {
  const { streakData, getTodayStatus, getTodayProgress, isLoading } = useStreakTracking();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;

  const todayStatus = getTodayStatus();
  const todayProgress = getTodayProgress();

  // Animate progress ring
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: todayProgress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [todayProgress, progressAnim]);

  // Animate flame when streak is active
  useEffect(() => {
    if (streakData.currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streakData.currentStreak, flameAnim]);

  // Pulse animation for successful days
  useEffect(() => {
    if (todayStatus === 'success') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [todayStatus, scaleAnim]);

  const getStatusColor = () => {
    switch (todayStatus) {
      case 'success': return Colors.success;
      case 'pending': return Colors.warning;
      case 'missed': return Colors.error;
      default: return Colors.lightText;
    }
  };

  const getStatusText = () => {
    switch (todayStatus) {
      case 'success': return 'Goal reached!';
      case 'pending': return `${Math.round(todayProgress * 100)}% to goal`;
      case 'missed': return 'Start logging today';
      default: return 'Track your nutrition';
    }
  };

  const getStreakEmoji = () => {
    if (streakData.currentStreak === 0) return '🌱';
    if (streakData.currentStreak < 7) return '🔥';
    if (streakData.currentStreak < 30) return '💪';
    if (streakData.currentStreak < 100) return '🏆';
    return '👑';
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading streak...</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={
            todayStatus === 'success' 
              ? Colors.chart.gradients.success 
              : streakData.currentStreak > 0
              ? Colors.chart.gradients.secondary
              : [Colors.card, Colors.card]
          }
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Animated.View style={{
                  transform: [{
                    scale: flameAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    })
                  }]
                }}>
                  <Flame 
                    size={20} 
                    color={streakData.currentStreak > 0 ? Colors.white : Colors.primary} 
                    fill={streakData.currentStreak > 0 ? Colors.white : 'transparent'}
                  />
                </Animated.View>
                <Text style={[
                  styles.title,
                  { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.text }
                ]}>
                  Nutrition Streak
                </Text>
              </View>
              <Text style={styles.emoji}>{getStreakEmoji()}</Text>
            </View>

            {/* Main Streak Display */}
            <View style={styles.streakDisplay}>
              <View style={styles.streakNumber}>
                <Text style={[
                  styles.streakValue,
                  { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.text }
                ]}>
                  {streakData.currentStreak}
                </Text>
                <Text style={[
                  styles.streakLabel,
                  { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText }
                ]}>
                  {streakData.currentStreak === 1 ? 'day' : 'days'}
                </Text>
              </View>

              {/* Progress Ring */}
              <View style={styles.progressRing}>
                <View style={styles.progressBackground} />
                <Animated.View
                  style={[
                    styles.progressForeground,
                    {
                      transform: [{
                        rotate: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-90deg', '270deg'],
                        })
                      }]
                    }
                  ]}
                />
                <View style={styles.progressCenter}>
                  <Text style={[
                    styles.progressText,
                    { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.text }
                  ]}>
                    {Math.round(todayProgress * 100)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Status and Stats */}
            <View style={styles.footer}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[
                  styles.statusText,
                  { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText }
                ]}>
                  {getStatusText()}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Trophy 
                    size={14} 
                    color={streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText} 
                  />
                  <Text style={[
                    styles.statValue,
                    { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText }
                  ]}>
                    {streakData.longestStreak}
                  </Text>
                  <Text style={[
                    styles.statLabel,
                    { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText }
                  ]}>
                    best
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Calendar 
                    size={14} 
                    color={streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText} 
                  />
                  <Text style={[
                    styles.statValue,
                    { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText }
                  ]}>
                    {streakData.totalDaysLogged}
                  </Text>
                  <Text style={[
                    styles.statLabel,
                    { color: streakData.currentStreak > 0 || todayStatus === 'success' ? Colors.white : Colors.lightText }
                  ]}>
                    total
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    borderRadius: 20,
    padding: 20,
  },
  content: {
    gap: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
  },
  loadingText: {
    color: Colors.lightText,
    fontSize: Typography.sizes.sm,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  emoji: {
    fontSize: 24,
  },
  
  streakDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakNumber: {
    alignItems: 'flex-start',
  },
  streakValue: {
    fontSize: 48,
    fontWeight: Typography.weights.bold,
    lineHeight: 48,
  },
  streakLabel: {
    fontSize: Typography.sizes.sm,
    marginTop: -4,
  },
  
  progressRing: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressForeground: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  
  footer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
  },
});
