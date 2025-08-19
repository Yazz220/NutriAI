import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WelcomeScreen } from '../WelcomeScreen';
import { OnboardingProvider } from '../../OnboardingProvider';

// Mock the navigation hooks
jest.mock('@/hooks/useOnboardingNavigation', () => ({
  useOnboardingNavigation: () => ({
    navigateNext: jest.fn(),
    exitOnboarding: jest.fn(),
  }),
}));

jest.mock('@/hooks/useOnboardingAnalytics', () => ({
  useOnboardingAnalytics: () => ({
    trackWelcomeShown: jest.fn(),
    trackUserChoice: jest.fn(),
  }),
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => children,
}));

const WelcomeScreenWithProvider = () => (
  <OnboardingProvider>
    <WelcomeScreen />
  </OnboardingProvider>
);

describe('WelcomeScreen', () => {
  it('renders welcome content correctly', () => {
    const { getByText } = render(<WelcomeScreenWithProvider />);
    
    expect(getByText('Welcome to NutriAI')).toBeTruthy();
    expect(getByText('Your AI-powered kitchen companion')).toBeTruthy();
    expect(getByText('Reduce food waste & save money')).toBeTruthy();
    expect(getByText('Plan meals from what you have')).toBeTruthy();
    expect(getByText('Discover recipes you\'ll love')).toBeTruthy();
  });

  it('shows benefit descriptions', () => {
    const { getByText } = render(<WelcomeScreenWithProvider />);
    
    expect(getByText('Smart suggestions based on what you already have')).toBeTruthy();
    expect(getByText('Get recipes that match your current inventory')).toBeTruthy();
    expect(getByText('Personalized recommendations based on your preferences')).toBeTruthy();
  });

  it('renders Get Started button', () => {
    const { getByText } = render(<WelcomeScreenWithProvider />);
    
    const getStartedButton = getByText('Get Started');
    expect(getStartedButton).toBeTruthy();
  });

  it('renders skip option', () => {
    const { getByText } = render(<WelcomeScreenWithProvider />);
    
    expect(getByText('Skip for now')).toBeTruthy();
    expect(getByText('You can set this up later')).toBeTruthy();
  });

  it('shows feature preview items', () => {
    const { getByText } = render(<WelcomeScreenWithProvider />);
    
    expect(getByText('AI Recipe Suggestions')).toBeTruthy();
    expect(getByText('Smart Inventory Tracking')).toBeTruthy();
    expect(getByText('Personalized Meal Planning')).toBeTruthy();
  });

  it('handles Get Started button press', async () => {
    const { getByTestId } = render(<WelcomeScreenWithProvider />);
    
    const getStartedButton = getByTestId('welcome-get-started-button');
    fireEvent.press(getStartedButton);
    
    // Test passes if no errors are thrown
    await waitFor(() => {
      expect(getStartedButton).toBeTruthy();
    });
  });

  it('handles skip button press', async () => {
    const { getByText } = render(<WelcomeScreenWithProvider />);
    
    const skipButton = getByText('Skip for now');
    fireEvent.press(skipButton);
    
    // Test passes if no errors are thrown
    await waitFor(() => {
      expect(skipButton).toBeTruthy();
    });
  });

  it('has proper accessibility labels', () => {
    const { getByLabelText } = render(<WelcomeScreenWithProvider />);
    
    expect(getByLabelText('Get started with onboarding')).toBeTruthy();
    expect(getByLabelText('Skip onboarding')).toBeTruthy();
  });
});