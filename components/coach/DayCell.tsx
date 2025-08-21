import React from 'react';
import { TouchableOpacity, Text, View, Dimensions } from 'react-native';
import { FitnessRing, RingSpec } from '@/components/ui/FitnessRing';
import { Colors } from '@/constants/colors';

interface DayCellProps {
  date: Date;
  selected: boolean;
  isToday: boolean;
  isYesterday: boolean;
  isFuture: boolean;
  status?: 'met' | 'missed';
  rings?: RingSpec[];
  onPress: () => void;
}

const DayCell: React.FC<DayCellProps> = ({
  date,
  selected,
  isToday,
  isYesterday,
  isFuture,
  status,
  rings,
  onPress,
}) => {
  const size = 44; // 40-44dp circle, choose 44 for better tap target
  const ringStroke = 2; // default outer ring stroke for fallback
  const radius = (size - ringStroke) / 2;
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const weekdayInitial = Array.from(weekday)[0] ?? weekday.charAt(0);
  const dayNum = date.getDate();

  // Visual state colors (tokens)
  const baseRing = Colors.border;
  const selectedFill = Colors.primary;
  const todayOutline = Colors.primary;
  const textColor = Colors.text;
  const subText = Colors.lightText;

  // Progress ring: keep subtle unless selected; no new data logic introduced
  const ringColor = selected ? Colors.primary : baseRing;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${weekday} ${dayNum}${isToday ? ', Today' : ''}${selected ? ', Selected' : ''}`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={onPress}
      style={styles.carouselItem}
    >
      <Text style={[styles.dayWeekLabel, selected && styles.dayWeekLabelSelected]}>
        {weekdayInitial.toUpperCase()}
      </Text>
      <View style={[styles.dayCircleContainer, isToday && styles.dayCircleToday]}>
        {rings && rings.length > 0 ? (
          <FitnessRing size={size} stroke={3} gap={2} backgroundColor={baseRing} rings={rings} />
        ) : (
          <View style={styles.dayCircleInner} pointerEvents="none">
            <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{dayNum}</Text>
          </View>
        )}
      </View>
      {/* Mini activity bar - decorative only to avoid logic changes */}
      <View style={[styles.dayMiniBar, selected && styles.dayMiniBarSelected, isFuture && styles.dayMiniBarFuture]} />
      {/* Optional status text tint - only if provided (e.g., for selected via existing ringPct) */}
      {!!status && (
        <Text style={[styles.dayStatus, status === 'met' ? styles.dayStatusMet : styles.dayStatusMissed]}>
          {status === 'met' ? 'Met' : 'Missed'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = {
  carouselItem: {
    width: 64,
    alignItems: 'center' as const,
    marginHorizontal: 6,
  },
  dayWeekLabel: {
    color: Colors.lightText,
    fontSize: 12,
    marginBottom: 6,
  },
  dayWeekLabelSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  dayCircleContainer: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dayCircleToday: {
    // Add subtle today indicator if needed
  },
  dayCircleInner: {
    position: 'absolute' as const,
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dayNumber: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  dayNumberSelected: {
    color: Colors.white,
  },
  dayMiniBar: {
    marginTop: 6,
    height: 3,
    width: 24,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  dayMiniBarSelected: {
    backgroundColor: Colors.primary,
  },
  dayMiniBarFuture: {
    opacity: 0.6,
  },
  dayStatus: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.lightText,
  },
  dayStatusMet: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  dayStatusMissed: {
    color: Colors.warning,
    fontWeight: '600' as const,
  },
};

export default React.memo(DayCell);