import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, useOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

export default function PantrySetupScreen() {
  const { updateOnboardingData, nextStep, previousStep } = useOnboarding();

  const [selectedOption, setSelectedOption] = useState<'start' | 'skip' | 'demo' | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleOptionSelect = (option: 'start' | 'skip' | 'demo') => {
    setSelectedOption(option);
    
    // Update onboarding data based on selection
    if (option === 'skip') {
      updateOnboardingData('pantrySetup', {
        skipPantry: true,
        initialItems: []
      });
    } else {
      updateOnboardingData('pantrySetup', {
        skipPantry: false,
        initialItems: []
      });
    }
  };

  const handleContinue = () => {
    // Regardless of selection, proceed to the next onboarding step
    nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  const pantryFeatures = [
    {
      icon: '📦',
      title: 'Smart Inventory Tracking',
      description: 'Keep track of what you have at home'
    },
    {
      icon: '📅',
      title: 'Expiration Alerts',
      description: 'Never let food go to waste again'
    },
    {
      icon: '🛒',
      title: 'Smart Shopping Lists',
      description: 'Auto-generate lists based on your needs'
    },
    {
      icon: '🍽️',
      title: 'Recipe Matching',
      description: 'Find recipes you can make right now'
    }
  ];

  const setupOptions = [
    {
      id: 'start' as const,
      title: 'Start Adding Items',
      description: 'Add some pantry items to get started',
      icon: '➕',
      color: Colors.primary
    },
    {
      id: 'demo' as const,
      title: 'Watch Quick Demo',
      description: 'See how pantry management works',
      icon: '▶️',
      color: Colors.secondary || '#6366f1'
    },
    {
      id: 'skip' as const,
      title: 'Skip for Later',
      description: 'Set up your pantry after onboarding',
      icon: '⏭️',
      color: Colors.lightText
    }
  ];

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.mainIcon}>📦</Text>
          </View>
          <Text style={styles.title}>Let's set up your digital pantry</Text>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Features Overview */}
          <Animated.View 
            style={[
              styles.featuresSection,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.sectionTitle}>What you'll get:</Text>
            <View style={styles.featuresGrid}>
              {pantryFeatures.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Setup Options */}
          <Animated.View 
            style={[
              styles.optionsSection,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.sectionTitle}>How would you like to proceed?</Text>
            <View style={styles.optionsContainer}>
              {setupOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedOption === option.id && styles.selectedOptionCard
                  ]}
                  onPress={() => handleOptionSelect(option.id)}
                  accessibilityLabel={`Select ${option.title}`}
                  accessibilityHint={option.description}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedOption === option.id }}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: option.color + '15' }]}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionTitle,
                      selectedOption === option.id && styles.selectedOptionTitle
                    ]}>
                      {option.title}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedOption === option.id && styles.selectedRadioButton
                  ]}>
                    {selectedOption === option.id && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Demo Preview */}
          {selectedOption === 'demo' && (
            <Animated.View style={styles.demoPreview}>
              <Text style={styles.demoTitle}>Demo Preview</Text>
              <View style={styles.demoContainer}>
                <View style={styles.demoItem}>
                  <Text style={styles.demoIcon}>📱</Text>
                  <Text style={styles.demoText}>Scan barcodes or add manually</Text>
                </View>
                <View style={styles.demoItem}>
                  <Text style={styles.demoIcon}>📅</Text>
                  <Text style={styles.demoText}>Set expiration dates</Text>
                </View>
                <View style={styles.demoItem}>
                  <Text style={styles.demoIcon}>🔍</Text>
                  <Text style={styles.demoText}>Find matching recipes</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton
              title="Back"
              onPress={handleBack}
              variant="ghost"
              accessibilityLabel="Go back to dietary preferences"
            />
            <OnboardingButton
              title={selectedOption === 'start' ? 'Add Items' : 
                     selectedOption === 'demo' ? 'Watch Demo' : 'Continue'}
              onPress={handleContinue}
              variant="primary"
              disabled={!selectedOption}
              accessibilityLabel={`Continue with ${selectedOption || 'selected option'}`}
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mainIcon: {
    fontSize: 40,
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 16,
  },
  optionsSection: {
    marginBottom: Spacing.xl,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedOptionCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  selectedOptionTitle: {
    color: Colors.primary,
  },
  optionDescription: {
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
  demoPreview: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.lg,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  demoContainer: {
    gap: Spacing.sm,
  },
  demoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  demoText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row', 
    gap: Spacing.md, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
});