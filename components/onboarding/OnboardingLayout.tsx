import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { OnboardingLayoutProps, OnboardingStep } from '@/types';
import { ProgressIndicator } from './ProgressIndicator';
import { SkipButton } from './SkipButton';
import { useOnboarding } from './OnboardingProvider';

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  title,
  subtitle,
  showProgress = true,
  showSkip = true,
  onSkip,
  skipWarning,
  currentStep,
  totalSteps = 7,
}) => {
  const { state } = useOnboarding();
  
  // Use context values if not provided as props
  const activeStep = currentStep ?? state.currentStep;
  const completedSteps = state.completedSteps;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Progress Indicator */}
          {showProgress && (
            <ProgressIndicator
              currentStep={activeStep}
              completedSteps={completedSteps}
              totalSteps={totalSteps}
              compact={true}
            />
          )}

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          {/* Skip Button */}
          {showSkip && onSkip && (
            <View style={styles.skipContainer}>
              <SkipButton
                onSkip={onSkip}
                skipWarning={skipWarning}
                variant="text"
                size="sm"
                testID="onboarding-skip-button"
              />
            </View>
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {children}
          </View>
        </ScrollView>

        {/* Footer Spacer for Safe Area */}
        <View style={styles.footer} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: Colors.background,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleSection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes.display * 1.2,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.regular,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: Typography.sizes.lg * 1.4,
    paddingHorizontal: Spacing.md,
  },
  skipContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    zIndex: 1,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },

  // Footer
  footer: {
    height: Spacing.md,
    backgroundColor: Colors.background,
  },
});

// Specialized layout variants
export const OnboardingWelcomeLayout: React.FC<Omit<OnboardingLayoutProps, 'showProgress'>> = (props) => (
  <OnboardingLayout {...props} showProgress={false} />
);

export const OnboardingCompletionLayout: React.FC<Omit<OnboardingLayoutProps, 'showProgress' | 'showSkip'>> = (props) => (
  <OnboardingLayout {...props} showProgress={false} showSkip={false} />
);

// Layout with custom progress indicator
interface OnboardingLayoutWithCustomProgressProps extends OnboardingLayoutProps {
  progressComponent?: React.ReactNode;
}

export const OnboardingLayoutWithCustomProgress: React.FC<OnboardingLayoutWithCustomProgressProps> = ({
  progressComponent,
  showProgress,
  ...props
}) => {
  if (progressComponent) {
    return (
      <OnboardingLayout {...props} showProgress={false}>
        {progressComponent}
        {props.children}
      </OnboardingLayout>
    );
  }
  
  return <OnboardingLayout {...props} showProgress={showProgress} />;
};