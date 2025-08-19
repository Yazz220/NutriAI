import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingStep, OnboardingUserPreferences, UserPreferences } from '@/types';
import { ONBOARDING_VERSION } from '@/constants/onboarding';

// Storage keys
const ONBOARDING_COMPLETED_KEY = '@nutriai_onboarding_completed';
const USER_PREFERENCES_KEY = '@nutriai_user_preferences';

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking onboarding completion:', error);
    return false;
  }
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('Error marking onboarding as completed:', error);
  }
};

/**
 * Reset onboarding completion status (for testing/debugging)
 */
export const resetOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
  }
};

/**
 * Save user preferences from onboarding
 */
export const saveOnboardingPreferences = async (
  preferences: Partial<OnboardingUserPreferences>
): Promise<void> => {
  try {
    const existingPreferences = await getUserPreferences();
    const updatedPreferences: OnboardingUserPreferences = {
      ...existingPreferences,
      ...preferences,
      onboardingCompleted: true,
      onboardingVersion: ONBOARDING_VERSION,
      completedAt: new Date(),
    };

    await AsyncStorage.setItem(
      USER_PREFERENCES_KEY,
      JSON.stringify(updatedPreferences)
    );
  } catch (error) {
    console.error('Error saving onboarding preferences:', error);
  }
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (): Promise<OnboardingUserPreferences> => {
  try {
    const preferences = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
    if (preferences) {
      const parsed = JSON.parse(preferences);
      // Convert date strings back to Date objects
      if (parsed.completedAt) {
        parsed.completedAt = new Date(parsed.completedAt);
      }
      return parsed;
    }
    
    // Return default preferences
    return {
      dietaryPreferences: [],
      allergies: [],
      mealPlanDays: 7,
      onboardingCompleted: false,
      onboardingVersion: ONBOARDING_VERSION,
      skippedSteps: [],
      initialSetupSource: 'onboarding',
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {
      dietaryPreferences: [],
      allergies: [],
      mealPlanDays: 7,
      onboardingCompleted: false,
      onboardingVersion: ONBOARDING_VERSION,
      skippedSteps: [],
      initialSetupSource: 'onboarding',
    };
  }
};

/**
 * Get the next onboarding step based on current progress
 */
export const getNextOnboardingStep = (
  completedSteps: Set<OnboardingStep>,
  skippedSteps: Set<OnboardingStep>
): OnboardingStep => {
  const allSteps = Object.values(OnboardingStep).filter(
    (step): step is OnboardingStep => typeof step === 'number'
  );

  for (const step of allSteps) {
    if (!completedSteps.has(step) && !skippedSteps.has(step)) {
      return step;
    }
  }

  return OnboardingStep.COMPLETION;
};

/**
 * Calculate onboarding completion percentage
 */
export const calculateCompletionPercentage = (
  completedSteps: Set<OnboardingStep>,
  totalSteps: number = Object.keys(OnboardingStep).length / 2 // Enum has both string and number keys
): number => {
  return Math.round((completedSteps.size / totalSteps) * 100);
};

/**
 * Check if a step can be skipped
 */
export const canSkipStep = (step: OnboardingStep): boolean => {
  // AUTH step cannot be skipped as it's required for full functionality
  return step !== OnboardingStep.AUTH;
};

/**
 * Get step display information
 */
export const getStepInfo = (step: OnboardingStep) => {
  const stepNames = {
    [OnboardingStep.WELCOME]: 'Welcome',
    [OnboardingStep.AUTH]: 'Authentication',
    [OnboardingStep.DIETARY_PREFERENCES]: 'Dietary Preferences',
    [OnboardingStep.COOKING_HABITS]: 'Cooking Habits',
    [OnboardingStep.INVENTORY_KICKSTART]: 'Inventory Setup',
    [OnboardingStep.AI_COACH_INTRO]: 'AI Coach Introduction',
    [OnboardingStep.COMPLETION]: 'Completion',
  };

  return {
    name: stepNames[step],
    number: step + 1,
    canSkip: canSkipStep(step),
  };
};

/**
 * Generate analytics session ID
 */
export const generateSessionId = (): string => {
  return `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format time duration for analytics
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/**
 * Validate onboarding data completeness
 */
export const validateOnboardingData = (userData: any): {
  isValid: boolean;
  missingFields: string[];
} => {
  const requiredFields = ['authMethod'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!userData[field]) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Clean up onboarding data after completion
 */
export const cleanupOnboardingData = async (): Promise<void> => {
  try {
    // Remove temporary onboarding state
    await AsyncStorage.removeItem('@nutriai_onboarding_state');
  } catch (error) {
    console.error('Error cleaning up onboarding data:', error);
  }
};