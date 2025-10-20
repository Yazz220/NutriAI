import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy, Calendar, TrendingUp, X, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';

interface StreakCardProps {
  onPress?: () => void;
}

// Fire icon component with number inside
const FireIcon: React.FC<{ number: number; size?: number; animated?: boolean }> = ({ 
  number, 
  size = 80, 
  animated = false 
}) => {
  const flameAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated && number > 0) {
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
  }, [animated, number]);

  const scale = animated ? flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  }) : 1;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[styles.fireContainer, { width: size, height: size }]}>
        <LinearGradient
          colors={['#FF6B35', '#FF8E53', '#FFB366']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.fireShape, { width: size, height: size }]}
        >
          <View style={styles.fireNumberContainer}>
            <Text style={[styles.fireNumber, { fontSize: size * 0.25 }]}>{number}</Text>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

export const StreakCard: React.FC<StreakCardProps> = ({ onPress }) => {
  const { streakData, getTodayStatus, getTodayProgress, isLoading } = useStreakTracking();
  const { getDailyProgress } = useNutritionWithMealPlan();
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const todayStatus = getTodayStatus();
  const todayProgress = getTodayProgress();
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
    if (todayStatus === 'success') return "Keep up your streak!";
    if (todayStatus === 'pending') return "Log your meals to continue";
    return 'Start logging to build your streak';
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
            const lastDay = new Date(year, month + 1, 0);
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
                <TouchableOpacity
                  key={dateISO}
                  style={[
                    styles.calendarDay,
                    !isCurrentMonth && styles.calendarDayOtherMonth,
                    isToday && styles.calendarDayToday,
                  ]}
                  disabled={!isCurrentMonth}
                >
                  {hasLogged && isCurrentMonth ? (
                    <View style={styles.calendarFireContainer}>
                      <FireIcon number={current.getDate()} size={32} />
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
                </TouchableOpacity>
              );
              
              current.setDate(current.getDate() + 1);
            }
            
            return days;
          })()}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <FireIcon number={1} size={20} />
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
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
          <LinearGradient
            colors={isStreakActive ? ['#FF6B35', '#FF8E53'] : [Colors.card, Colors.card]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Fire Icon with Number */}
            <View style={styles.fireSection}>
              <FireIcon 
                number={streakData.currentStreak} 
                size={100} 
                animated={isStreakActive}
              />
            </View>

            {/* Message */}
            <Text style={[styles.message, isStreakActive && styles.messageActive]}>
              {getStatusMessage()}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isStreakActive && styles.statValueActive]}>
                  {streakData.longestStreak}
                </Text>
                <Text style={[styles.statLabel, isStreakActive && styles.statLabelActive]}>
                  Best Streak
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isStreakActive && styles.statValueActive]}>
                  {streakData.totalDaysLogged}
                </Text>
                <Text style={[styles.statLabel, isStreakActive && styles.statLabelActive]}>
                  Total Days
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      
      {renderCalendarModal()}
    </>
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
  
  // Fire icon styles
  fireContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireShape: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    // Create flame-like shape using border radius
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    // Add some shadow for depth
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fireNumberContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  fireNumber: {
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  // Container styles
  container: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'space-between',
  },
  
  // Fire section
  fireSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  // Message styles
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  messageActive: {
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statValueActive: {
    color: Colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
  },
  statLabelActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  
  // Calendar modal styles
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
  
  // Month navigation
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
  
  // Calendar grid
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
    backgroundColor: Colors.primary + '20',
    borderRadius: 8,
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
    fontWeight: '600',
  },
  calendarFireContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Legend
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
});
