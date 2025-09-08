import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  TrendingUp,
  Target,
  Flame,
  Package,
  ChefHat,
} from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { useInventory, useInventoryByFreshness } from '@/hooks/useInventoryStore';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { useMealPlanner } from '@/hooks/useMealPlanner';

interface ProgressCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  progress?: number; // 0-1 for progress bar
  color?: string;
  onPress?: () => void;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  progress,
  color = Colors.primary,
  onPress,
  trend,
  trendValue,
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={12} color={Colors.success} />;
    if (trend === 'down') return <TrendingUp size={12} color={Colors.error} style={{ transform: [{ rotate: '180deg' }] }} />;
    return null;
  };

  return (
    <TouchableOpacity
      style={[styles.progressCard, onPress && styles.pressableCard]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        {trend && trendValue && (
          <View style={styles.trendContainer}>
            {getTrendIcon()}
            <Text style={[styles.trendText, { color: trend === 'up' ? Colors.success : Colors.error }]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}

      {progress !== undefined && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, progress * 100)}%`, backgroundColor: color }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ProgressSection: React.FC = () => {
  const { inventory } = useInventory();
  const { expiring, fresh } = useInventoryByFreshness();
  const { getDailyProgress } = useNutritionWithMealPlan();
  const { plannedMeals } = useMealPlanner();

  // Get today's date and daily progress
  const today = new Date().toISOString().split('T')[0];
  const dailyProgress = getDailyProgress(today);

  // Mock function for nutrition streak - in real app, this would track daily nutrition goals
  const calculateNutritionStreak = () => {
    // This would typically check the last N days of nutrition data
    // For now, return a mock value based on current day's progress
    const calorieProgress = dailyProgress.calories.goal > 0
      ? dailyProgress.calories.consumed / dailyProgress.calories.goal
      : 0;

    if (calorieProgress >= 0.8 && calorieProgress <= 1.2) {
      return Math.floor(Math.random() * 7) + 1; // Mock streak of 1-7 days
    }
    return 0;
  };

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    // Filter planned meals for this week
    const weeklyMeals = plannedMeals.filter(meal => {
      if (!meal.date) return false;
      return weekDates.includes(meal.date);
    });

    return {
      plannedMeals: weeklyMeals.length,
      inventoryHealth: inventory.length > 0 ? (fresh.length / inventory.length) : 0,
      nutritionStreak: calculateNutritionStreak(),
    };
  }, [inventory, fresh, plannedMeals, dailyProgress]);

  const progressCards: ProgressCardProps[] = [
    {
      title: 'Nutrition Goal',
      value: `${Math.round((dailyProgress.calories.consumed / dailyProgress.calories.goal) * 100)}%`,
      subtitle: `${dailyProgress.calories.consumed} / ${dailyProgress.calories.goal} kcal`,
      icon: <Target size={20} color={Colors.primary} />,
      progress: dailyProgress.calories.goal > 0 ? dailyProgress.calories.consumed / dailyProgress.calories.goal : 0,
      color: Colors.primary,
      trend: dailyProgress.calories.consumed > dailyProgress.calories.goal ? 'up' : 'neutral',
      trendValue: dailyProgress.calories.remaining > 0 ? `${dailyProgress.calories.remaining} left` : `${Math.abs(dailyProgress.calories.remaining)} over`,
    },
    {
      title: 'Weekly Meals',
      value: weeklyStats.plannedMeals,
      subtitle: 'Planned this week',
      icon: <ChefHat size={20} color={Colors.success} />,
      progress: weeklyStats.plannedMeals / 21, // 3 meals × 7 days
      color: Colors.success,
      trend: weeklyStats.plannedMeals > 10 ? 'up' : 'neutral',
      trendValue: weeklyStats.plannedMeals > 10 ? 'Great planning!' : undefined,
    },
    {
      title: 'Inventory Health',
      value: `${Math.round(weeklyStats.inventoryHealth * 100)}%`,
      subtitle: `${fresh.length} fresh items`,
      icon: <Package size={20} color={Colors.warning} />,
      progress: weeklyStats.inventoryHealth,
      color: weeklyStats.inventoryHealth > 0.7 ? Colors.success : Colors.warning,
      trend: expiring.length === 0 ? 'up' : 'down',
      trendValue: expiring.length > 0 ? `${expiring.length} expiring` : 'All fresh!',
    },
    {
      title: 'Streak',
      value: `${weeklyStats.nutritionStreak}`,
      subtitle: weeklyStats.nutritionStreak === 1 ? 'day' : 'days',
      icon: <Flame size={20} color={Colors.error} />,
      color: Colors.error,
      trend: weeklyStats.nutritionStreak > 0 ? 'up' : 'neutral',
      trendValue: weeklyStats.nutritionStreak > 3 ? 'On fire!' : undefined,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Progress Cards */}
      <View style={styles.cardsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
        >
          {progressCards.map((card, index) => (
            <ProgressCard key={index} {...card} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },

  // Progress Cards
  cardsContainer: {
    marginBottom: Spacing.lg,
  },
  cardsScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    width: 140,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressableCard: {
    // Add any press-specific styles if needed
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: Typography.weights.medium,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    color: Colors.lightText,
    marginBottom: Spacing.sm,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    minWidth: 30,
    textAlign: 'right',
  },

  // Weekly Goals
  goalsSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  goalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalsSectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  viewAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  viewAllText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  goalsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  goalCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  completedGoalCard: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  goalIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  goalProgress: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginBottom: Spacing.xs,
  },
  goalProgressBar: {
    marginTop: Spacing.xs,
  },
  goalProgressTrack: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 1.5,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // Insights
  insightsSection: {
    paddingHorizontal: Spacing.md,
  },
  insightsSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  insightsContainer: {
    gap: Spacing.xs,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  insightText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 18,
  },
});