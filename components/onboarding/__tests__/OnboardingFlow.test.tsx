import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnboardingFlow, OnboardingWithProvider } from '../OnboardingFlow';
import { OnboardingStep } from '@/types';

// Mock all the screens
jest.mock('../screens/WelcomeScreen', () => ({
  WelcomeScreen: () => <View testID="welcome-screen"><Text>Welcome Screen</Text></View>,
}));

jest.mock('../screens/AuthScreen', () => ({
  AuthScreen: () => <View testID="auth-screen"><Text>Auth Screen</Text></View>,
}));

jest.mock('../screens/DietaryPreferencesScreen', () => ({
  DietaryPreferencesScreen: () => <View testID="dietary-screen"><Text>Dietary Screen</Text></View>,
}));

jest.mock('../screens/CookingHabitsScreen', () => ({
  CookingHabitsScreen: () => <View testID="habits-screen"><Text>Habits Screen</Text></View>,
}));

jest.mock('../screens/InventoryKickstartScreen', () => ({
  InventoryKickstartScreen: () => <View testID="inventory-screen"><Text>Inventory Screen</Text></View>,
}));

jest.mock('../screens/AICoachIntroScreen', () => ({
  AICoachIntroScreen: () => <View testID="ai-screen"><Text>AI Screen</Text></View>,
}));

jest.mock('../screens/CompletionScreen', () => ({
  CompletionScreen: () => <View testID="completion-screen"><Text>Completion Screen</Text></View>,
}));

// Mock the provider
const mockOnboardingContext = {
  state: {
    currentStep: OnboardingStep.WELCOME,
    completedSteps: new Set(),
    userData: {},
    skippedSteps: new Set(),
    startTime: new Date(),
    analytics: {
      sessionId: 'test-session',
      startTime: new Date(),
      events: [],
      completionRate: 0,
      timeSpentPerStep: {},
    },
    isCompleted: false,
  },
  updateUserData: jest.fn(),
  nextStep: jest.fn(),
  skipStep: jest.fn(),
  goToStep: jest.fn(),
  completeOnboarding: jest.fn(),
  trackEvent: jest.fn(),
};

jest.mock('../OnboardingProvider', () => ({
  useOnboarding: () => mockOnboardingContext,
  OnboardingProvider: ({ children }: any) => children,
}));

describe('OnboardingFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome screen by default', () => {
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('welcome-screen')).toBeTruthy();
  });

  it('renders auth screen when on auth step', () => {
    mockOnboardingContext.state.currentStep = OnboardingStep.AUTH;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('auth-screen')).toBeTruthy();
  });

  it('renders dietary preferences screen when on dietary step', () => {
    mockOnboardingContext.state.currentStep = OnboardingStep.DIETARY_PREFERENCES;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('dietary-screen')).toBeTruthy();
  });

  it('renders cooking habits screen when on habits step', () => {
    mockOnboardingContext.state.currentStep = OnboardingStep.COOKING_HABITS;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('habits-screen')).toBeTruthy();
  });

  it('renders inventory screen when on inventory step', () => {
    mockOnboardingContext.state.currentStep = OnboardingStep.INVENTORY_KICKSTART;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('inventory-screen')).toBeTruthy();
  });

  it('renders AI coach screen when on AI step', () => {
    mockOnboardingContext.state.currentStep = OnboardingStep.AI_COACH_INTRO;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('ai-screen')).toBeTruthy();
  });

  it('renders completion screen when on completion step', () => {
    mockOnboardingContext.state.currentStep = OnboardingStep.COMPLETION;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('completion-screen')).toBeTruthy();
  });

  it('falls back to welcome screen for invalid step', () => {
    mockOnboardingContext.state.currentStep = 999 as OnboardingStep;
    const { getByTestId } = render(<OnboardingFlow />);
    expect(getByTestId('welcome-screen')).toBeTruthy();
  });
});

describe('OnboardingWithProvider', () => {
  it('renders onboarding flow with provider', () => {
    const { getByTestId } = render(<OnboardingWithProvider />);
    expect(getByTestId('welcome-screen')).toBeTruthy();
  });
});