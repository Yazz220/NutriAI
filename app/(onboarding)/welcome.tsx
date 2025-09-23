import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { Asset } from 'expo-asset';
import { OnboardingScreenWrapper, OnboardingButton, useOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { APP_NAME, NOSH_HEADER_SUBTITLE } from '@/constants/brand';

export default function WelcomeScreen() {
  const { updateOnboardingData, nextStep } = useOnboarding();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current; // show immediately
  
  // Responsive hero size for the GIF (very large)
  const windowW = Dimensions.get('window').width;
  const heroSize = Math.min(windowW * 0.85, 360); // up to 360px, ~85% of width

  useEffect(() => {
    // Staggered entrance animations
    const logoAnimation = Animated.timing(logoScale, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    });

    // Preload GIF into cache to avoid delayed display on first mount
    Asset.fromModule(require('@/assets/images/nosh/Nosh.gif')).downloadAsync().catch(() => {});

    // Play logo animation
    logoAnimation.start();
  }, []);

  const handleGetStarted = () => {
    nextStep();
  };

  return (
    <OnboardingScreenWrapper showProgress={false}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.logoContainer,
              { width: heroSize, height: heroSize },
              {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity
              }
            ]}
          >
            <Image
              source={require('@/assets/images/nosh/Nosh.gif')}
              style={[styles.logoGif, { width: heroSize, height: heroSize }]}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  logoContainer: {
    // dynamic width/height applied inline
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoGif: {
    // dynamic width/height applied inline
  },
  footer: {
    paddingBottom: Spacing.xl,
  },
});