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
  scale?: number; // optional scale multiplier applied to sizes (1 = 100%)
}
// Default base sizes (unscaled). The `scale` prop will multiply these to allow centralized scaling.
const WeekRings: React.FC<WeekRingsProps> = ({ selectedDate, onSelectDate, cellSize = 39, ringSize = 32, scale = 1 }) => {
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
          const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
          // Get first 3 letters of the weekday and ensure proper case
          const dayAbbrev = weekday.length > 3 ? weekday.substring(0, 3) : weekday;
          // apply scale to the base cell size
          const effectiveCell = Math.max(32, Math.floor(cellSize * scale)); // unified min ensures alignment with rings row
          return (
            <View key={`winit-${iso}`} style={[styles.weekInitialCell, { width: effectiveCell }]}>
              <View style={styles.weekInitialInner}>
                <Text style={[styles.weekInitial, isSel && styles.weekInitialSelected]}>{dayAbbrev}</Text>
              </View>
            </View>
          );
        })}
      </View>
      {/* Rings row */}
      <View style={styles.weekRingsRow}>
        {weekData.map(({ iso, date }) => {
          const isFuture = new Date(iso) > new Date(todayISO);
          const isSel = iso === selectedDate;
          const totals = loggedMeals
            .filter((m) => m.date === iso)
            .reduce((acc, m) => ({ calories: acc.calories + m.calories }), { calories: 0 });
          const pct = goals?.dailyCalories ? Math.min(1, totals.calories / goals.dailyCalories) : 0;
          const ring: RingSpec = { pct, color: ringColor };
          const effectiveCell = Math.max(32, Math.floor(cellSize * scale)); // match initials row to keep columns aligned
          const effectiveRing = Math.max(22, Math.floor(ringSize * scale));
          return (
            <TouchableOpacity
              key={`wr-${iso}`}
              style={[styles.weekRingCell, { width: effectiveCell }]}
              onPress={() => onSelectDate(iso)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${date.toDateString()}`}
            >
              {isSel && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.selectedHighlight,
                    {
                      width: effectiveRing + 16,
                      height: effectiveRing + 30,
                      top: -20, // Moved up slightly to prevent overlap with nutrition card
                      left: (effectiveCell - (effectiveRing + 16)) / 2,
                    },
                  ]}
                />
              )}
              <View style={{ opacity: isFuture ? 0.35 : 1, position: 'relative' }}>
                <FitnessRing size={effectiveRing} stroke={4} gap={2} backgroundColor={Colors.border} rings={[ring]} />
                <View style={styles.ringNumber} pointerEvents="none">
                  <Text style={styles.ringNumberText}>{date.getDate()}</Text>
                </View>
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
    marginBottom: 4, // Reduced from 8 to bring letters closer to rings
    position: 'relative' as const,
    zIndex: 2 as const,
    overflow: 'visible' as const,
  },
  weekInitialCell: {
    alignItems: 'center' as const,
  },
  weekInitialInner: {
    zIndex: 2 as const,
  },
  weekInitial: {
    color: Colors.lightText,
    fontSize: 10, // Reduced from 12 to fit three letters
    letterSpacing: -0.2, // Tighter letter spacing
    textAlign: 'center' as const,
    minWidth: 20, // Ensure consistent width for alignment
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
    position: 'relative' as const,
    overflow: 'visible' as const,
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
  ringNumber: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ringNumberText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  selectedHighlight: {
    position: 'absolute' as const,
    left: 0,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 0 as const,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
};

export default React.memo(WeekRings);