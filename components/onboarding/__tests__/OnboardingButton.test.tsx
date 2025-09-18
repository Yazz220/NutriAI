import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OnboardingButton } from '../OnboardingButton';

describe('OnboardingButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with title', () => {
    const { getByText } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const { getByText } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} disabled />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const { getByText } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} loading />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} loading />
    );
    
    // Should show loading indicator and hide text
    expect(queryByText('Test Button')).toBeFalsy();
  });

  it('applies correct styles for primary variant', () => {
    const { getByRole } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} variant="primary" />
    );
    
    const button = getByRole('button');
    expect(button).toBeTruthy();
  });

  it('applies correct styles for secondary variant', () => {
    const { getByRole } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} variant="secondary" />
    );
    
    const button = getByRole('button');
    expect(button).toBeTruthy();
  });

  it('applies correct styles for ghost variant', () => {
    const { getByRole } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} variant="ghost" />
    );
    
    const button = getByRole('button');
    expect(button).toBeTruthy();
  });

  it('renders with icon when provided', () => {
    const TestIcon = () => <></>;
    const { getByText } = render(
      <OnboardingButton 
        title="Test Button" 
        onPress={mockOnPress} 
        icon={<TestIcon />}
      />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = render(
      <OnboardingButton 
        title="Test Button" 
        onPress={mockOnPress}
        accessibilityLabel="Custom Label"
        accessibilityHint="Custom Hint"
      />
    );
    
    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Custom Label');
    expect(button.props.accessibilityHint).toBe('Custom Hint');
  });

  it('sets accessibility state correctly when disabled', () => {
    const { getByRole } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} disabled />
    );
    
    const button = getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('sets accessibility state correctly when loading', () => {
    const { getByRole } = render(
      <OnboardingButton title="Test Button" onPress={mockOnPress} loading />
    );
    
    const button = getByRole('button');
    expect(button.props.accessibilityState.busy).toBe(true);
  });
});