import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

interface AnimatedCalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  showPulse?: boolean;
}

export const AnimatedCalorieRing: React.FC<AnimatedCalorieRingProps> = ({
  consumed,
  goal,
  size = 200,
  strokeWidth = 14,
  showPulse = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(1, consumed / Math.max(goal, 1));
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Main progress animation
  useEffect(() => {
    Animated.parallel([
      // Progress fill animation
      Animated.spring(progressAnim, {
        toValue: percentage,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      
      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      
      // Glow effect for completion
      percentage >= 1 ? 
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ) : Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [percentage, progressAnim, scaleAnim, glowAnim]);

  // Pulse animation when value changes
  useEffect(() => {
    if (showPulse && consumed > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [consumed, pulseAnim, showPulse]);

  // Subtle rotation for active state
  useEffect(() => {
    if (percentage > 0 && percentage < 1) {
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 30000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [percentage, rotationAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const getColor = () => {
    if (percentage >= 1) return Colors.success;
    if (percentage >= 0.7) return Colors.warning;
    return Colors.primary;
  };

  return (
    <Animated.View style={[
      styles.container,
      {
        transform: [
          { scale: scaleAnim },
          { 
            rotate: rotationAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            })
          },
        ],
      },
    ]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={getColor()} stopOpacity="1" />
            <Stop offset="100%" stopColor={getColor()} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />

        {/* Glow effect */}
        <AnimatedG opacity={glowAnim}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 10}
            stroke={Colors.success}
            strokeWidth={2}
            fill="none"
            opacity={0.3}
          />
        </AnimatedG>

        {/* Progress ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />

        {/* End cap decoration */}
        {percentage > 0 && (
          <AnimatedG
            opacity={progressAnim.interpolate({
              inputRange: [0, 0.05, 1],
              outputRange: [0, 1, 1],
            })}
          >
            <Circle
              cx={size / 2}
              cy={strokeWidth / 2}
              r={strokeWidth / 2}
              fill={getColor()}
            />
          </AnimatedG>
        )}
      </Svg>

      {/* Center content */}
      <Animated.View style={[
        styles.centerContent,
        {
          transform: [
            { scale: pulseAnim },
            {
              rotate: rotationAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '-360deg'],
              })
            },
          ],
        },
      ]}>
        <AnimatedNumber
          value={consumed}
          style={styles.consumedText}
          duration={800}
        />
        <Text style={styles.goalText}>/ {goal} cal</Text>
        {percentage >= 1 && (
          <Animated.Text style={[
            styles.completeText,
            {
              opacity: glowAnim,
              transform: [{ scale: glowAnim }],
            },
          ]}>
            Goal Reached! 🎉
          </Animated.Text>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedText: {
    ...Type.h1,
    fontSize: 42,
    fontWeight: '700',
    color: Colors.text,
  },
  goalText: {
    ...Type.body,
    color: Colors.lightText,
    marginTop: -4,
  },
  completeText: {
    ...Type.caption,
    color: Colors.success,
    marginTop: 8,
    position: 'absolute',
    bottom: -30,
  },
});
