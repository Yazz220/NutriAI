import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TargetWeightInput } from '../TargetWeightInput';

describe('TargetWeightInput', () => {
  const mockOnValueChange = jest.fn();
  const defaultProps = {
    value: undefined,
    onValueChange: mockOnValueChange,
    currentWeight: 75, // kg
    height: 170, // cm
    unitSystem: 'metric' as const,
  };

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renders when health goal requires target weight', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
      />
    );
    
    expect(getByText('Target Weight')).toBeTruthy();
    expect(getByText('Goal: Lose Weight')).toBeTruthy();
  });

  it('does not render when health goal does not require target weight', () => {
    const { queryByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="maintain-weight"
      />
    );
    
    expect(queryByText('Target Weight')).toBeFalsy();
  });

  it('shows current weight information', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
      />
    );
    
    expect(getByText('Current: 75.0 kg')).toBeTruthy();
  });

  it('shows healthy weight range', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
      />
    );
    
    expect(getByText(/Healthy range:/)).toBeTruthy();
  });

  it('calls onValueChange when valid weight is entered', () => {
    const { getByLabelText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
      />
    );
    
    fireEvent.changeText(getByLabelText('Target weight input'), '70');
    expect(mockOnValueChange).toHaveBeenCalledWith(70);
  });

  it('shows validation error for unrealistic target', () => {
    const { getByLabelText, getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
      />
    );
    
    fireEvent.changeText(getByLabelText('Target weight input'), '40'); // Too low
    expect(getByText('Please enter a realistic weight')).toBeTruthy();
  });

  it('shows different goal text for weight gain', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="gain-weight"
      />
    );
    
    expect(getByText('Goal: Gain Weight')).toBeTruthy();
  });

  it('shows appropriate helper text for weight loss', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
      />
    );
    
    expect(getByText(/1-2 lbs\/week is recommended/)).toBeTruthy();
  });

  it('shows appropriate helper text for weight gain', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="gain-weight"
      />
    );
    
    expect(getByText(/0.5-1 lb\/week is recommended/)).toBeTruthy();
  });

  it('converts units correctly for imperial system', () => {
    const { getByText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
        unitSystem="imperial"
      />
    );
    
    expect(getByText('Current: 165 lbs')).toBeTruthy(); // 75 kg ≈ 165 lbs
  });

  it('handles disabled state', () => {
    const { getByLabelText } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
        disabled
      />
    );
    
    const input = getByLabelText('Target weight input');
    expect(input.props.editable).toBe(false);
  });

  it('clears value when health goal changes to not require target weight', () => {
    const { rerender } = render(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="lose-weight"
        value={70}
      />
    );
    
    rerender(
      <TargetWeightInput
        {...defaultProps}
        healthGoal="maintain-weight"
        value={70}
      />
    );
    
    expect(mockOnValueChange).toHaveBeenCalledWith(undefined);
  });
});