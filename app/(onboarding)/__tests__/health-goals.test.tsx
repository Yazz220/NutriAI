import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import HealthGoalsScreen from '../health-goals';
import { TouchableOpacity, Text } from 'react-native';

// Mock the onboarding context
const mockUpdateOnboardingData = jest.fn();
const mockNextStep = jest.fn();
const mockValidateCurrentStep = jest.fn();

jest.mock('@/components/onboarding', () => ({
  OnboardingScreenWrapper: ({ children }: any) => children,
  OnboardingButton: ({ title, onPress, disabled }: any) => (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </TouchableOpacity>
  ),
  OptionCard: ({ title, onPress, selected }: any) => (
    <TouchableOpacity onPress={onPress} accessibilityState={{ selected }}>
      <Text>{title}</Text>
    </TouchableOpacity>
  ),
  useOnboarding: () => ({
    updateOnboardingData: mockUpdateOnboardingData,
    nextStep: mockNextStep,
    validateCurrentStep: mockValidateCurrentStep,
    onboardingData: { healthGoal: null },
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

describe('HealthGoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCurrentStep.mockReturnValue({ canProceed: true, missingFields: [] });
  });

  it('renders health goals correctly', () => {
    const { getByText } = render(<HealthGoalsScreen />);
    
    expect(getByText('What\'s your primary goal?')).toBeTruthy();
    expect(getByText('Lose Weight')).toBeTruthy();
    expect(getByText('Gain Weight')).toBeTruthy();
    expect(getByText('Maintain Weight')).toBeTruthy();
    expect(getByText('Build Muscle')).toBeTruthy();
    expect(getByText('Improve Health')).toBeTruthy();
    expect(getByText('Manage Dietary Restrictions')).toBeTruthy();
  });

  it('updates onboarding data when goal is selected', () => {
    const { getByText } = render(<HealthGoalsScreen />);
    
    fireEvent.press(getByText('Lose Weight'));
    
    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('healthGoal', 'lose-weight');
  });

  it('shows error when trying to continue without selection', () => {
    mockValidateCurrentStep.mockReturnValue({ 
      canProceed: false, 
      missingFields: ['Health goal selection'] 
    });
    
    const { getByText } = render(<HealthGoalsScreen />);
    
    fireEvent.press(getByText('Continue'));
    
    expect(getByText('Health goal selection')).toBeTruthy();
  });

  it('navigates to basic profile when continue is pressed with valid selection', () => {
    const { getByText } = render(<HealthGoalsScreen />);
    
    // Select a goal first
    fireEvent.press(getByText('Lose Weight'));
    
    // Then continue
    fireEvent.press(getByText('Continue'));
    
    expect(mockNextStep).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/basic-profile');
  });

  it('navigates back when back button is pressed', () => {
    const { getByText } = render(<HealthGoalsScreen />);
    
    fireEvent.press(getByText('Back'));
    
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('disables continue button when no goal is selected', () => {
    const { getByText } = render(<HealthGoalsScreen />);
    
    const continueButton = getByText('Continue');
    expect(continueButton.props.disabled).toBe(true);
  });
});