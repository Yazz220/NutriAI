import React from 'react';
import {
  Animated as NativeAnimated,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

const PULSE_DURATION_MS = 360;

function ActivityDot({
  color,
  delay,
  reduceMotion,
  size,
}: {
  color: string;
  delay: number;
  reduceMotion: boolean;
  size: number;
}) {
  const opacity = React.useRef(new NativeAnimated.Value(reduceMotion ? 0.55 : 0.28)).current;

  React.useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.55);
      return undefined;
    }

    const animation = NativeAnimated.loop(
      NativeAnimated.sequence([
        NativeAnimated.timing(opacity, {
          toValue: 0.9,
          duration: PULSE_DURATION_MS,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
        NativeAnimated.timing(opacity, {
          toValue: 0.28,
          duration: PULSE_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, reduceMotion]);

  return (
    <NativeAnimated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
        },
      ]}
    />
  );
}

export function NoshActivityDots({
  color = Colors.primary,
  size = 6,
}: {
  color?: string;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ActivityDot color={color} delay={0} reduceMotion={reduceMotion} size={size} />
      <ActivityDot color={color} delay={120} reduceMotion={reduceMotion} size={size} />
      <ActivityDot color={color} delay={240} reduceMotion={reduceMotion} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[4],
  },
  dot: {
    backgroundColor: Colors.primary,
  },
});
