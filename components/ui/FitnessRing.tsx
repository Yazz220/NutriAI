import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export type RingSpec = {
  pct: number; // 0..1
  color: string;
};

export type FitnessRingProps = {
  size?: number; // total square size
  stroke?: number; // stroke width per ring
  gap?: number; // gap between rings
  backgroundColor?: string; // base track color
  rings: RingSpec[]; // outer to inner
  rotate?: number; // start angle (default -90)
  rounded?: boolean;
};

export const FitnessRing: React.FC<FitnessRingProps> = ({
  size = 44,
  stroke = 3,
  gap = 2,
  backgroundColor = 'rgba(255,255,255,0.15)',
  rings,
  rotate = -90,
  rounded = true,
}) => {
  const cx = size / 2;
  const cy = size / 2;

  // Compute radii per ring (outer to inner)
  const totalRingBand = rings.length * stroke + (rings.length - 1) * gap;
  const outerRadius = (size - stroke) / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={backgroundColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={backgroundColor} stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        {rings.map((ring, idx) => {
          const r = outerRadius - idx * (stroke + gap);
          const circumference = 2 * Math.PI * r;
          const dash = Math.max(0, Math.min(1, ring.pct)) * circumference;
          return (
            <React.Fragment key={`ring-${idx}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke="url(#trackGradient)"
                strokeWidth={stroke}
                fill="none"
                opacity={0.35}
              />
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={ring.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash}, ${circumference}`}
                strokeLinecap={rounded ? 'round' : 'butt'}
                fill="none"
                rotation={rotate}
                origin={`${cx}, ${cy}`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({});

export default FitnessRing;
