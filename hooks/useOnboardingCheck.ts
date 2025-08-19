import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from './useAuth';
import { hasCompletedOnboarding } from '@/utils/onboarding';

/**
 * Hook to check onboarding status and redirect appropriately
 */
export const useOnboardingCheck = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const { session, initializing } = useAuth();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (initializing) return;

      try {
        // If no session, show onboarding
        if (!session) {
          setShouldShowOnboarding(true);
          setIsChecking(false);
          return;
        }

        // Check if user has completed onboarding
        const completed = await hasCompletedOnboarding();
        
        if (!completed) {
          setShouldShowOnboarding(true);
        } else {
          setShouldShowOnboarding(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to showing onboarding on error
        setShouldShowOnboarding(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [session, initializing]);

  const redirectToOnboarding = () => {
    router.replace('/(onboarding)');
  };

  const redirectToApp = () => {
    router.replace('/(tabs)');
  };

  return {
    isChecking,
    shouldShowOnboarding,
    redirectToOnboarding,
    redirectToApp,
  };
};