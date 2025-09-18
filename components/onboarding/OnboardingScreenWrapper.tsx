import React from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { ProgressIndicator } from './ProgressIndicator';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface OnboardingScreenWrapperProps {
  children: React.ReactNode;
  showProgress?: boolean;
  backgroundColor?: string;
}

export function OnboardingScreenWrapper({ 
  children, 
  showProgress = true,
  backgroundColor = Colors.background 
}: OnboardingScreenWrapperProps) {
  const { currentStep, totalSteps } = useOnboarding();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />
      
      {showProgress && (
        <View style={styles.progressContainer}>
          <ProgressIndicator 
            currentStep={currentStep} 
            totalSteps={totalSteps}
            animated={true}
          />
        </View>
      )}
      
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});