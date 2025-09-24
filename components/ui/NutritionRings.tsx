import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={stroke}
        opacity={0.3}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
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
            <View style={{ position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
              <Ring size={120} stroke={12} progress={calPct} color={Colors.nutrition.calories} />
              <View style={styles.centerLabel}>
                <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
                <Text style={styles.caloriesUnit}>/{goals.dailyCalories}kcal</Text>
              </View>
            </View>
          </View>

          {/* Macro rings */}
          <View style={styles.macrosRow}>
            <MacroRing label="Protein" grams={protein} goal={goals.protein} color={Colors.nutrition.protein} />
            <MacroRing label="Fat" grams={fats} goal={goals.fats} color={Colors.nutrition.fats} />
            <MacroRing label="Carbs" grams={carbs} goal={goals.carbs} color={Colors.nutrition.carbs} />
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
      <View style={{ position: 'relative', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
        <Ring size={60} stroke={8} progress={pct} color={color} />
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
    marginTop: 8,
    gap: 16,
  },
  macroItem: {
    alignItems: 'center',
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
