import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { FitnessRing, RingSpec } from '@/components/ui/FitnessRing';
import { Colors } from '@/constants/colors';
import { useNutrition } from '@/hooks/useNutrition';

interface WeekRingsProps {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  cellSize?: number; // width for each day cell
  ringSize?: number; // diameter of the ring glyph
}

const WeekRings: React.FC<WeekRingsProps> = ({ selectedDate, onSelectDate, cellSize = 48, ringSize = 40 }) => {
  const { loggedMeals, goals } = useNutrition();

  const getWeekStartISO = (isoDateStr: string) => {
    const target = new Date(isoDateStr);
    const dayOfWeek = target.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // treat Sunday as last day
    const monday = new Date(target);
    monday.setDate(target.getDate() + mondayOffset);
    return monday.toISOString().split('T')[0];
  };

  const weekData = useMemo(() => {
    const startISO = getWeekStartISO(selectedDate);
    const start = new Date(startISO);
    const days: { date: Date; iso: string }[] = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, iso: d.toISOString().split('T')[0] };
    });
    return days;
  }, [selectedDate]);

  const todayISO = new Date().toISOString().split('T')[0];
  const ringColor = Colors.primary; // use theme primary for consistency

  return (
    <View style={styles.weekRingsContainer}>
      {/* Weekday initials row */}
      <View style={styles.weekInitialsRow}>
        {weekData.map(({ date, iso }) => {
          const isSel = iso === selectedDate;
          const w = date.toLocaleDateString(undefined, { weekday: 'short' });
          const initial = Array.from(w)[0]?.toUpperCase() ?? w.charAt(0).toUpperCase();
          return (
            <View key={`winit-${iso}`} style={[styles.weekInitialCell, { width: cellSize }]}>
              <View style={[isSel && styles.weekInitialSelectedPill]}>
                <Text style={[styles.weekInitial, isSel && styles.weekInitialSelected]}>{initial}</Text>
              </View>
            </View>
          );
        })}
      </View>
      {/* Rings row */}
      <View style={styles.weekRingsRow}>
        {weekData.map(({ iso, date }) => {
          const isFuture = new Date(iso) > new Date(todayISO);
          const totals = loggedMeals
            .filter((m) => m.date === iso)
            .reduce((acc, m) => ({ calories: acc.calories + m.calories }), { calories: 0 });
          const pct = goals?.dailyCalories ? Math.min(1, totals.calories / goals.dailyCalories) : 0;
          const ring: RingSpec = { pct, color: ringColor };
          return (
            <TouchableOpacity
              key={`wr-${iso}`}
              style={[styles.weekRingCell, { width: cellSize }]}
              onPress={() => onSelectDate(iso)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${date.toDateString()}`}
            >
              <View style={{ opacity: isFuture ? 0.35 : 1 }}>
                <FitnessRing size={ringSize} stroke={4} gap={2} backgroundColor={Colors.border} rings={[ring]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = {
  weekRingsContainer: {
    width: '100%' as const,
  },
  weekInitialsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  weekInitialCell: {
    alignItems: 'center' as const,
  },
  weekInitial: {
    color: Colors.lightText,
    fontSize: 12,
  },
  weekInitialSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weekInitialSelectedPill: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  weekRingsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  weekRingCell: {
    alignItems: 'center' as const,
  },
  weekRingSelectedPill: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 6,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
};

export default React.memo(WeekRings);