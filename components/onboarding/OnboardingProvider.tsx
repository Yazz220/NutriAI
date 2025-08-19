import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  OnboardingState, 
  OnboardingContextType, 
  OnboardingStep, 
  OnboardingUserData,
  AnalyticsEvent,
  OnboardingAnalytics
} from '@/types';

// Storage key for persisting onboarding state
const ONBOARDING_STORAGE_KEY = '@nutriai_onboarding_state';

// Initial state
const createInitialState = (): OnboardingState => ({
  currentStep: OnboardingStep.WELCOME,
  completedSteps: new Set<OnboardingStep>(),
  userData: {},
  skippedSteps: new Set<OnboardingStep>(),
  startTime: new Date(),
  analytics: {
    sessionId: `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
    events: [],
    completionRate: 0,
    timeSpentPerStep: {},
  },
  isCompleted: false,
});

// Action types for reducer
type OnboardingAction =
  | { type: 'SET_CURRENT_STEP'; payload: OnboardingStep }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<OnboardingUserData> }
  | { type: 'COMPLETE_STEP'; payload: OnboardingStep }
  | { type: 'SKIP_STEP'; payload: OnboardingStep }
  | { type: 'TRACK_EVENT'; payload: AnalyticsEvent }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESTORE_STATE'; payload: Partial<OnboardingState> }
  | { type: 'RESET_STATE' };

// Reducer function
const onboardingReducer = (state: OnboardingState, action: OnboardingAction): OnboardingState => {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'UPDATE_USER_DATA':
      return {
        ...state,
        userData: {
          ...state.userData,
          ...action.payload,
        },
      };

    case 'COMPLETE_STEP':
      const newCompletedSteps = new Set(state.completedSteps);
      newCompletedSteps.add(action.payload);
      
      return {
        ...state,
        completedSteps: newCompletedSteps,
        analytics: {
          ...state.analytics,
          completionRate: (newCompletedSteps.size / Object.keys(OnboardingStep).length) * 100,
        },
      };

    case 'SKIP_STEP':
      const newSkippedSteps = new Set(state.skippedSteps);
      newSkippedSteps.add(action.payload);
      
      return {
        ...state,
        skippedSteps: newSkippedSteps,
      };

    case 'TRACK_EVENT':
      const newEvent = {
        ...action.payload,
        timestamp: new Date(),
      };
      
      return {
        ...state,
        analytics: {
          ...state.analytics,
          events: [...state.analytics.events, newEvent],
        },
      };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        isCompleted: true,
        analytics: {
          ...state.analytics,
          completionRate: 100,
        },
      };

    case 'RESTORE_STATE':
      return {
        ...state,
        ...action.payload,
        // Ensure Sets are properly restored
        completedSteps: new Set(action.payload.completedSteps || []),
        skippedSteps: new Set(action.payload.skippedSteps || []),
      };

    case 'RESET_STATE':
      return createInitialState();

    default:
      return state;
  }
};

// Create context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, createInitialState());

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  // Persist state changes
  useEffect(() => {
    persistState(state);
  }, [state]);

  const loadPersistedState = async () => {
    try {
      const persistedState = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (persistedState) {
        const parsedState = JSON.parse(persistedState);
        // Convert date strings back to Date objects
        if (parsedState.startTime) {
          parsedState.startTime = new Date(parsedState.startTime);
        }
        if (parsedState.analytics?.startTime) {
          parsedState.analytics.startTime = new Date(parsedState.analytics.startTime);
        }
        if (parsedState.analytics?.events) {
          parsedState.analytics.events = parsedState.analytics.events.map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp),
          }));
        }
        
        dispatch({ type: 'RESTORE_STATE', payload: parsedState });
      }
    } catch (error) {
      console.error('Failed to load persisted onboarding state:', error);
    }
  };

  const persistState = async (currentState: OnboardingState) => {
    try {
      // Convert Sets to arrays for JSON serialization
      const stateToSave = {
        ...currentState,
        completedSteps: Array.from(currentState.completedSteps),
        skippedSteps: Array.from(currentState.skippedSteps),
      };
      
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to persist onboarding state:', error);
    }
  };

  // Context methods
  const updateUserData = (data: Partial<OnboardingUserData>) => {
    dispatch({ type: 'UPDATE_USER_DATA', payload: data });
  };

  const nextStep = () => {
    const currentStepValue = state.currentStep;
    const nextStepValue = currentStepValue + 1;
    
    // Mark current step as completed
    dispatch({ type: 'COMPLETE_STEP', payload: currentStepValue });
    
    // Track step completion event
    trackEvent({
      type: 'step_completed',
      step: currentStepValue,
      data: { nextStep: nextStepValue },
    });

    // Move to next step if not at the end
    if (nextStepValue <= OnboardingStep.COMPLETION) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: nextStepValue });
      
      // Track new step view
      trackEvent({
        type: 'step_viewed',
        step: nextStepValue,
      });
    }
  };

  const skipStep = () => {
    const currentStepValue = state.currentStep;
    
    // Mark step as skipped
    dispatch({ type: 'SKIP_STEP', payload: currentStepValue });
    
    // Track skip event
    trackEvent({
      type: 'step_skipped',
      step: currentStepValue,
    });

    // Move to next step
    nextStep();
  };

  const goToStep = (step: OnboardingStep) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
    
    // Track navigation event
    trackEvent({
      type: 'step_viewed',
      step,
      data: { navigatedFrom: state.currentStep },
    });
  };

  const completeOnboarding = async () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    
    // Track completion event
    trackEvent({
      type: 'step_completed',
      step: OnboardingStep.COMPLETION,
      data: { 
        totalTimeSpent: Date.now() - state.startTime.getTime(),
        completedSteps: Array.from(state.completedSteps),
        skippedSteps: Array.from(state.skippedSteps),
      },
    });

    // Mark completion flag for root-level routing guards
    try {
      await AsyncStorage.setItem('@nutriai_onboarding_completed', 'true');
    } catch (error) {
      console.error('Failed to mark onboarding completion flag:', error);
    }

    // Clear persisted state after completion
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear onboarding state:', error);
    }
  };

  const trackEvent = (event: Omit<AnalyticsEvent, 'timestamp'>) => {
    dispatch({ type: 'TRACK_EVENT', payload: event as AnalyticsEvent });
  };

  const contextValue: OnboardingContextType = {
    state,
    updateUserData,
    nextStep,
    skipStep,
    goToStep,
    completeOnboarding,
    trackEvent,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook to use onboarding context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// Hook to check if onboarding is completed
export const useOnboardingStatus = () => {
  const { state } = useOnboarding();
  return {
    isCompleted: state.isCompleted,
    currentStep: state.currentStep,
    completionRate: state.analytics.completionRate,
  };
};