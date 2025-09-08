import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';

interface WeightCardProps {
  onPress: () => void;
}

export const WeightCard: React.FC<WeightCardProps> = ({ onPress }) => {
  const { getCurrentWeight, getWeightTrend } = useWeightTracking();
  const currentWeight = getCurrentWeight();
  const trend = getWeightTrend();

  const formatLastWeighIn = () => {
    if (!currentWeight) return 'No entries yet';
    
    const entryDate = new Date(currentWeight.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = entryDate.toDateString() === today.toDateString();
    const isYesterday = entryDate.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) return `${daysDiff} days ago`;
    
    return entryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getTrendIcon = () => {
    if (!trend) return <Minus size={16} color={Colors.lightText} />;
    if (trend.trend === 'losing') return <TrendingDown size={16} color="#22C55E" />;
    if (trend.trend === 'gaining') return <TrendingUp size={16} color="#EF4444" />;
    return <Minus size={16} color={Colors.lightText} />;
  };

  const getTrendColor = () => {
    if (!trend) return Colors.lightText;
    if (trend.trend === 'losing') return '#22C55E';
    if (trend.trend === 'gaining') return '#EF4444';
    return Colors.lightText;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[Colors.card, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <Scale size={28} color={Colors.primary} />
            </View>
            <View style={styles.textContent}>
              <Text style={styles.title}>Weigh In</Text>
              <Text style={styles.subtitle}>Last weigh-in: {formatLastWeighIn()}</Text>
              {trend && (
                <View style={styles.trendContainer}>
                  {getTrendIcon()}
                  <Text style={[styles.trendText, { color: getTrendColor() }]}>
                    {Math.abs(trend.ratePerWeek).toFixed(1)} kg/week
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.weight}>
              {currentWeight ? `${currentWeight.weight}` : '--'}
            </Text>
            <Text style={styles.unit}>kg</Text>
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
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  weight: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    lineHeight: 36,
  },
  unit: {
    fontSize: 16,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
    opacity: 0.7,
  },
});
