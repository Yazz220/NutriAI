import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HealthGoalsScreen from '../health-goals';

const mockUpdateOnboardingData = jest.fn();
const mockNextStep = jest.fn();
const mockPreviousStep = jest.fn();
const mockValidateCurrentStep = jest.fn();

jest.mock('@/components/onboarding', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    OnboardingScreenWrapper: ({ children }: any) => <View>{children}</View>,
    OnboardingButton: ({ title, onPress }: any) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    SimpleOptionCard: ({ title, onPress, selected }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityState={{ selected }}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    BehindTheQuestion: () => <View testID="behind-question" />, 
    useOnboarding: () => ({
      updateOnboardingData: mockUpdateOnboardingData,
      nextStep: mockNextStep,
      previousStep: mockPreviousStep,
      validateCurrentStep: mockValidateCurrentStep,
      onboardingData: {
        healthGoal: null,
        customGoal: null,
        goalPreferences: {
          goalType: null,
          recommendedCalories: undefined,
          recommendedMacros: undefined,
          useCustomCalories: false,
        },
      },
    }),
  };
});

describe('HealthGoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCurrentStep.mockReturnValue({ canProceed: true, missingFields: [] });
  });

  it('renders goal options and title', () => {
    const { getByText } = render(<HealthGoalsScreen />);

    expect(getByText('What goal do you have in mind?')).toBeTruthy();
    expect(getByText('Lose weight')).toBeTruthy();
    expect(getByText('Maintain weight')).toBeTruthy();
    expect(getByText('Gain weight')).toBeTruthy();
    expect(getByText('Build muscle')).toBeTruthy();
    expect(getByText('Improve health')).toBeTruthy();
    expect(getByText('Manage dietary restrictions')).toBeTruthy();
    expect(getByText('Create a custom goal')).toBeTruthy();
  });

  it('updates onboarding data when a preset goal is selected', () => {
    const { getByText } = render(<HealthGoalsScreen />);

    fireEvent.press(getByText('Lose weight'));

    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('healthGoal', 'lose-weight');
    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('customGoal', null);
    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('goalPreferences', { goalType: 'lose' });
  });

  it('prevents continue without selection', () => {
    mockValidateCurrentStep.mockReturnValue({ canProceed: false, missingFields: ['Health goal selection'] });
    const { getByText } = render(<HealthGoalsScreen />);

    fireEvent.press(getByText('Continue'));

    expect(getByText('Please select a health goal to continue')).toBeTruthy();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('allows continuing after selecting a goal', () => {
    const { getByText } = render(<HealthGoalsScreen />);

    fireEvent.press(getByText('Gain weight'));
    fireEvent.press(getByText('Continue'));

    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it('calls previous step when back is pressed', () => {
    const { getByText } = render(<HealthGoalsScreen />);
    fireEvent.press(getByText('Back'));
    expect(mockPreviousStep).toHaveBeenCalledTimes(1);
  });

  it('saves a custom goal through the modal', () => {
    const { getByText, getByPlaceholderText } = render(<HealthGoalsScreen />);

    fireEvent.press(getByText('Create a custom goal'));

    fireEvent.changeText(getByPlaceholderText('E.g. Prepare for a 10K race'), 'Finish a marathon');
    fireEvent.changeText(getByPlaceholderText('Why does this matter to you?'), 'Build endurance');

    fireEvent.press(getByText('Save'));

    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('healthGoal', 'custom');
    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('customGoal', {
      title: 'Finish a marathon',
      goalType: 'maintain',
      motivation: 'Build endurance',
    });
    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('goalPreferences', { goalType: 'maintain' });
  });
});

