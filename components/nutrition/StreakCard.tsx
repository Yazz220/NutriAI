import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy, Calendar, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { useStreakTracking } from '@/hooks/useStreakTracking';

interface StreakCardProps {
  onPress?: () => void;
}

export const StreakCard: React.FC<StreakCardProps> = ({ onPress }) => {
  const { streakData, getTodayStatus, getTodayProgress, isLoading } = useStreakTracking();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;

  const todayStatus = getTodayStatus();
  const todayProgress = getTodayProgress();
  const progressPercentage = Math.round(todayProgress * 100);

  // Animate card entrance
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: todayProgress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [todayProgress, progressAnim]);

  // Subtle flame animation when streak is active
  useEffect(() => {
    if (streakData.currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streakData.currentStreak, flameAnim]);

  const getStatusColor = () => {
    switch (todayStatus) {
      case 'success': return Colors.success;
      case 'pending': return Colors.warning;
      case 'missed': return Colors.lightText;
      default: return Colors.lightText;
    }
  };

  const getStatusMessage = () => {
    if (todayStatus === 'success') return "Today's goal reached!";
    if (todayStatus === 'pending') return `${Math.max(0, 100 - progressPercentage)}% left to reach goal`;
    return 'Start logging to build your streak';
  };

  const isStreakActive = streakData.currentStreak > 0;
  const shouldHighlight = isStreakActive || todayStatus === 'success';

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.skeleton}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonBody} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.container, shouldHighlight && styles.containerActive]}>
          {/* Subtle gradient background for active streaks */}
          {shouldHighlight && (
            <LinearGradient
              colors={['rgba(129, 230, 149, 0.08)', 'rgba(129, 230, 149, 0.02)']}
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          
          {/* Header with flame icon */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Animated.View style={{
                opacity: flameAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                })
              }}>
                <Flame 
                  size={20} 
                  color={isStreakActive ? Colors.primary : Colors.lightText}
                  strokeWidth={2}
                />
              </Animated.View>
              <Text style={styles.title}>Daily Streak</Text>
            </View>
            
            {streakData.currentStreak > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{streakData.currentStreak}</Text>
              </View>
            )}
          </View>

          {/* Main content area */}
          <View style={styles.content}>
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>
                {streakData.currentStreak}
              </Text>
              <Text style={styles.streakLabel}>
                {streakData.currentStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: getStatusColor(),
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{progressPercentage}%</Text>
            </View>

            <Text style={styles.statusText}>{getStatusMessage()}</Text>
          </View>

          {/* Stats footer */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Trophy size={14} color={Colors.lightText} strokeWidth={2} />
              <Text style={styles.statValue}>{streakData.longestStreak}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Calendar size={14} color={Colors.lightText} strokeWidth={2} />
              <Text style={styles.statValue}>{streakData.totalDaysLogged}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <TrendingUp size={14} color={Colors.lightText} strokeWidth={2} />
              <Text style={styles.statValue}>
                {todayStatus === 'success' ? '+1' : progressPercentage + '%'}
              </Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  
  // Skeleton loading styles
  skeleton: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
  },
  skeletonHeader: {
    height: 24,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 16,
    width: '60%',
  },
  skeletonBody: {
    height: 60,
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  
  // Container styles
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  containerActive: {
    borderColor: Colors.primary + '30',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...Type.body,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    ...Type.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Content styles
  content: {
    gap: 16,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakNumber: {
    ...Type.h1,
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 48,
  },
  streakLabel: {
    ...Type.body,
    color: Colors.lightText,
  },
  
  // Progress bar styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    ...Type.caption,
    color: Colors.lightText,
    minWidth: 35,
  },
  
  statusText: {
    ...Type.caption,
    color: Colors.lightText,
    marginTop: 4,
  },
  
  // Stats footer styles
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    ...Type.caption,
    color: Colors.text,
    fontWeight: '600',
  },
  statLabel: {
    ...Type.caption,
    color: Colors.lightText,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
});
