import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Check, Sparkles, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FoodLoggingSuccessProps {
  visible: boolean;
  calories: number;
  protein?: number;
  foodName: string;
  onComplete: () => void;
}

export const FoodLoggingSuccess: React.FC<FoodLoggingSuccessProps> = ({
  visible,
  calories,
  protein,
  foodName,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;
  const calorieSlide = useRef(new Animated.Value(30)).current;
  const particleAnims = useRef(
    Array(6)
      .fill(0)
      .map(() => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
      }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.3);
      checkScale.setValue(0);
      calorieSlide.setValue(30);
      particleAnims.forEach(p => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);
      });

      // Main animation sequence
      Animated.parallel([
        // Fade in backdrop
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        
        // Scale in main content
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: 100,
          useNativeDriver: true,
        }),

        // Check mark animation
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),

        // Sparkle rotation
        Animated.loop(
          Animated.timing(sparkleRotation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          })
        ),

        // Calorie number slide
        Animated.spring(calorieSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          delay: 300,
          useNativeDriver: true,
        }),

        // Particle animations
        ...particleAnims.map((particle, i) =>
          Animated.sequence([
            Animated.delay(400 + i * 50),
            Animated.parallel([
              Animated.spring(particle.opacity, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
              }),
              Animated.spring(particle.scale, {
                toValue: 1,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
              }),
              Animated.timing(particle.x, {
                toValue: (Math.random() - 0.5) * 200,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.y, {
                toValue: (Math.random() - 0.5) * 200,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start(() => {
        setTimeout(onComplete, 500);
      });

      // Auto-hide after 2 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Success Circle */}
        <View style={styles.successCircle}>
          <Animated.View
            style={{
              transform: [
                { scale: checkScale },
                {
                  rotate: sparkleRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Sparkles size={60} color={Colors.primary} style={styles.sparkles} />
          </Animated.View>
          <Animated.View
            style={[
              styles.checkContainer,
              {
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <Check size={40} color={Colors.white} strokeWidth={3} />
          </Animated.View>
        </View>

        {/* Food Name */}
        <Text style={styles.foodName}>{foodName}</Text>

        {/* Calorie Display */}
        <Animated.View
          style={[
            styles.calorieContainer,
            {
              transform: [{ translateY: calorieSlide }],
              opacity: fadeAnim,
            },
          ]}
        >
          <Plus size={20} color={Colors.success} />
          <Text style={styles.calories}>{calories}</Text>
          <Text style={styles.caloriesLabel}>calories</Text>
        </Animated.View>

        {/* Protein if provided */}
        {protein && (
          <Animated.View
            style={[
              styles.proteinContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: calorieSlide }],
              },
            ]}
          >
            <Text style={styles.proteinText}>{protein}g protein</Text>
          </Animated.View>
        )}

        {/* Particle Effects */}
        {particleAnims.map((particle, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                opacity: particle.opacity,
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { scale: particle.scale },
                ],
              },
            ]}
          >
            <View style={[styles.particleDot, { backgroundColor: Colors.primary }]} />
          </Animated.View>
        ))}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    position: 'relative',
    overflow: 'visible',
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  sparkles: {
    position: 'absolute',
    opacity: 0.3,
  },
  checkContainer: {
    position: 'absolute',
  },
  foodName: {
    ...Type.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  calories: {
    ...Type.h2,
    color: Colors.success,
    fontWeight: '700',
  },
  caloriesLabel: {
    ...Type.body,
    color: Colors.lightText,
  },
  proteinContainer: {
    marginTop: 4,
  },
  proteinText: {
    ...Type.caption,
    color: Colors.lightText,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
  },
  particleDot: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
});
