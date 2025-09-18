import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeightInput, WeightInput } from '../HeightWeightInput';

describe('HeightInput', () => {
  const mockOnValueChange = jest.fn();
  const mockOnUnitSystemChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with metric units', () => {
    const { getByText, getByDisplayValue } = render(
      <HeightInput
        value={170}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    expect(getByText('Height')).toBeTruthy();
    expect(getByText('cm')).toBeTruthy();
    expect(getByDisplayValue('170')).toBeTruthy();
  });

  it('renders with imperial units', () => {
    const { getByText, getByDisplayValue } = render(
      <HeightInput
        value={170} // ~5'7"
        onValueChange={mockOnValueChange}
        unitSystem="imperial"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    expect(getByText('ft/in')).toBeTruthy();
    expect(getByDisplayValue(`5'7"`)).toBeTruthy();
  });

  it('switches units when toggle is pressed', () => {
    const { getByLabelText } = render(
      <HeightInput
        value={170}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.press(getByLabelText('Switch to imperial units'));
    expect(mockOnUnitSystemChange).toHaveBeenCalledWith('imperial');
  });

  it('calls onValueChange when input changes in metric', () => {
    const { getByLabelText } = render(
      <HeightInput
        value={170}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.changeText(getByLabelText('Height input'), '175');
    expect(mockOnValueChange).toHaveBeenCalledWith(175);
  });

  it('does not call onValueChange for invalid metric input', () => {
    const { getByLabelText } = render(
      <HeightInput
        value={170}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.changeText(getByLabelText('Height input'), '50'); // Too short
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });
});

describe('WeightInput', () => {
  const mockOnValueChange = jest.fn();
  const mockOnUnitSystemChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with metric units', () => {
    const { getByText, getByDisplayValue } = render(
      <WeightInput
        value={70}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    expect(getByText('Weight')).toBeTruthy();
    expect(getByText('kg')).toBeTruthy();
    expect(getByDisplayValue('70.0')).toBeTruthy();
  });

  it('renders with imperial units', () => {
    const { getByText, getByDisplayValue } = render(
      <WeightInput
        value={70} // ~154 lbs
        onValueChange={mockOnValueChange}
        unitSystem="imperial"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    expect(getByText('lbs')).toBeTruthy();
    expect(getByDisplayValue('154')).toBeTruthy();
  });

  it('switches units when toggle is pressed', () => {
    const { getByLabelText } = render(
      <WeightInput
        value={70}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.press(getByLabelText('Switch to imperial units'));
    expect(mockOnUnitSystemChange).toHaveBeenCalledWith('imperial');
  });

  it('calls onValueChange when input changes in metric', () => {
    const { getByLabelText } = render(
      <WeightInput
        value={70}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.changeText(getByLabelText('Weight input'), '75.5');
    expect(mockOnValueChange).toHaveBeenCalledWith(75.5);
  });

  it('converts imperial to metric correctly', () => {
    const { getByLabelText } = render(
      <WeightInput
        value={70}
        onValueChange={mockOnValueChange}
        unitSystem="imperial"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.changeText(getByLabelText('Weight input'), '150'); // 150 lbs
    expect(mockOnValueChange).toHaveBeenCalledWith(expect.closeTo(68.04, 1));
  });

  it('does not call onValueChange for invalid weight', () => {
    const { getByLabelText } = render(
      <WeightInput
        value={70}
        onValueChange={mockOnValueChange}
        unitSystem="metric"
        onUnitSystemChange={mockOnUnitSystemChange}
      />
    );
    
    fireEvent.changeText(getByLabelText('Weight input'), '10'); // Too light
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });
});