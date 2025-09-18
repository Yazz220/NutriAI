import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { OptionCard } from '../OptionCard';

describe('OptionCard', () => {
  const mockOnPress = jest.fn();
  const TestIcon = () => <Text>Icon</Text>;

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with title and icon', () => {
    const { getByText } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('Test Option')).toBeTruthy();
    expect(getByText('Icon')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const { getByText } = render(
      <OptionCard
        title="Test Option"
        description="Test description"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('Test Option')).toBeTruthy();
    expect(getByText('Test description')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
      />
    );
    
    fireEvent.press(getByText('Test Option'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const { getByText } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
        disabled
      />
    );
    
    fireEvent.press(getByText('Test Option'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('shows radio button for single select (default)', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
      />
    );
    
    const radioButton = getByRole('radio');
    expect(radioButton).toBeTruthy();
    expect(radioButton.props.accessibilityState.selected).toBe(false);
  });

  it('shows checkbox for multi-select', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
        multiSelect
      />
    );
    
    const checkbox = getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it('shows selected state correctly for radio button', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={true}
        onPress={mockOnPress}
      />
    );
    
    const radioButton = getByRole('radio');
    expect(radioButton.props.accessibilityState.selected).toBe(true);
  });

  it('shows selected state correctly for checkbox', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={true}
        onPress={mockOnPress}
        multiSelect
      />
    );
    
    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
        accessibilityLabel="Custom Label"
        accessibilityHint="Custom Hint"
      />
    );
    
    const element = getByRole('radio');
    expect(element.props.accessibilityLabel).toBe('Custom Label');
    expect(element.props.accessibilityHint).toBe('Custom Hint');
  });

  it('sets accessibility state correctly when disabled', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
        disabled
      />
    );
    
    const element = getByRole('radio');
    expect(element.props.accessibilityState.disabled).toBe(true);
  });

  it('uses title and description for accessibility hint when not provided', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        description="Test description"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
      />
    );
    
    const element = getByRole('radio');
    expect(element.props.accessibilityHint).toBe('Test Option. Test description');
  });

  it('uses only title for accessibility hint when no description', () => {
    const { getByRole } = render(
      <OptionCard
        title="Test Option"
        icon={<TestIcon />}
        selected={false}
        onPress={mockOnPress}
      />
    );
    
    const element = getByRole('radio');
    expect(element.props.accessibilityHint).toBe('Test Option');
  });
});