import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChefHat, 
  DollarSign, 
  Heart, 
  Sparkles,
  ArrowRight 
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
import { OnboardingWelcomeLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { ANALYTICS_EVENTS } from '@/constants/onboarding';

const { width: screenWidth } = Dimensions.get('window');

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon, title, description, delay }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.benefitCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.benefitIconContainer}>
        {icon}
      </View>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDescription}>{description}</Text>
    </Animated.View>
  );
};

export const WelcomeScreen: React.FC = () => {
  const { navigateNext, exitOnboarding } = useOnboardingNavigation();
  const { trackWelcomeShown, trackUserChoice } = useOnboardingAnalytics();

  // Track welcome screen view on mount
  useEffect(() => {
    trackWelcomeShown();
  }, [trackWelcomeShown]);

  const handleGetStarted = async () => {
    trackUserChoice({
      step: 0, // OnboardingStep.WELCOME
      choiceType: 'navigation',
      choiceValue: 'get_started',
    });
    
    await navigateNext();
  };

  const handleSkip = async () => {
    trackUserChoice({
      step: 0, // OnboardingStep.WELCOME
      choiceType: 'navigation',
      choiceValue: 'skip_to_app',
    });
    
    await exitOnboarding();
  };

  return (
    <OnboardingWelcomeLayout
      title="Welcome to NutriAI"
      subtitle="Your AI-powered kitchen companion"
      showSkip={true}
      onSkip={handleSkip}
      skipWarning="You'll miss out on personalized setup, but you can always complete it later in settings."
    >
      <View style={styles.container}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* Logo Placeholder */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.orange[500]]}
              style={styles.logoGradient}
            >
              <ChefHat size={48} color={Colors.white} />
            </LinearGradient>
          </View>

          {/* Hero Text */}
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Smarter cooking starts here</Text>
            <Text style={styles.heroSubtitle}>
              Transform the way you cook, shop, and eat with personalized AI assistance
            </Text>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <BenefitCard
            icon={<DollarSign size={24} color={Colors.success} />}
            title="Reduce food waste & save money"
            description="Smart suggestions based on what you already have"
            delay={200}
          />
          
          <BenefitCard
            icon={<ChefHat size={24} color={Colors.primary} />}
            title="Plan meals from what you have"
            description="Get recipes that match your current inventory"
            delay={400}
          />
          
          <BenefitCard
            icon={<Heart size={24} color={Colors.error} />}
            title="Discover recipes you'll love"
            description="Personalized recommendations based on your preferences"
            delay={600}
          />
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            size="lg"
            fullWidth={true}
            icon={<ArrowRight size={20} color={Colors.white} />}
            testID="welcome-get-started-button"
            accessibilityLabel="Get started with onboarding"
            accessibilityHint="Begin the setup process to personalize your NutriAI experience"
          />

          <TouchableOpacity
            style={styles.skipTextButton}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            accessibilityHint="Skip setup and go directly to the app with basic functionality"
          >
            <Text style={styles.skipTextButtonText}>
              Skip for now
            </Text>
            <Text style={styles.skipTextButtonSubtext}>
              You can set this up later
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresPreview}>
          <View style={styles.featurePreviewItem}>
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.featurePreviewText}>AI Recipe Suggestions</Text>
          </View>
          <View style={styles.featurePreviewItem}>
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.featurePreviewText}>Smart Inventory Tracking</Text>
          </View>
          <View style={styles.featurePreviewItem}>
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.featurePreviewText}>Personalized Meal Planning</Text>
          </View>
        </View>
      </View>
    </OnboardingWelcomeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: Spacing.lg,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  heroTextContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  heroTitle: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: Typography.sizes.xxxl * 1.2,
  },
  heroSubtitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.regular,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: Typography.sizes.lg * 1.4,
  },

  // Benefits Section
  benefitsSection: {
    marginBottom: Spacing.xxxl,
  },
  benefitCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  benefitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes.lg * 1.3,
  },
  benefitDescription: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    color: Colors.lightText,
    lineHeight: Typography.sizes.md * 1.4,
  },

  // CTA Section
  ctaSection: {
    marginBottom: Spacing.xl,
  },
  skipTextButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  skipTextButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    marginBottom: Spacing.xs / 2,
  },
  skipTextButtonSubtext: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    color: Colors.gray[400],
  },

  // Features Preview
  featuresPreview: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featurePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featurePreviewText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    marginLeft: Spacing.sm,
  },
});