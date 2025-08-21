import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { FitnessRing, RingSpec } from '@/components/ui/FitnessRing';
import { Colors } from '@/constants/colors';
import { useNutrition } from '@/hooks/useNutrition';

interface WeekRingsProps {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}

const WeekRings: React.FC<WeekRingsProps> = ({ selectedDate, onSelectDate }) => {
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
            <View key={`winit-${iso}`} style={styles.weekInitialCell}>
              <Text style={[styles.weekInitial, isSel && styles.weekInitialSelected]}>{initial}</Text>
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
              style={styles.weekRingCell}
              onPress={() => onSelectDate(iso)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${date.toDateString()}`}
            >
              <View style={{ opacity: isFuture ? 0.35 : 1 }}>
                <FitnessRing size={40} stroke={4} gap={2} backgroundColor={Colors.border} rings={[ring]} />
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
    paddingHorizontal: 8,
  },
  weekInitialCell: {
    width: 40,
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
  weekRingsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 8,
  },
  weekRingCell: {
    width: 40,
    alignItems: 'center' as const,
  },
};

export default React.memo(WeekRings);