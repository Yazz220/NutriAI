import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import WelcomeScreen from '../welcome';
import { TouchableOpacity, Text } from 'react-native';

// Mock the onboarding context
const mockUpdateOnboardingData = jest.fn();
const mockNextStep = jest.fn();

jest.mock('@/components/onboarding', () => ({
  OnboardingScreenWrapper: ({ children }: any) => children,
  OnboardingButton: ({ title, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  ),
  useOnboarding: () => ({
    updateOnboardingData: mockUpdateOnboardingData,
    nextStep: mockNextStep,
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome content correctly', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    expect(getByText('Nosh')).toBeTruthy();
    expect(getByText('Your friendly nutrition companion')).toBeTruthy();
    expect(getByText('Track meals effortlessly with AI')).toBeTruthy();
    expect(getByText('Manage your pantry inventory')).toBeTruthy();
    expect(getByText('Get personalized meal suggestions')).toBeTruthy();
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('shows benefit descriptions', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    expect(getByText('Smart food recognition and logging')).toBeTruthy();
    expect(getByText('Never run out of ingredients again')).toBeTruthy();
    expect(getByText('Recipes tailored to your goals and preferences')).toBeTruthy();
  });

  it('navigates to health goals when Get Started is pressed', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    fireEvent.press(getByText('Get Started'));
    
    expect(mockNextStep).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/health-goals');
  });

  it('has proper accessibility labels', () => {
    const { getByLabelText } = render(<WelcomeScreen />);
    
    const getStartedButton = getByLabelText('Start onboarding process');
    expect(getStartedButton).toBeTruthy();
  });
});