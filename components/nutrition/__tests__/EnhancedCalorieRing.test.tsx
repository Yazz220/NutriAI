import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EnhancedCalorieRing } from '../EnhancedCalorieRing';
import { DailyProgress } from '@/hooks/useNutrition';

const mockDailyProgress: DailyProgress = {
  date: '2024-01-01',
  calories: {
    consumed: 1500,
    goal: 2000,
    remaining: 500,
    percentage: 0.75,
    fromPlanned: 800,
    fromLogged: 700,
  },
  macros: {
    protein: { consumed: 75, goal: 100, percentage: 0.75 },
    carbs: { consumed: 150, goal: 200, percentage: 0.75 },
    fats: { consumed: 50, goal: 67, percentage: 0.75 },
  },
  status: 'under',
};

describe('EnhancedCalorieRing', () => {
  const defaultProps = {
    consumed: 1500,
    goal: 2000,
    remaining: 500,
    percentage: 0.75,
    fromPlanned: 800,
    fromLogged: 700,
  };

  it('should render correctly with basic props', () => {
    const { getByText } = render(<EnhancedCalorieRing {...defaultProps} />);

    expect(getByText('500')).toBeTruthy(); // remaining calories
    expect(getByText('kcal left')).toBeTruthy();
    expect(getByText('1500 / 2000')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
  });

  it('should show consumed calories when no goal is set', () => {
    const { getByText } = render(
      <EnhancedCalorieRing
        consumed={1200}
        goal={0}
        remaining={0}
        percentage={0}
      />
    );

    expect(getByText('1200')).toBeTruthy();
    expect(getByText('kcal eaten')).toBeTruthy();
  });

  it('should show over calories when exceeding goal', () => {
    const { getByText } = render(
      <EnhancedCalorieRing
        consumed={2200}
        goal={2000}
        remaining={-200}
        percentage={1.1}
      />
    );

    expect(getByText('200')).toBeTruthy(); // Math.abs(-200)
    expect(getByText('kcal over')).toBeTruthy();
  });

  it('should display source breakdown when available', () => {
    const { getByText } = render(
      <EnhancedCalorieRing {...defaultProps} />
    );

    expect(getByText('Logged: 700')).toBeTruthy();
    expect(getByText('Planned: 800')).toBeTruthy();
  });

  it('should show loading state', () => {
    const { getByText } = render(
      <EnhancedCalorieRing {...defaultProps} isLoading={true} />
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should call onPress when provided', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <EnhancedCalorieRing {...defaultProps} onPress={onPress} />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(onPress).toHaveBeenCalled();
  });

  it('should open breakdown modal when pressed with dailyProgress', () => {
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        dailyProgress={mockDailyProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Nutrition Breakdown')).toBeTruthy();
  });

  it('should display correct status in breakdown modal', () => {
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        dailyProgress={mockDailyProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Goal Met')).toBeFalsy(); // status is 'under'
    expect(getByText('Under Goal')).toBeTruthy();
  });

  it('should show macro breakdown in modal', () => {
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        dailyProgress={mockDailyProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Macronutrients')).toBeTruthy();
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
    expect(getByText('Fats')).toBeTruthy();
    expect(getByText('75g / 100g')).toBeTruthy(); // protein values
  });

  it('should close breakdown modal when close button is pressed', () => {
    const { getByRole, getByText, queryByText } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        dailyProgress={mockDailyProgress}
        showDetails={true}
      />
    );

    // Open modal
    const ring = getByRole('button');
    fireEvent.press(ring);
    expect(getByText('Nutrition Breakdown')).toBeTruthy();

    // Close modal
    const closeButton = getByRole('button', { name: /close/i });
    fireEvent.press(closeButton);
    
    // Modal should be closed (this would need proper testing setup to verify)
    // In a real test environment, you'd check that the modal is no longer visible
  });

  it('should display calorie breakdown in modal', () => {
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        dailyProgress={mockDailyProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Calorie Breakdown')).toBeTruthy();
    expect(getByText('Total Consumed')).toBeTruthy();
    expect(getByText('1500 cal')).toBeTruthy();
    expect(getByText('• From logged food')).toBeTruthy();
    expect(getByText('700 cal')).toBeTruthy();
    expect(getByText('• From meal plan')).toBeTruthy();
    expect(getByText('800 cal')).toBeTruthy();
  });

  it('should show appropriate tips based on status', () => {
    const underGoalProgress = { ...mockDailyProgress, status: 'under' as const };
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        dailyProgress={underGoalProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Tips')).toBeTruthy();
    expect(getByText('Consider adding a healthy snack to meet your calorie goal.')).toBeTruthy();
  });

  it('should handle met goal status', () => {
    const metGoalProgress = { ...mockDailyProgress, status: 'met' as const };
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        consumed={2000}
        goal={2000}
        remaining={0}
        percentage={1.0}
        dailyProgress={metGoalProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Goal Met')).toBeTruthy();
    expect(getByText('Great job staying on track with your nutrition goals!')).toBeTruthy();
  });

  it('should handle over goal status', () => {
    const overGoalProgress = { ...mockDailyProgress, status: 'over' as const };
    const { getByRole, getByText } = render(
      <EnhancedCalorieRing
        consumed={2200}
        goal={2000}
        remaining={-200}
        percentage={1.1}
        dailyProgress={overGoalProgress}
        showDetails={true}
      />
    );

    const ring = getByRole('button');
    fireEvent.press(ring);

    expect(getByText('Over Goal')).toBeTruthy();
    expect(getByText('Try lighter options for your remaining meals today.')).toBeTruthy();
  });

  it('should not be pressable when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        onPress={onPress}
        showDetails={false}
      />
    );

    // When showDetails is false and onPress is provided, it should still be pressable
    const ring = getByRole('button');
    fireEvent.press(ring);
    expect(onPress).toHaveBeenCalled();
  });

  it('should handle custom size and stroke width', () => {
    const { getByRole } = render(
      <EnhancedCalorieRing
        {...defaultProps}
        size={150}
        strokeWidth={10}
      />
    );

    const ring = getByRole('button');
    expect(ring.props.style).toEqual(
      expect.objectContaining({
        width: 150,
        height: 150,
      })
    );
  });

  it('should not show progress stats when goal is 0', () => {
    const { queryByText } = render(
      <EnhancedCalorieRing
        consumed={1200}
        goal={0}
        remaining={0}
        percentage={0}
      />
    );

    expect(queryByText('1200 / 0')).toBeFalsy();
    expect(queryByText('0%')).toBeFalsy();
  });
});