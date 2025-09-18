import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AgeSlider } from '../AgeSlider';

describe('AgeSlider', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renders with initial value', () => {
    const { getByText } = render(
      <AgeSlider value={25} onValueChange={mockOnValueChange} />
    );
    
    expect(getByText('25')).toBeTruthy();
    expect(getByText('25 years')).toBeTruthy();
    expect(getByText('Young Adult')).toBeTruthy();
  });

  it('increases value when plus button is pressed', () => {
    const { getByLabelText } = render(
      <AgeSlider value={25} onValueChange={mockOnValueChange} />
    );
    
    fireEvent.press(getByLabelText('Increase age'));
    expect(mockOnValueChange).toHaveBeenCalledWith(26);
  });

  it('decreases value when minus button is pressed', () => {
    const { getByLabelText } = render(
      <AgeSlider value={25} onValueChange={mockOnValueChange} />
    );
    
    fireEvent.press(getByLabelText('Decrease age'));
    expect(mockOnValueChange).toHaveBeenCalledWith(24);
  });

  it('does not go below minimum value', () => {
    const { getByLabelText } = render(
      <AgeSlider value={13} onValueChange={mockOnValueChange} minimumValue={13} />
    );
    
    fireEvent.press(getByLabelText('Decrease age'));
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });

  it('does not go above maximum value', () => {
    const { getByLabelText } = render(
      <AgeSlider value={120} onValueChange={mockOnValueChange} maximumValue={120} />
    );
    
    fireEvent.press(getByLabelText('Increase age'));
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });

  it('shows correct age categories', () => {
    const { getByText, rerender } = render(
      <AgeSlider value={16} onValueChange={mockOnValueChange} />
    );
    expect(getByText('Teen')).toBeTruthy();

    rerender(<AgeSlider value={22} onValueChange={mockOnValueChange} />);
    expect(getByText('Young Adult')).toBeTruthy();

    rerender(<AgeSlider value={30} onValueChange={mockOnValueChange} />);
    expect(getByText('Adult')).toBeTruthy();

    rerender(<AgeSlider value={45} onValueChange={mockOnValueChange} />);
    expect(getByText('Middle Age')).toBeTruthy();

    rerender(<AgeSlider value={60} onValueChange={mockOnValueChange} />);
    expect(getByText('Mature Adult')).toBeTruthy();

    rerender(<AgeSlider value={70} onValueChange={mockOnValueChange} />);
    expect(getByText('Senior')).toBeTruthy();
  });

  it('respects custom step value', () => {
    const { getByLabelText } = render(
      <AgeSlider value={25} onValueChange={mockOnValueChange} step={5} />
    );
    
    fireEvent.press(getByLabelText('Increase age'));
    expect(mockOnValueChange).toHaveBeenCalledWith(30);
  });

  it('disables buttons when disabled prop is true', () => {
    const { getByLabelText } = render(
      <AgeSlider value={25} onValueChange={mockOnValueChange} disabled />
    );
    
    fireEvent.press(getByLabelText('Increase age'));
    fireEvent.press(getByLabelText('Decrease age'));
    
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });

  it('shows custom range labels', () => {
    const { getByText } = render(
      <AgeSlider 
        value={25} 
        onValueChange={mockOnValueChange} 
        minimumValue={18}
        maximumValue={65}
      />
    );
    
    expect(getByText('Min: 18')).toBeTruthy();
    expect(getByText('Max: 65')).toBeTruthy();
  });
});