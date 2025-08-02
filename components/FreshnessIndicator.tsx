import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type FreshnessStatus = 'fresh' | 'aging' | 'expiring';

interface FreshnessIndicatorProps {
  status: FreshnessStatus;
  size?: number;
}

export const FreshnessIndicator: React.FC<FreshnessIndicatorProps> = ({ 
  status, 
  size = 12 
}) => {
  const color = status === 'fresh' 
    ? Colors.fresh 
    : status === 'aging' 
      ? Colors.aging 
      : Colors.expiring;

  return (
    <View 
      style={[
        styles.indicator, 
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }
      ]}
      testID={`freshness-${status}`}
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  }
});