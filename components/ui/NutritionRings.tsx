import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

type Goals = {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fats: number;
};

interface NutritionRingsProps {
  calories: number;
  protein: number; // g
  carbs: number;   // g
  fats: number;    // g
  goals: Goals;
  onDetailsPress?: () => void;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const Ring = ({
  size,
  stroke,
  progress,
  color,
  trackColor = Colors.gray[200],
}: {
  size: number;
  stroke: number;
  progress: number; // 0-1
  color: string;
  trackColor?: string;
}) => {
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const p = clamp01(progress);
  const offset = c * (1 - p);
  const gradientId = `gradient-${color.replace('#', '')}`;
  
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </SvgLinearGradient>
      </Defs>
      {/* Track with subtle shadow effect */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={stroke}
        opacity={0.2}
        fill="none"
      />
      {/* Progress ring with gradient and depth */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        fill="none"
      />
    </Svg>
  );
};

export const NutritionRings: React.FC<NutritionRingsProps> = ({ calories, protein, carbs, fats, goals, onDetailsPress }) => {
  const calPct = clamp01(calories / (goals.dailyCalories || 1));
  const pPct = clamp01(protein / (goals.protein || 1));
  const cPct = clamp01(carbs / (goals.carbs || 1));
  const fPct = clamp01(fats / (goals.fats || 1));

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={[Colors.card, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Header with title and details button */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Nutrition</Text>
          {onDetailsPress && (
            <TouchableOpacity style={styles.detailsButton} onPress={onDetailsPress}>
              <Text style={styles.detailsText}>Details</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.container}>
          {/* Big calorie ring */}
          <View style={styles.calorieCard}>
            <View style={{ position: 'relative', width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
              <Ring size={140} stroke={18} progress={calPct} color={Colors.nutrition.calories} />
              <View style={styles.centerLabel}>
                <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
                <Text style={styles.caloriesUnit}>/{goals.dailyCalories}kcal</Text>
              </View>
            </View>
          </View>

          {/* Macro rings */}
          <View style={styles.macrosRow}>
            <MacroRing label="Protein" grams={protein} goal={goals.protein} color={Colors.nutrition.protein} />
            <MacroRing label="Carbs" grams={carbs} goal={goals.carbs} color={Colors.nutrition.carbs} />
            <MacroRing label="Fat" grams={fats} goal={goals.fats} color={Colors.nutrition.fats} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const LegendDot = ({ color, label, value }: { color: string; label: string; value: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
    <Text style={styles.legendValue}>{value}</Text>
  </View>
);

const MacroRing = ({ label, grams, goal, color }: { label: string; grams: number; goal: number; color: string }) => {
  const pct = clamp01((goal ? grams / goal : 0));
  return (
    <View style={styles.macroItem}>
      <View style={{ position: 'relative', width: 63, height: 63, alignItems: 'center', justifyContent: 'center' }}>
        <Ring size={63} stroke={11} progress={pct} color={color} />
        <View style={styles.macroCenter}>
          <Text style={styles.macroValue}>{Math.round(grams)}g</Text>
          <Text style={styles.macroGoal}>/{goal}g</Text>
        </View>
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientBackground: {
    borderRadius: 20,
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsText: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  container: {
    alignItems: 'center',
  },
  calorieCard: {
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
  },
  caloriesUnit: {
    fontSize: 16,
    color: Colors.lightText,
  },
  calorieLegend: {
    marginLeft: 12,
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  legendValue: {
    marginLeft: 'auto',
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 24,
    paddingHorizontal: 8,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  macroCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  macroGoal: {
    fontSize: 12,
    color: Colors.lightText,
  },
  macroLabel: {
    color: Colors.lightText,
    fontWeight: Typography.weights.semibold,
    marginTop: 6,
  },
});

export default NutritionRings;
