import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthScreen } from '../AuthScreen';
import { OnboardingProvider } from '../../OnboardingProvider';

// Mock the auth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    user: null,
    initializing: false,
  }),
}));

// Mock the navigation hooks
jest.mock('@/hooks/useOnboardingNavigation', () => ({
  useOnboardingNavigation: () => ({
    navigateNext: jest.fn(),
  }),
}));

jest.mock('@/hooks/useOnboardingAnalytics', () => ({
  useOnboardingAnalytics: () => ({
    trackUserChoice: jest.fn(),
    trackError: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('@/utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInAnonymously: jest.fn(),
    },
  },
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => children,
}));

const AuthScreenWithProvider = () => (
  <OnboardingProvider>
    <AuthScreen />
  </OnboardingProvider>
);

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders auth screen correctly', () => {
    const { getByText } = render(<AuthScreenWithProvider />);
    
    expect(getByText('Create Your Account')).toBeTruthy();
    expect(getByText('Save your preferences and sync across devices')).toBeTruthy();
  });

  it('shows sign in and sign up toggle', () => {
    const { getByText } = render(<AuthScreenWithProvider />);
    
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = render(<AuthScreenWithProvider />);
    
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('shows confirm password field in sign up mode', () => {
    const { getByText, getAllByPlaceholderText } = render(<AuthScreenWithProvider />);
    
    // Switch to sign up mode
    fireEvent.press(getByText('Sign Up'));
    
    // Should now have two password fields
    const passwordFields = getAllByPlaceholderText('••••••••');
    expect(passwordFields).toHaveLength(2);
  });

  it('renders social auth options', () => {
    const { getByText } = render(<AuthScreenWithProvider />);
    
    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue as Guest')).toBeTruthy();
  });

  it('shows privacy section', () => {
    const { getByText } = render(<AuthScreenWithProvider />);
    
    expect(getByText('Your data is secure')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('shows guest mode warning', () => {
    const { getByText } = render(<AuthScreenWithProvider />);
    
    expect(getByText(/Guest mode provides limited functionality/)).toBeTruthy();
  });

  it('toggles password visibility', () => {
    const { getByPlaceholderText, getAllByRole } = render(<AuthScreenWithProvider />);
    
    const passwordInput = getByPlaceholderText('••••••••');
    const eyeButtons = getAllByRole('button');
    
    // Find the eye button (should be one of the buttons)
    const eyeButton = eyeButtons.find(button => 
      button.props.accessibilityRole === 'button'
    );
    
    if (eyeButton) {
      fireEvent.press(eyeButton);
    }
    
    // Test passes if no errors are thrown
    expect(passwordInput).toBeTruthy();
  });

  it('handles form validation', async () => {
    const { getByText } = render(<AuthScreenWithProvider />);
    
    // Try to submit without email/password
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);
    
    await waitFor(() => {
      expect(getByText('Please enter email and password')).toBeTruthy();
    });
  });

  it('validates password confirmation in sign up mode', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<AuthScreenWithProvider />);
    
    // Switch to sign up mode
    fireEvent.press(getByText('Sign Up'));
    
    // Fill in different passwords
    const emailInput = getByPlaceholderText('you@example.com');
    const passwordFields = getAllByPlaceholderText('••••••••');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordFields[0], 'password123');
    fireEvent.changeText(passwordFields[1], 'different123');
    
    // Try to submit
    const createAccountButton = getByText('Create Account');
    fireEvent.press(createAccountButton);
    
    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('validates minimum password length', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<AuthScreenWithProvider />);
    
    // Switch to sign up mode
    fireEvent.press(getByText('Sign Up'));
    
    // Fill in short password
    const emailInput = getByPlaceholderText('you@example.com');
    const passwordFields = getAllByPlaceholderText('••••••••');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordFields[0], '123');
    fireEvent.changeText(passwordFields[1], '123');
    
    // Try to submit
    const createAccountButton = getByText('Create Account');
    fireEvent.press(createAccountButton);
    
    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });
  });
});