import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressIndicator } from '../ProgressIndicator';
import { OnboardingStep } from '@/types';

describe('ProgressIndicator', () => {
  const defaultProps = {
    currentStep: OnboardingStep.WELCOME,
    completedSteps: new Set<OnboardingStep>(),
    totalSteps: 7,
  };

  it('renders correctly with default props', () => {
    const { getByText } = render(<ProgressIndicator {...defaultProps} />);
    
    expect(getByText('Step 1 of 7')).toBeTruthy();
    expect(getByText('14% Complete')).toBeTruthy();
  });

  it('shows completed steps correctly', () => {
    const completedSteps = new Set([OnboardingStep.WELCOME, OnboardingStep.AUTH]);
    const { getByText } = render(
      <ProgressIndicator
        {...defaultProps}
        currentStep={OnboardingStep.DIETARY_PREFERENCES}
        completedSteps={completedSteps}
      />
    );
    
    expect(getByText('Step 3 of 7')).toBeTruthy();
    expect(getByText('43% Complete')).toBeTruthy();
  });

  it('renders in compact mode', () => {
    const { queryByText } = render(
      <ProgressIndicator {...defaultProps} compact={true} />
    );
    
    // Progress text should not be visible in compact mode
    expect(queryByText('Step 1 of 7')).toBeNull();
  });

  it('shows step labels when enabled', () => {
    const { getByText } = render(
      <ProgressIndicator {...defaultProps} showLabels={true} />
    );
    
    expect(getByText('Welcome')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Diet')).toBeTruthy();
  });

  it('handles different total steps', () => {
    const { getByText } = render(
      <ProgressIndicator {...defaultProps} totalSteps={5} />
    );
    
    expect(getByText('Step 1 of 5')).toBeTruthy();
    expect(getByText('20% Complete')).toBeTruthy();
  });
});