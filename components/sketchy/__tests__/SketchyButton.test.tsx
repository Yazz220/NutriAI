import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SketchyButton } from '../SketchyButton';
import { Text } from 'react-native';

describe('SketchyButton', () => {
  it('renders with title', () => {
    const { getByText } = render(
      <SketchyButton title="Test Button" />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('handles press events', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SketchyButton title="Press Me" onPress={onPress} />
    );
    
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders different variants correctly', () => {
    const { rerender, getByText } = render(
      <SketchyButton title="Primary" variant="primary" />
    );
    expect(getByText('Primary')).toBeTruthy();

    rerender(<SketchyButton title="Secondary" variant="secondary" />);
    expect(getByText('Secondary')).toBeTruthy();

    rerender(<SketchyButton title="Ghost" variant="ghost" />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('renders different sizes correctly', () => {
    const { rerender, getByText } = render(
      <SketchyButton title="Small" size="sm" />
    );
    expect(getByText('Small')).toBeTruthy();

    rerender(<SketchyButton title="Medium" size="md" />);
    expect(getByText('Medium')).toBeTruthy();

    rerender(<SketchyButton title="Large" size="lg" />);
    expect(getByText('Large')).toBeTruthy();
  });

  it('shows loading state', () => {
    const { getByTestId, queryByText } = render(
      <SketchyButton title="Loading" loading={true} testID="loading-button" />
    );
    
    // Should show activity indicator and hide text when loading
    expect(queryByText('Loading')).toBeFalsy();
  });

  it('handles disabled state', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SketchyButton title="Disabled" disabled={true} onPress={onPress} />
    );
    
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders with icon', () => {
    const TestIcon = () => <Text testID="test-icon">Icon</Text>;
    const { getByTestId, getByText } = render(
      <SketchyButton title="With Icon" icon={<TestIcon />} />
    );
    
    expect(getByTestId('test-icon')).toBeTruthy();
    expect(getByText('With Icon')).toBeTruthy();
  });

  it('renders full width when specified', () => {
    const { getByText } = render(
      <SketchyButton title="Full Width" fullWidth={true} />
    );
    
    expect(getByText('Full Width')).toBeTruthy();
  });

  it('handles press in and press out events', () => {
    const { getByText } = render(
      <SketchyButton title="Press Test" />
    );
    
    const button = getByText('Press Test').parent?.parent;
    
    fireEvent(button, 'pressIn');
    fireEvent(button, 'pressOut');
    
    // Should not throw any errors
    expect(getByText('Press Test')).toBeTruthy();
  });
});