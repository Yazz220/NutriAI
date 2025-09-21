import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SketchyTextInput } from '../SketchyTextInput';

describe('SketchyTextInput', () => {
  it('renders basic input correctly', () => {
    const { getByDisplayValue } = render(
      <SketchyTextInput value="Test Value" />
    );
    
    expect(getByDisplayValue('Test Value')).toBeTruthy();
  });

  it('renders with label', () => {
    const { getByText } = render(
      <SketchyTextInput label="Test Label" />
    );
    
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('renders with helper text', () => {
    const { getByText } = render(
      <SketchyTextInput helper="Helper text" />
    );
    
    expect(getByText('Helper text')).toBeTruthy();
  });

  it('renders with error text', () => {
    const { getByText } = render(
      <SketchyTextInput error="Error message" />
    );
    
    expect(getByText('Error message')).toBeTruthy();
  });

  it('prioritizes error over helper text', () => {
    const { getByText, queryByText } = render(
      <SketchyTextInput 
        helper="Helper text" 
        error="Error message" 
      />
    );
    
    expect(getByText('Error message')).toBeTruthy();
    expect(queryByText('Helper text')).toBeFalsy();
  });

  it('handles focus and blur events', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    
    const { getByDisplayValue } = render(
      <SketchyTextInput 
        value="Test"
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
    
    const input = getByDisplayValue('Test');
    
    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    
    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('handles text change events', () => {
    const onChangeText = jest.fn();
    
    const { getByDisplayValue } = render(
      <SketchyTextInput 
        value="Initial"
        onChangeText={onChangeText}
      />
    );
    
    const input = getByDisplayValue('Initial');
    
    fireEvent.changeText(input, 'New Text');
    expect(onChangeText).toHaveBeenCalledWith('New Text');
  });

  it('renders different sizes correctly', () => {
    const { rerender, getByDisplayValue } = render(
      <SketchyTextInput value="Small" size="sm" />
    );
    expect(getByDisplayValue('Small')).toBeTruthy();

    rerender(<SketchyTextInput value="Medium" size="md" />);
    expect(getByDisplayValue('Medium')).toBeTruthy();

    rerender(<SketchyTextInput value="Large" size="lg" />);
    expect(getByDisplayValue('Large')).toBeTruthy();
  });

  it('handles placeholder text', () => {
    const { getByPlaceholderText } = render(
      <SketchyTextInput placeholder="Enter text here" />
    );
    
    expect(getByPlaceholderText('Enter text here')).toBeTruthy();
  });

  it('handles disabled state', () => {
    const { getByDisplayValue } = render(
      <SketchyTextInput value="Disabled" editable={false} />
    );
    
    expect(getByDisplayValue('Disabled')).toBeTruthy();
  });

  it('renders different variants', () => {
    const { rerender, getByDisplayValue } = render(
      <SketchyTextInput value="Outlined" variant="outlined" />
    );
    expect(getByDisplayValue('Outlined')).toBeTruthy();

    rerender(<SketchyTextInput value="Filled" variant="filled" />);
    expect(getByDisplayValue('Filled')).toBeTruthy();
  });
});