import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MultiSelectChips } from '../MultiSelectChips';
import { ChipOption } from '@/types';

describe('MultiSelectChips', () => {
  const mockOptions: ChipOption[] = [
    { id: '1', label: 'Option 1', value: 'option1', icon: '🍎' },
    { id: '2', label: 'Option 2', value: 'option2', icon: '🍌' },
    { id: '3', label: 'Option 3', value: 'option3', icon: '🍊' },
  ];

  const defaultProps = {
    options: mockOptions,
    selectedValues: [],
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all options', () => {
    const { getByText } = render(<MultiSelectChips {...defaultProps} />);
    
    expect(getByText('Option 1')).toBeTruthy();
    expect(getByText('Option 2')).toBeTruthy();
    expect(getByText('Option 3')).toBeTruthy();
  });

  it('handles option selection', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <MultiSelectChips {...defaultProps} onSelectionChange={onSelectionChange} />
    );
    
    fireEvent.press(getByText('Option 1'));
    expect(onSelectionChange).toHaveBeenCalledWith(['option1']);
  });

  it('handles option deselection', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <MultiSelectChips
        {...defaultProps}
        selectedValues={['option1']}
        onSelectionChange={onSelectionChange}
      />
    );
    
    fireEvent.press(getByText('Option 1'));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('respects max selections limit', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <MultiSelectChips
        {...defaultProps}
        selectedValues={['option1', 'option2']}
        maxSelections={2}
        onSelectionChange={onSelectionChange}
      />
    );
    
    // Try to select a third option
    fireEvent.press(getByText('Option 3'));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('shows selection summary', () => {
    const { getByText } = render(
      <MultiSelectChips
        {...defaultProps}
        selectedValues={['option1', 'option2']}
        maxSelections={3}
      />
    );
    
    expect(getByText('2 selected of 3')).toBeTruthy();
  });

  it('handles clear all functionality', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <MultiSelectChips
        {...defaultProps}
        selectedValues={['option1', 'option2']}
        onSelectionChange={onSelectionChange}
      />
    );
    
    fireEvent.press(getByText('Clear All'));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('filters options when searchable', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <MultiSelectChips {...defaultProps} searchable={true} />
    );
    
    const searchInput = getByPlaceholderText('Search options...');
    fireEvent.changeText(searchInput, 'Option 1');
    
    expect(getByText('Option 1')).toBeTruthy();
    expect(queryByText('Option 2')).toBeNull();
    expect(queryByText('Option 3')).toBeNull();
  });

  it('shows no results message when search yields no results', () => {
    const { getByPlaceholderText, getByText } = render(
      <MultiSelectChips {...defaultProps} searchable={true} />
    );
    
    const searchInput = getByPlaceholderText('Search options...');
    fireEvent.changeText(searchInput, 'nonexistent');
    
    expect(getByText('No options found for "nonexistent"')).toBeTruthy();
  });
});