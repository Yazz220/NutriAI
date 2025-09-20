import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, useOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { APP_NAME, NOSH_HEADER_SUBTITLE } from '@/constants/brand';

export default function WelcomeScreen() {
  const { updateOnboardingData, nextStep } = useOnboarding();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const benefitAnimations = useRef<Animated.Value[]>([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  useEffect(() => {
    // Staggered entrance animations
    const logoAnimation = Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]);

    const titleAnimation = Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]);

    const benefitAnimTimings = benefitAnimations.map((anim: Animated.Value, index: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      })
    );

    // Chain animations
    Animated.sequence([
      logoAnimation,
      Animated.delay(200),
      titleAnimation,
      Animated.delay(300),
      Animated.stagger(150, benefitAnimTimings)
    ]).start();
  }, []);

  const handleGetStarted = () => {
    nextStep();
  };

  const benefits = [
    {
      icon: '🤖',
      text: 'Track meals effortlessly with AI',
      description: 'Smart food recognition and logging'
    },
    {
      icon: '📦',
      text: 'Manage your pantry inventory',
      description: 'Never run out of ingredients again'
    },
    {
      icon: '🍽️',
      text: 'Get personalized meal suggestions',
      description: 'Recipes tailored to your goals and preferences'
    }
  ];

  return (
    <OnboardingScreenWrapper showProgress={false}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity
              }
            ]}
          >
            <Text style={styles.logo}>🥗</Text>
          </Animated.View>
          
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }]
            }}
          >
            <Text style={styles.title}>{APP_NAME}</Text>
            <Text style={styles.tagline}>{NOSH_HEADER_SUBTITLE}</Text>
          </Animated.View>
          
          <View style={styles.benefitsContainer}>
            {benefits.map((benefit, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.benefitCard,
                  {
                    opacity: benefitAnimations[index],
                    transform: [{
                      translateY: benefitAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
        
        <View style={styles.footer}>
          <OnboardingButton
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            accessibilityLabel="Start onboarding process"
            accessibilityHint={`Begin setting up your ${APP_NAME} profile`}
          />
        </View>
      </View>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    fontSize: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 48,
    fontWeight: Typography.weights.medium,
  },
  benefitsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
    lineHeight: 22,
  },
  benefitDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  footer: {
    paddingBottom: Spacing.xl,
  },
});