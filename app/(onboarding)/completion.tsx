import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated, Alert } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScreenWrapper, OnboardingButton, useOnboarding, resetOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';

export default function CompletionScreen() {
  const { completeOnboarding, isLoading, updateOnboardingData } = useOnboarding();
  const { session } = useAuth();
  
  const [authChoice, setAuthChoice] = useState<'signup' | 'signin' | 'guest' | null>(null);
  const [notifications, setNotifications] = useState({
    mealReminders: true,
    shoppingAlerts: true,
    progressUpdates: false,
  });
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const celebrationScale = React.useRef(new Animated.Value(0)).current;
  const confettiAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Update onboarding data with notification preferences
    updateOnboardingData('notifications', notifications);
  }, []);

  useEffect(() => {
    if (authChoice) {
      updateOnboardingData('authChoice', authChoice);
    }
  }, [authChoice, updateOnboardingData]);

  const handleAuthChoice = (choice: 'signup' | 'signin' | 'guest') => {
    setAuthChoice(choice);
    
    if (choice === 'signup' || choice === 'signin') {
      // Navigate to existing auth flow
      router.push('/(auth)');
    }
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    const newNotifications = {
      ...notifications,
      [key]: !notifications[key]
    };
    setNotifications(newNotifications);
    updateOnboardingData('notifications', newNotifications);
  };

  const startCelebration = () => {
    setShowCelebration(true);
    
    // Celebration animation sequence
    Animated.sequence([
      Animated.timing(celebrationScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleStartTracking = async () => {
    try {
      // Start celebration
      startCelebration();
      
      // Wait for animation
      setTimeout(async () => {
        await completeOnboarding();
        router.replace('/(tabs)');
      }, 1500);
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const devResetEnabled = process.env.EXPO_PUBLIC_DEV_RESET_ONBOARDING === 'true';

  const handleDevReset = async () => {
    try {
      await resetOnboarding();
      Alert.alert('Onboarding Reset', 'Onboarding data cleared. Please reload the app to restart onboarding.');
    } catch (e) {
      Alert.alert('Reset Failed', 'Could not reset onboarding. Check logs.');
    }
  };

  const authOptions = [
    {
      id: 'signup' as const,
      title: 'Create Account',
      description: 'Save your data and sync across devices',
      icon: '👤',
      benefits: ['Cloud backup', 'Cross-device sync', 'Advanced features']
    },
    {
      id: 'signin' as const,
      title: 'Sign In',
      description: 'Already have an account? Welcome back!',
      icon: '🔑',
      benefits: ['Access your data', 'Restore preferences', 'Continue progress']
    },
    {
      id: 'guest' as const,
      title: 'Continue as Guest',
      description: 'Start using NutriAI right away',
      icon: '👋',
      benefits: ['No registration needed', 'Full app access', 'Create account later']
    }
  ];

  const notificationOptions = [
    {
      key: 'mealReminders' as const,
      title: 'Meal Reminders',
      description: 'Get reminded about planned meals',
      icon: '🍽️'
    },
    {
      key: 'shoppingAlerts' as const,
      title: 'Shopping Alerts',
      description: 'Notifications for shopping list updates',
      icon: '🛒'
    },
    {
      key: 'progressUpdates' as const,
      title: 'Progress Updates',
      description: 'Weekly nutrition progress summaries',
      icon: '📊'
    }
  ];

  if (showCelebration) {
    return (
      <OnboardingScreenWrapper showProgress={false}>
        <View style={styles.celebrationContainer}>
          <Animated.View 
            style={[
              styles.celebrationContent,
              { transform: [{ scale: celebrationScale }] }
            ]}
          >
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>You're All Set!</Text>
            <Text style={styles.celebrationSubtitle}>
              Welcome to your personalized nutrition journey
            </Text>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.confetti,
              { opacity: confettiAnim }
            ]}
          >
            <Text style={styles.confettiEmoji}>✨🎊🌟🎉✨</Text>
          </Animated.View>
        </View>
      </OnboardingScreenWrapper>
    );
  }

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>
            Just a couple more steps to personalize your experience
          </Text>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Authentication Options */}
          {!session && (
            <Animated.View 
              style={[
                styles.section,
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.sectionTitle}>Save Your Progress</Text>
              <Text style={styles.sectionSubtitle}>
                Choose how you'd like to continue with NutriAI
              </Text>
              
              <View style={styles.authOptionsContainer}>
                {authOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.authOption,
                      authChoice === option.id && styles.selectedAuthOption
                    ]}
                    onPress={() => handleAuthChoice(option.id)}
                    accessibilityLabel={`Select ${option.title}`}
                    accessibilityHint={option.description}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: authChoice === option.id }}
                  >
                    <View style={styles.authOptionHeader}>
                      <Text style={styles.authOptionIcon}>{option.icon}</Text>
                      <View style={styles.authOptionContent}>
                        <Text style={[
                          styles.authOptionTitle,
                          authChoice === option.id && styles.selectedAuthOptionTitle
                        ]}>
                          {option.title}
                        </Text>
                        <Text style={styles.authOptionDescription}>
                          {option.description}
                        </Text>
                      </View>
                      <View style={[
                        styles.radioButton,
                        authChoice === option.id && styles.selectedRadioButton
                      ]}>
                        {authChoice === option.id && <View style={styles.radioButtonInner} />}
                      </View>
                    </View>
                    
                    <View style={styles.benefitsList}>
                      {option.benefits.map((benefit, index) => (
                        <Text key={index} style={styles.benefitItem}>
                          • {benefit}
                        </Text>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Notification Preferences */}
          <Animated.View 
            style={[
              styles.section,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <Text style={styles.sectionSubtitle}>
              Choose which notifications you'd like to receive
            </Text>
            
            <View style={styles.notificationsContainer}>
              {notificationOptions.map((option) => (
                <View key={option.key} style={styles.notificationOption}>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationIcon}>{option.icon}</Text>
                    <View style={styles.notificationText}>
                      <Text style={styles.notificationTitle}>{option.title}</Text>
                      <Text style={styles.notificationDescription}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifications[option.key]}
                    onValueChange={() => handleNotificationToggle(option.key)}
                    trackColor={{ false: Colors.lightGray, true: Colors.primary + '40' }}
                    thumbColor={notifications[option.key] ? Colors.primary : Colors.white}
                    accessibilityLabel={`Toggle ${option.title}`}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: notifications[option.key] }}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton
              title="Back"
              onPress={handleBack}
              variant="ghost"
              disabled={isLoading}
              accessibilityLabel="Go back to AI coach introduction"
            />
            <OnboardingButton
              title="Start Tracking!"
              onPress={handleStartTracking}
              variant="primary"
              loading={isLoading}
              disabled={!session && !authChoice}
              accessibilityLabel="Complete onboarding and start using NutriAI"
            />
          </View>
          {devResetEnabled && (
            <TouchableOpacity onPress={handleDevReset} style={styles.devResetLink} accessibilityRole="button" accessibilityLabel="Reset onboarding (developer)">
              <Text style={styles.devResetText}>Reset onboarding (dev)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: Typography.weights.medium,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  authOptionsContainer: {
    gap: Spacing.md,
  },
  authOption: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedAuthOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  authOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  authOptionIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  authOptionContent: {
    flex: 1,
  },
  authOptionTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  selectedAuthOptionTitle: {
    color: Colors.primary,
  },
  authOptionDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  benefitsList: {
    paddingLeft: Spacing.lg,
  },
  benefitItem: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  notificationsContainer: {
    gap: Spacing.md,
  },
  notificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  devResetLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  devResetText: {
    fontSize: 12,
    color: Colors.lightText,
    textDecorationLine: 'underline',
  },
  
  // Celebration styles
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  celebrationContent: {
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  celebrationTitle: {
    fontSize: 36,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 18,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 26,
  },
  confetti: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confettiEmoji: {
    fontSize: 24,
    letterSpacing: 8,
  },
});