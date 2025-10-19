import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  duration?: number;
  format?: (value: number) => string;
  suffix?: string;
  prefix?: string;
  onAnimationComplete?: () => void;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  style,
  duration = 800,
  format = (v) => Math.round(v).toString(),
  suffix = '',
  prefix = '',
  onAnimationComplete,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const previousValue = useRef(0);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start(() => {
      previousValue.current = value;
      onAnimationComplete?.();
    });
  }, [value, animatedValue, onAnimationComplete]);

  return (
    <Animated.Text
      style={[
        style,
        {
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [previousValue.current * 0.9, previousValue.current, value],
                outputRange: [1, 1.05, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      {prefix}
      <Animated.Text>
        {animatedValue.interpolate({
          inputRange: [0, Math.max(1, value)],
          outputRange: ['0', format(value)],
        })}
      </Animated.Text>
      {suffix}
    </Animated.Text>
  );
};
