import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  OnboardingContextType, 
  OnboardingData, 
  defaultOnboardingData,
  OnboardingError,
  healthGoalToProfileMapping
} from '@/types/onboarding';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingNavigationManager, OnboardingStep } from '@/utils/onboardingNavigation';
import { OnboardingPersistenceManager } from '@/utils/onboardingPersistence';
import { OnboardingProfileIntegration } from '@/utils/onboardingProfileIntegration';

const ONBOARDING_STORAGE_KEY = 'onboarding_data';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const TOTAL_STEPS = 15;

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigationManager = useRef(new OnboardingNavigationManager()).current;
  
  const { saveProfile } = useUserProfile();
  const { user } = useAuth();

  // Load onboarding data from storage on mount
  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      const loadedData = await OnboardingPersistenceManager.loadOnboardingData();
      if (loadedData) {
        setOnboardingData(loadedData);
        
        // Update navigation manager based on loaded data
        const currentStep = navigationManager.calculateCurrentStepFromData(loadedData);
        navigationManager.goToStep(currentStep);
      }
    } catch (err) {
      console.warn('Failed to load onboarding data:', err);
      setError('Failed to load your progress. Starting fresh.');
    }
  };

  const saveOnboardingData = async (data: OnboardingData) => {
    try {
      await OnboardingPersistenceManager.saveOnboardingData(data);
    } catch (err) {
      console.warn('Failed to save onboarding data:', err);
      setError('Failed to save your progress. Please try again.');
    }
  };

  const updateOnboardingData = useCallback((section: keyof OnboardingData, data: any) => {
    setOnboardingData(prev => {
      const prevSection: any = (prev as any)[section];
      const isMergeable = data !== null && typeof data === 'object' && !Array.isArray(data);
      const nextSection = isMergeable ? { ...(prevSection || {}), ...data } : data;

      const updated: OnboardingData = {
        ...prev,
        [section]: nextSection as any,
      };

      // Save to storage
      saveOnboardingData(updated);

      return updated;
    });
  }, []);

  const nextStep = useCallback(() => {
    const validation = navigationManager.validateStepCompletion(
      navigationManager.getCurrentStep(), 
      onboardingData
    );
    
    if (!validation.canProceed) {
      setError(`Please complete: ${validation.missingFields.join(', ')}`);
      return;
    }
    
    navigationManager.navigateNext();
  }, [onboardingData]);

  const previousStep = useCallback(() => {
    navigationManager.navigatePrevious();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Map onboarding data to user profile format
      const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);

      // Only persist to Supabase if the user is authenticated. Guests should
      // still be able to complete onboarding without triggering auth errors.
      if (user) {
        await saveProfile(profileData);
      }
      
      // Mark onboarding as completed
      await OnboardingPersistenceManager.markOnboardingCompleted();
      
      // Clear temporary onboarding data
      await OnboardingPersistenceManager.clearOnboardingData();
      
      // Update completion timestamp
      const completedData = {
        ...onboardingData,
        completedAt: new Date().toISOString()
      };
      setOnboardingData(completedData);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onboardingData, saveProfile]);

  // Navigation helper functions
  const canGoNext = useCallback(() => {
    return navigationManager.canGoNext();
  }, []);

  const canGoBack = useCallback(() => {
    return navigationManager.canGoBack();
  }, []);

  const getCurrentStepName = useCallback(() => {
    return navigationManager.getCurrentStep();
  }, []);

  const getProgressPercentage = useCallback(() => {
    return navigationManager.getProgressPercentage();
  }, []);

  const validateCurrentStep = useCallback(() => {
    return navigationManager.validateStepCompletion(
      navigationManager.getCurrentStep(),
      onboardingData
    );
  }, [onboardingData]);

  const contextValue: OnboardingContextType = {
    currentStep: navigationManager.getCurrentStepNumber(),
    totalSteps: navigationManager.getTotalSteps(),
    onboardingData,
    updateOnboardingData,
    nextStep,
    previousStep,
    completeOnboarding,
    isLoading,
    error,
    clearError,
    canGoNext,
    canGoBack,
    getCurrentStepName,
    getProgressPercentage,
    validateCurrentStep
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// Helper function to check if onboarding is completed
export async function isOnboardingCompleted(): Promise<boolean> {
  return OnboardingPersistenceManager.isOnboardingCompleted();
}

// Helper function to reset onboarding (for testing)
export async function resetOnboarding(): Promise<void> {
  return OnboardingPersistenceManager.resetOnboarding();
}

