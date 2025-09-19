import { ActivityLevel, DietaryRestriction, InventoryItem } from './index';

export type HealthGoal = 
  | 'lose-weight' 
  | 'gain-weight' 
  | 'maintain-weight' 
  | 'build-muscle' 
  | 'improve-health' 
  | 'manage-restrictions';

export interface OnboardingBasicProfile {
  age?: number;
  height?: number; // in cm
  weight?: number; // in kg
  activityLevel?: ActivityLevel;
  targetWeight?: number; // in kg
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
}

export interface OnboardingDietaryPreferences {
  restrictions: DietaryRestriction[];
  allergies: string[];
  customRestrictions: string[];
}

export interface OnboardingPantrySetup {
  skipPantry: boolean;
  initialItems: InventoryItem[];
}

export interface OnboardingNotifications {
  mealReminders: boolean;
  shoppingAlerts: boolean;
  progressUpdates: boolean;
}

export interface OnboardingData {
  healthGoal: HealthGoal | null;
  basicProfile: OnboardingBasicProfile;
  dietaryPreferences: OnboardingDietaryPreferences;
  healthConcerns: string[]; // new: user-selected health concerns
  pantrySetup: OnboardingPantrySetup;
  notifications: OnboardingNotifications;
  authChoice: 'signup' | 'signin' | 'guest' | null;
  completedAt?: string;
}

export interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  onboardingData: OnboardingData;
  updateOnboardingData: (section: keyof OnboardingData, data: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  // Navigation helpers
  canGoNext: () => boolean;
  canGoBack: () => boolean;
  getCurrentStepName: () => string;
  getProgressPercentage: () => number;
  validateCurrentStep: () => { canProceed: boolean; missingFields: string[] };
}

export interface OnboardingError {
  type: 'validation' | 'network' | 'auth' | 'storage';
  message: string;
  field?: string;
  recoverable: boolean;
  retryAction?: () => void;
}

export const defaultOnboardingData: OnboardingData = {
  healthGoal: null,
  basicProfile: {},
  dietaryPreferences: {
    restrictions: [],
    allergies: [],
    customRestrictions: []
  },
  healthConcerns: [],
  pantrySetup: {
    skipPantry: false,
    initialItems: []
  },
  notifications: {
    mealReminders: true,
    shoppingAlerts: true,
    progressUpdates: false
  },
  authChoice: null
};

// Health goal to profile mapping
export const healthGoalToProfileMapping = {
  'lose-weight': { goalType: 'lose' as const },
  'gain-weight': { goalType: 'gain' as const },
  'maintain-weight': { goalType: 'maintain' as const },
  'build-muscle': { goalType: 'gain' as const }, // with higher protein targets
  'improve-health': { goalType: 'maintain' as const },
  'manage-restrictions': { goalType: 'maintain' as const }
};