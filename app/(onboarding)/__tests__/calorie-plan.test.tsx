import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CaloriePlanScreen from '../calorie-plan';
import { OnboardingProfileIntegration } from '@/utils/onboardingProfileIntegration';

const mockUpdateOnboardingData = jest.fn();
const mockNextStep = jest.fn();
const mockPreviousStep = jest.fn();

jest.mock('@/components/onboarding', () => {
  const { View, Text } = require('react-native');
  return {
    OnboardingScreenWrapper: ({ children }: any) => <View>{children}</View>,
    OnboardingButton: ({ title, onPress }: any) => (
      <Text onPress={onPress} accessibilityRole="button">{title}</Text>
    ),
    BehindTheQuestion: () => <View testID="behind-question" />, 
    useOnboarding: () => ({
      onboardingData: {
        healthGoal: 'lose-weight' as const,
        basicProfile: {
          age: 30,
          height: 170,
          weight: 72,
          activityLevel: 'moderately-active',
          gender: 'female',
        },
        goalPreferences: {
          goalType: 'lose' as const,
          recommendedCalories: undefined,
          recommendedMacros: undefined,
          useCustomCalories: false,
          customCalorieTarget: undefined,
          customMacroTargets: undefined,
        },
      },
      updateOnboardingData: mockUpdateOnboardingData,
      nextStep: mockNextStep,
      previousStep: mockPreviousStep,
    }),
  };
});

describe('CaloriePlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays recommended calorie information', () => {
    jest.spyOn(OnboardingProfileIntegration, 'calculateDailyCalories').mockReturnValue(2000);
    jest.spyOn(OnboardingProfileIntegration, 'calculateMacroTargets').mockReturnValue({ protein: 150, carbs: 225, fats: 60 });

    const { getByText } = render(<CaloriePlanScreen />);

    expect(getByText('Personalize your daily calories')).toBeTruthy();
    expect(getByText('2,000 kcal')).toBeTruthy();
    expect(getByText('150 g')).toBeTruthy();
  });

  it('allows switching to a custom calorie target', () => {
    jest.spyOn(OnboardingProfileIntegration, 'calculateDailyCalories').mockReturnValue(2000);
    jest.spyOn(OnboardingProfileIntegration, 'calculateMacroTargets').mockReturnValue({ protein: 150, carbs: 225, fats: 60 });

    const { getByRole, getByText, getByPlaceholderText } = render(<CaloriePlanScreen />);

    fireEvent(getByRole('switch'), 'valueChange', true);
    fireEvent.changeText(getByPlaceholderText('e.g. 2100'), '2300');
    fireEvent.press(getByText('Continue'));

    expect(mockUpdateOnboardingData).toHaveBeenCalledWith('goalPreferences', expect.objectContaining({
      goalType: 'lose',
      useCustomCalories: true,
      customCalorieTarget: 2300,
    }));
    expect(mockNextStep).toHaveBeenCalled();
  });

  it('shows an error when continuing without recommended data', () => {
    jest.spyOn(OnboardingProfileIntegration, 'calculateDailyCalories').mockReturnValueOnce(0);
    jest.spyOn(OnboardingProfileIntegration, 'calculateMacroTargets').mockReturnValue({ protein: 0, carbs: 0, fats: 0 });

    const { getByText } = render(<CaloriePlanScreen />);
    fireEvent.press(getByText('Continue'));
    expect(getByText('Complete your basic profile so we can calculate a target.')).toBeTruthy();
    expect(mockNextStep).not.toHaveBeenCalled();
  });
});

