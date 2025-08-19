import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

export const NutritionRings: React.FC<NutritionRingsProps> = ({ calories, protein, carbs, fats, goals }) => {
  const calPct = clamp01(calories / (goals.dailyCalories || 1));
  const pPct = clamp01(protein / (goals.protein || 1));
  const cPct = clamp01(carbs / (goals.carbs || 1));
  const fPct = clamp01(fats / (goals.fats || 1));

  return (
    <View style={styles.container}>
      {/* Big calorie ring */}
      <View style={styles.calorieCard}>
        <View style={{ position: 'relative', width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <Ring size={140} stroke={14} progress={calPct} color={Colors.primary} />
          <View style={styles.centerLabel}>
            <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
            <Text style={styles.caloriesUnit}>kcal</Text>
            <Text style={styles.goalText}>of {goals.dailyCalories}</Text>
          </View>
        </View>
        <View style={styles.calorieLegend}>
          <LegendDot color={Colors.primary} label="Calories" value={`${Math.round(calPct * 100)}%`} />
        </View>
      </View>

      {/* Macro rings */}
      <View style={styles.macrosRow}>
        <MacroRing label="Protein" grams={protein} goal={goals.protein} color={Colors.fresh} />
        <MacroRing label="Carbs" grams={carbs} goal={goals.carbs} color={Colors.info} />
        <MacroRing label="Fat" grams={fats} goal={goals.fats} color={Colors.warning} />
      </View>
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
      <View style={{ position: 'relative', width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
        <Ring size={84} stroke={10} progress={pct} color={color} />
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
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  calorieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesValue: {
    fontSize: 28,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  caloriesUnit: {
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  goalText: {
    color: Colors.lightText,
    fontSize: 12,
    marginTop: 2,
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
  },
  macroItem: {
    alignItems: 'center',
  },
  macroCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  macroValue: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  macroGoal: {
    color: Colors.lightText,
    fontSize: 12,
  },
  macroLabel: {
    color: Colors.lightText,
    fontWeight: Typography.weights.semibold,
    marginTop: 6,
  },
});

export default NutritionRings;
