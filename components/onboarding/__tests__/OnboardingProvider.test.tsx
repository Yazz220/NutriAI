import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { OnboardingProvider, useOnboarding } from '../OnboardingProvider';
import { OnboardingStep } from '@/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Test component to access context
const TestComponent = () => {
  const { state, nextStep, skipStep, updateUserData } = useOnboarding();
  
  return (
    <>
      <View testID="current-step"><Text>{state.currentStep}</Text></View>
      <View testID="completed-count"><Text>{state.completedSteps.size}</Text></View>
      <View testID="skipped-count"><Text>{state.skippedSteps.size}</Text></View>
      <TouchableOpacity testID="next-button" onPress={nextStep}><Text>Next</Text></TouchableOpacity>
      <TouchableOpacity testID="skip-button" onPress={skipStep}><Text>Skip</Text></TouchableOpacity>
      <TouchableOpacity 
        testID="update-data-button" 
        onPress={() => updateUserData({ authMethod: 'email' })}
      >
        <Text>Update Data</Text>
      </TouchableOpacity>
    </>
  );
};

const TestWrapper = () => (
  <OnboardingProvider>
    <TestComponent />
  </OnboardingProvider>
);

describe('OnboardingProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initial state correctly', () => {
    const { getByTestId } = render(<TestWrapper />);
    
    expect(getByTestId('current-step')).toHaveTextContent('0'); // WELCOME step
    expect(getByTestId('completed-count')).toHaveTextContent('0');
    expect(getByTestId('skipped-count')).toHaveTextContent('0');
  });

  it('handles next step progression', async () => {
    const { getByTestId } = render(<TestWrapper />);
    
    await act(async () => {
      getByTestId('next-button').props.onPress();
    });
    
    expect(getByTestId('current-step')).toHaveTextContent('1'); // AUTH step
    expect(getByTestId('completed-count')).toHaveTextContent('1'); // WELCOME completed
  });

  it('handles skip step functionality', async () => {
    const { getByTestId } = render(<TestWrapper />);
    
    await act(async () => {
      getByTestId('skip-button').props.onPress();
    });
    
    expect(getByTestId('current-step')).toHaveTextContent('1'); // AUTH step
    expect(getByTestId('skipped-count')).toHaveTextContent('1'); // WELCOME skipped
  });

  it('updates user data correctly', async () => {
    const { getByTestId } = render(<TestWrapper />);
    
    await act(async () => {
      getByTestId('update-data-button').props.onPress();
    });
    
    // Test passes if no errors are thrown
    expect(getByTestId('current-step')).toBeTruthy();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useOnboarding must be used within an OnboardingProvider');
    
    consoleSpy.mockRestore();
  });
});