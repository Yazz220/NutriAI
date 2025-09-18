import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityLevelSelector } from '../ActivityLevelSelector';
import { TouchableOpacity, Text } from 'react-native';

// Mock OptionCard component
jest.mock('../OptionCard', () => ({
  OptionCard: ({ title, onPress, selected }: any) => (
    <TouchableOpacity onPress={onPress} accessibilityState={{ selected }}>
      <Text>{title}</Text>
    </TouchableOpacity>
  ),
}));

describe('ActivityLevelSelector', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renders all activity levels', () => {
    const { getByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    expect(getByText('Sedentary')).toBeTruthy();
    expect(getByText('Lightly Active')).toBeTruthy();
    expect(getByText('Moderately Active')).toBeTruthy();
    expect(getByText('Very Active')).toBeTruthy();
    expect(getByText('Extremely Active')).toBeTruthy();
  });

  it('shows activity level descriptions', () => {
    const { getByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    expect(getByText('Little or no exercise')).toBeTruthy();
    expect(getByText('Light exercise 1-3 days/week')).toBeTruthy();
    expect(getByText('Moderate exercise 3-5 days/week')).toBeTruthy();
  });

  it('shows examples for each activity level', () => {
    const { getByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    expect(getByText('Desk job, minimal physical activity')).toBeTruthy();
    expect(getByText('Walking, light yoga, occasional gym')).toBeTruthy();
    expect(getByText('Regular gym, sports, active lifestyle')).toBeTruthy();
  });

  it('shows calorie multipliers', () => {
    const { getByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    expect(getByText('1.2x')).toBeTruthy();
    expect(getByText('1.375x')).toBeTruthy();
    expect(getByText('1.55x')).toBeTruthy();
    expect(getByText('1.725x')).toBeTruthy();
    expect(getByText('1.9x')).toBeTruthy();
  });

  it('calls onValueChange when activity level is selected', () => {
    const { getByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    fireEvent.press(getByText('Moderately Active'));
    expect(mockOnValueChange).toHaveBeenCalledWith('moderately-active');
  });

  it('shows selected activity level info', () => {
    const { getByText } = render(
      <ActivityLevelSelector 
        value="moderately-active" 
        onValueChange={mockOnValueChange} 
      />
    );
    
    expect(getByText('Selected: Moderately Active')).toBeTruthy();
    expect(getByText('This will be used to calculate your daily calorie needs')).toBeTruthy();
  });

  it('does not show selected info when no level is selected', () => {
    const { queryByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    expect(queryByText('Selected:')).toBeFalsy();
  });

  it('handles disabled state', () => {
    const { getByText } = render(
      <ActivityLevelSelector 
        value={null} 
        onValueChange={mockOnValueChange} 
        disabled 
      />
    );
    
    // Should still render but OptionCard will handle disabled state
    expect(getByText('Sedentary')).toBeTruthy();
  });

  it('shows header with title and subtitle', () => {
    const { getByText } = render(
      <ActivityLevelSelector value={null} onValueChange={mockOnValueChange} />
    );
    
    expect(getByText('Activity Level')).toBeTruthy();
    expect(getByText('How active are you on a typical day?')).toBeTruthy();
  });
});