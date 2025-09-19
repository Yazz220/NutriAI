import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, useOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

export default function AICoachIntroScreen() {
  const { nextStep, previousStep } = useOnboarding();

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const avatarPulse = React.useRef(new Animated.Value(1)).current;
  const messageOpacity = React.useRef(new Animated.Value(0)).current;

  const aiFeatures = [
    {
      icon: '🍽️',
      title: 'Meal Planning with Your Pantry',
      description: 'I\'ll suggest meals based on what you actually have at home',
      example: '"What can I make with chicken and rice?"'
    },
    {
      icon: '🔍',
      title: 'Smart Recipe Suggestions',
      description: 'Get personalized recipes that match your goals and preferences',
      example: '"Find me a low-carb dinner recipe"'
    },
    {
      icon: '🛒',
      title: 'Shopping List Creation',
      description: 'I\'ll help you plan shopping trips and never forget ingredients',
      example: '"Plan my shopping for this week\'s meals"'
    },
    {
      icon: '💡',
      title: 'Nutrition Advice',
      description: 'Get answers to your nutrition questions and meal guidance',
      example: '"How can I increase my protein intake?"'
    }
  ];

  const conversationDemo = [
    {
      type: 'user' as const,
      message: 'Plan my meals for today',
      delay: 0
    },
    {
      type: 'ai' as const,
      message: 'I\'d be happy to help! Based on your pantry and goals, here are some great options...',
      delay: 1500
    },
    {
      type: 'user' as const,
      message: 'What about something with chicken?',
      delay: 3000
    },
    {
      type: 'ai' as const,
      message: 'Perfect! I see you have chicken breast in your pantry. How about a Mediterranean chicken bowl with the vegetables you have?',
      delay: 4500
    }
  ];

  useEffect(() => {
    // Initial entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Avatar pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  // Demo conversation animation
  useEffect(() => {
    if (currentMessageIndex < conversationDemo.length) {
      const message = conversationDemo[currentMessageIndex];
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(messageOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
        
        setCurrentMessageIndex(prev => prev + 1);
      }, message.delay);

      return () => clearTimeout(timer);
    } else {
      // Reset demo after completion
      const resetTimer = setTimeout(() => {
        setCurrentMessageIndex(0);
      }, 2000);
      return () => clearTimeout(resetTimer);
    }
  }, [currentMessageIndex]);

  const handleContinue = () => {
    nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  const currentMessage = conversationDemo[currentMessageIndex] || conversationDemo[0];

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim }
          ]}
        >
          <Animated.View 
            style={[
              styles.avatarContainer,
              { transform: [{ scale: avatarPulse }] }
            ]}
          >
            <Text style={styles.avatar}>🤖</Text>
            <View style={styles.avatarGlow} />
          </Animated.View>
          
          <Text style={styles.title}>Meet Your AI Nutrition Coach</Text>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* AI Features */}
          <Animated.View 
            style={[
              styles.featuresSection,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.sectionTitle}>What I can help you with:</Text>
            <View style={styles.featuresContainer}>
              {aiFeatures.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                  </View>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>Try asking:</Text>
                    <Text style={styles.exampleText}>{feature.example}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Conversation Demo */}
          <Animated.View 
            style={[
              styles.demoSection,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.sectionTitle}>See me in action:</Text>
            <View style={styles.conversationContainer}>
              <Animated.View 
                style={[
                  styles.messageContainer,
                  currentMessage.type === 'user' ? styles.userMessage : styles.aiMessage,
                  { opacity: messageOpacity }
                ]}
              >
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarText}>
                    {currentMessage.type === 'user' ? '👤' : '🤖'}
                  </Text>
                </View>
                <View style={styles.messageBubble}>
                  <Text style={styles.messageText}>{currentMessage.message}</Text>
                </View>
              </Animated.View>
              
              <View style={styles.demoIndicator}>
                <Text style={styles.demoIndicatorText}>
                  Live conversation preview • {currentMessageIndex + 1}/{conversationDemo.length}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Getting Started */}
          <Animated.View 
            style={[
              styles.gettingStartedSection,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.gettingStartedCard}>
              <Text style={styles.gettingStartedTitle}>Ready to get started?</Text>
              <Text style={styles.gettingStartedText}>
                Once you complete setup, you can find me in the Coach tab. I'll be ready to help you plan meals, answer nutrition questions, and guide you toward your goals!
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton
              title="Back"
              onPress={handleBack}
              variant="ghost"
              accessibilityLabel="Go back to pantry setup"
            />
            <OnboardingButton
              title="Let's Finish Setup!"
              onPress={handleContinue}
              variant="primary"
              accessibilityLabel="Continue to complete onboarding"
            />
          </View>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  avatar: {
    fontSize: 60,
    textAlign: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: Colors.primary + '20',
    borderRadius: 50,
    zIndex: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 36,
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
  featuresSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  featuresContainer: {
    gap: Spacing.md,
  },
  featureCard: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  exampleContainer: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  exampleLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  exampleText: {
    fontSize: 13,
    color: Colors.text,
    fontStyle: 'italic',
  },
  demoSection: {
    marginBottom: Spacing.xl,
  },
  conversationContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  messageAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  demoIndicator: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  demoIndicatorText: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  gettingStartedSection: {
    marginBottom: Spacing.lg,
  },
  gettingStartedCard: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  gettingStartedTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  gettingStartedText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});