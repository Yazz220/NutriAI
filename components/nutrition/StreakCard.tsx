import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy, Calendar, TrendingUp, X, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';

interface StreakCardProps {
  onPress?: () => void;
}

// Animated Fire Icon Component
const FireIcon: React.FC<{ number: number; size?: number; active?: boolean }> = ({
  number,
  size = 80,
  active = false
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active && number > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [active, number]);

  return (
    <View style={[styles.fireContainer, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.iconCircle, active ? styles.iconCircleActive : styles.iconCircleInactive]}>
          <Flame
            size={size * 0.6}
            color={active ? Colors.white : Colors.lightText}
            fill={active ? Colors.white : 'transparent'}
          />
        </View>
      </Animated.View>
      {active && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
      )}
    </View>
  );
};

export const StreakCard: React.FC<StreakCardProps> = ({ onPress }) => {
  const { streakData, getTodayStatus, isLoading } = useStreakTracking();
  const { getDailyProgress } = useNutritionWithMealPlan();
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const todayStatus = getTodayStatus();
  const isStreakActive = streakData.currentStreak > 0;

  // Animate card entrance
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getStatusMessage = () => {
    if (todayStatus === 'success') return "Streak Active!";
    if (todayStatus === 'pending') return "Log meals to keep it going";
    return 'Start your streak today';
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowCalendar(true);
    }
  };

  // Check if a day has logged food
  const hasLoggedFood = (dateISO: string) => {
    const progress = getDailyProgress(dateISO);
    return progress?.calories?.consumed > 0;
  };

  const renderCalendarModal = () => (
    <Modal
      visible={showCalendar}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCalendar(false)}
    >
      <SafeAreaView style={styles.calendarContainer}>
        {/* Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.calendarCloseButton}
            onPress={() => setShowCalendar(false)}
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>Streak Calendar</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => {
              const newMonth = new Date(calendarMonth);
              newMonth.setMonth(newMonth.getMonth() - 1);
              setCalendarMonth(newMonth);
            }}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.monthLabel}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>

          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => {
              const newMonth = new Date(calendarMonth);
              newMonth.setMonth(newMonth.getMonth() + 1);
              setCalendarMonth(newMonth);
            }}
          >
            <ChevronRight size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayHeaders}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.weekdayHeader}>{day}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {(() => {
            const year = calendarMonth.getFullYear();
            const month = calendarMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());

            const days = [];
            const current = new Date(startDate);

            for (let i = 0; i < 42; i++) {
              const dateISO = current.toISOString().split('T')[0];
              const isCurrentMonth = current.getMonth() === month;
              const isToday = dateISO === new Date().toISOString().split('T')[0];
              const hasLogged = hasLoggedFood(dateISO);

              days.push(
                <View
                  key={dateISO}
                  style={[
                    styles.calendarDay,
                    !isCurrentMonth && styles.calendarDayOtherMonth,
                    isToday && styles.calendarDayToday,
                  ]}
                >
                  {hasLogged && isCurrentMonth ? (
                    <View style={styles.calendarFireContainer}>
                      <Flame size={20} color={Colors.secondary} fill={Colors.secondary} />
                    </View>
                  ) : (
                    <Text style={[
                      styles.calendarDayText,
                      !isCurrentMonth && styles.calendarDayTextOther,
                      isToday && styles.calendarDayTextToday,
                    ]}>
                      {current.getDate()}
                    </Text>
                  )}
                </View>
              );

              current.setDate(current.getDate() + 1);
            }

            return days;
          })()}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Flame size={16} color={Colors.secondary} fill={Colors.secondary} />
            <Text style={styles.legendText}>Logged food</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>No activity</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

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
    <>
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={handleCardPress} activeOpacity={0.9}>
          <LinearGradient
            colors={isStreakActive
              ? [Colors.secondary, Colors.secondaryLight]
              : [Colors.card, Colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardContent}
          >
            <View style={styles.leftContent}>
              <Text style={[styles.label, isStreakActive && styles.textInverse]}>
                Current Streak
              </Text>
              <View style={styles.streakRow}>
                <Text style={[styles.streakNumber, isStreakActive && styles.textInverse]}>
                  {streakData.currentStreak}
                </Text>
                <Text style={[styles.streakUnit, isStreakActive && styles.textInverse]}>
                  days
                </Text>
              </View>
              <Text style={[styles.subtext, isStreakActive && styles.textInverse]}>
                {getStatusMessage()}
              </Text>
            </View>

            <View style={styles.rightContent}>
              <FireIcon
                number={streakData.currentStreak}
                size={72}
                active={isStreakActive}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {renderCalendarModal()}
    </>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.shadows.colored,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 20,
    minHeight: 120,
  },

  // Left Content
  leftContent: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.lightText,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 48,
  },
  streakUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  subtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Right Content
  rightContent: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fire Icon
  fireContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  iconCircleInactive: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },

  // Text Variants
  textInverse: {
    color: Colors.white,
  },

  // Skeleton
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  skeleton: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    height: 120,
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 16,
    width: '40%',
  },
  skeletonBody: {
    height: 40,
    backgroundColor: Colors.border,
    borderRadius: 4,
    width: '70%',
  },

  // Calendar Modal
  calendarContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  calendarCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  weekdayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  weekdayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.lightText,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: Colors.alpha.primary[10],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  calendarDayTextOther: {
    color: Colors.lightText,
  },
  calendarDayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  calendarFireContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 30,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.lightText,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
});
