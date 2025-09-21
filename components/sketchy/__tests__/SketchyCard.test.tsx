import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SketchyCard } from '../SketchyCard';

describe('SketchyCard', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <SketchyCard>
        <Text>Card Content</Text>
      </SketchyCard>
    );
    
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders different elevation levels', () => {
    const { rerender, getByText } = render(
      <SketchyCard elevation="none">
        <Text>No Elevation</Text>
      </SketchyCard>
    );
    expect(getByText('No Elevation')).toBeTruthy();

    rerender(
      <SketchyCard elevation="low">
        <Text>Low Elevation</Text>
      </SketchyCard>
    );
    expect(getByText('Low Elevation')).toBeTruthy();

    rerender(
      <SketchyCard elevation="medium">
        <Text>Medium Elevation</Text>
      </SketchyCard>
    );
    expect(getByText('Medium Elevation')).toBeTruthy();

    rerender(
      <SketchyCard elevation="high">
        <Text>High Elevation</Text>
      </SketchyCard>
    );
    expect(getByText('High Elevation')).toBeTruthy();
  });

  it('handles interactive cards with onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SketchyCard interactive onPress={onPress}>
        <Text>Interactive Card</Text>
      </SketchyCard>
    );
    
    fireEvent.press(getByText('Interactive Card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('handles disabled state', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SketchyCard interactive onPress={onPress} disabled>
        <Text>Disabled Card</Text>
      </SketchyCard>
    );
    
    fireEvent.press(getByText('Disabled Card'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies different padding sizes', () => {
    const { rerender, getByText } = render(
      <SketchyCard padding="sm">
        <Text>Small Padding</Text>
      </SketchyCard>
    );
    expect(getByText('Small Padding')).toBeTruthy();

    rerender(
      <SketchyCard padding="lg">
        <Text>Large Padding</Text>
      </SketchyCard>
    );
    expect(getByText('Large Padding')).toBeTruthy();
  });

  it('handles press in and press out for interactive cards', () => {
    const { getByText } = render(
      <SketchyCard interactive>
        <Text>Press Test Card</Text>
      </SketchyCard>
    );
    
    const card = getByText('Press Test Card').parent?.parent?.parent;
    
    fireEvent(card, 'pressIn');
    fireEvent(card, 'pressOut');
    
    // Should not throw any errors
    expect(getByText('Press Test Card')).toBeTruthy();
  });

  it('renders as regular View when not interactive', () => {
    const { getByText } = render(
      <SketchyCard>
        <Text>Regular Card</Text>
      </SketchyCard>
    );
    
    expect(getByText('Regular Card')).toBeTruthy();
  });

  it('handles onPress without interactive prop', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SketchyCard onPress={onPress}>
        <Text>Press Card</Text>
      </SketchyCard>
    );
    
    fireEvent.press(getByText('Press Card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});