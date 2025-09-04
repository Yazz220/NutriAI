import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServingSizeChanger } from '../ServingSizeChanger';

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

describe('ServingSizeChanger', () => {
  const defaultProps = {
    originalServings: 4,
    currentServings: 4,
    onServingsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with default props', () => {
    const { getByText } = render(<ServingSizeChanger {...defaultProps} />);
    
    expect(getByText('Servings')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('servings')).toBeTruthy();
  });

  it('should show calorie preview when provided', () => {
    const { getByText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        caloriesPerServing={250}
        showNutritionPreview={true}
      />
    );
    
    expect(getByText('1000 cal')).toBeTruthy(); // 250 * 4 servings
  });

  it('should call onServingsChange when increment button is pressed', () => {
    const onServingsChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        onServingsChange={onServingsChange}
      />
    );
    
    const incrementButton = getByLabelText('Increase servings');
    fireEvent.press(incrementButton);
    
    expect(onServingsChange).toHaveBeenCalledWith(4.5); // Default step is 0.5
  });

  it('should call onServingsChange when decrement button is pressed', () => {
    const onServingsChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        onServingsChange={onServingsChange}
      />
    );
    
    const decrementButton = getByLabelText('Decrease servings');
    fireEvent.press(decrementButton);
    
    expect(onServingsChange).toHaveBeenCalledWith(3.5);
  });

  it('should disable decrement button when at minimum', () => {
    const { getByLabelText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        currentServings={0.5}
        minServings={0.5}
      />
    );
    
    const decrementButton = getByLabelText('Decrease servings');
    expect(decrementButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should disable increment button when at maximum', () => {
    const { getByLabelText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        currentServings={20}
        maxServings={20}
      />
    );
    
    const incrementButton = getByLabelText('Increase servings');
    expect(incrementButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should show scale indicator when servings differ from original', () => {
    const { getByText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        currentServings={8}
      />
    );
    
    expect(getByText('Scaled from 4 original servings')).toBeTruthy();
    expect(getByText('2.0x larger than original')).toBeTruthy();
  });

  it('should show preset buttons for common serving sizes', () => {
    const { getByText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        currentServings={3}
      />
    );
    
    // Should show preset buttons for 1, 2, 4, 6 (excluding current 3)
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });

  it('should handle fractional servings correctly', () => {
    const { getByText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        currentServings={2.5}
        allowFractions={true}
      />
    );
    
    expect(getByText('2.5')).toBeTruthy();
  });

  it('should handle whole number servings when fractions disabled', () => {
    const onServingsChange = jest.fn();
    const { getByLabelText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        onServingsChange={onServingsChange}
        allowFractions={false}
      />
    );
    
    const incrementButton = getByLabelText('Increase servings');
    fireEvent.press(incrementButton);
    
    expect(onServingsChange).toHaveBeenCalledWith(5); // Step should be 1, not 0.5
  });

  it('should call preset button correctly', () => {
    const onServingsChange = jest.fn();
    const { getByText } = render(
      <ServingSizeChanger 
        {...defaultProps} 
        currentServings={3}
        onServingsChange={onServingsChange}
      />
    );
    
    const presetButton = getByText('6');
    fireEvent.press(presetButton);
    
    expect(onServingsChange).toHaveBeenCalledWith(6);
  });
});