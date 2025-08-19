import React from 'react';
import { View } from 'react-native';
import { OnboardingStep } from '@/types';
import { useOnboarding, OnboardingProvider } from './OnboardingProvider';
import { 
  WelcomeScreen, 
  AuthScreen, 
  DietaryPreferencesScreen,
  CookingHabitsScreen,
  InventoryKickstartScreen,
  AICoachIntroScreen,
  CompletionScreen
} from './screens';


/**
 * Main onboarding flow component that renders the appropriate screen
 * based on the current onboarding step
 */
export const OnboardingFlow: React.FC = () => {
  const { state } = useOnboarding();

  const renderCurrentScreen = () => {
    switch (state.currentStep) {
      case OnboardingStep.WELCOME:
        return <WelcomeScreen />;
      
      case OnboardingStep.AUTH:
        return <AuthScreen />;
      
      case OnboardingStep.DIETARY_PREFERENCES:
        return <DietaryPreferencesScreen />;
      
      case OnboardingStep.COOKING_HABITS:
        return <CookingHabitsScreen />;
      
      case OnboardingStep.INVENTORY_KICKSTART:
        return <InventoryKickstartScreen />;
      
      case OnboardingStep.AI_COACH_INTRO:
        return <AICoachIntroScreen />;
      
      case OnboardingStep.COMPLETION:
        return <CompletionScreen />;
      
      default:
        return <WelcomeScreen />;
    }
  };

  return renderCurrentScreen();
};

/**
 * Complete onboarding component with provider
 * Use this as the main entry point for onboarding
 */
export const OnboardingWithProvider: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
};