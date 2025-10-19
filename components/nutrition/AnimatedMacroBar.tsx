import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface AnimatedMacroBarProps {
  label: string;
  value: number;
  goal: number;
  color: string;
  icon?: React.ReactNode;
  onPress?: () => void;
}

export const AnimatedMacroBar: React.FC<AnimatedMacroBarProps> = ({
  label,
  value,
  goal,
  color,
  icon,
  onPress,
}) => {
  const percentage = Math.min(1, value / Math.max(goal, 1));
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Main progress animation with spring physics
  useEffect(() => {
    Animated.parallel([
      Animated.spring(progressAnim, {
        toValue: percentage,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Bounce effect when goal is reached
    if (percentage >= 1) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [percentage, progressAnim, scaleAnim, bounceAnim]);

  // Shimmer effect for active progress
  useEffect(() => {
    if (percentage > 0 && percentage < 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [percentage, shimmerAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[
        styles.container,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pressAnim) },
            { translateY: bounceAnim },
          ],
        },
      ]}>
        <View style={styles.header}>
          <View style={styles.labelRow}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={styles.label}>{label}</Text>
          </View>
          <View style={styles.valueRow}>
            <AnimatedNumber
              value={value}
              style={styles.value}
              suffix="g"
            />
            <Text style={styles.goal}>/ {goal}g</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            {/* Shimmer overlay */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.3],
                  }),
                  transform: [{
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-200, 200],
                    }),
                  }],
                },
              ]}
            />

            {/* Main progress bar */}
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: color,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            >
              {/* Progress bar glow */}
              <Animated.View
                style={[
                  styles.progressGlow,
                  {
                    opacity: progressAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.5, 0.8],
                    }),
                  },
                ]}
              />
            </Animated.View>

            {/* Progress indicator dot */}
            <Animated.View
              style={[
                styles.progressDot,
                {
                  backgroundColor: color,
                  left: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  transform: [
                    {
                      scale: progressAnim.interpolate({
                        inputRange: [0, 0.05, 1],
                        outputRange: [0, 1, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>

        {/* Percentage text */}
        <Animated.Text
          style={[
            styles.percentage,
            {
              color: percentage >= 1 ? Colors.success : Colors.lightText,
              transform: [
                {
                  scale: percentage >= 1 ? 1.1 : 1,
                },
              ],
            },
          ]}
        >
          {Math.round(percentage * 100)}%
        </Animated.Text>

        {/* Success indicator */}
        {percentage >= 1 && (
          <Animated.View
            style={[
              styles.successBadge,
              {
                opacity: bounceAnim.interpolate({
                  inputRange: [-5, 0],
                  outputRange: [1, 0.8],
                }),
                transform: [
                  {
                    scale: bounceAnim.interpolate({
                      inputRange: [-5, 0],
                      outputRange: [1.2, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.successText}>✓</Text>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  label: {
    ...Type.body,
    fontWeight: '600',
    color: Colors.text,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...Type.h3,
    fontWeight: '700',
    color: Colors.text,
  },
  goal: {
    ...Type.caption,
    color: Colors.lightText,
    marginLeft: 4,
  },
  progressContainer: {
    position: 'relative',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBackground: {
    flex: 1,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  progressDot: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  shimmer: {
    position: 'absolute',
    width: 100,
    height: '100%',
    backgroundColor: 'white',
  },
  percentage: {
    ...Type.caption,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  successBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
