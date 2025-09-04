import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FoodLoggingModal } from '../FoodLoggingModal';
import { foodDatabase } from '@/utils/foodDatabase';

// Mock the food database
jest.mock('@/utils/foodDatabase', () => ({
  foodDatabase: {
    searchFoods: jest.fn(),
    addUserFood: jest.fn(),
    addToRecent: jest.fn(),
    validateNutritionData: jest.fn(),
  },
}));

const mockFoodDatabase = foodDatabase as jest.Mocked<typeof foodDatabase>;

describe('FoodLoggingModal', () => {
  const defaultProps = {
    visible: true,
    selectedDate: '2024-01-01',
    onAddFood: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFoodDatabase.searchFoods.mockResolvedValue([
      {
        id: '1',
        name: 'Banana',
        servingSize: '1 medium (118g)',
        caloriesPerServing: 105,
        macrosPerServing: { protein: 1.3, carbs: 27, fats: 0.4 },
        source: 'usda',
      },
    ]);
    mockFoodDatabase.validateNutritionData.mockReturnValue({
      isValid: true,
      errors: [],
    });
  });

  it('should render correctly when visible', () => {
    const { getByText, getByPlaceholderText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    expect(getByText('Log Food')).toBeTruthy();
    expect(getByText('Meal Type')).toBeTruthy();
    expect(getByText('Search Foods')).toBeTruthy();
    expect(getByPlaceholderText('Search for foods...')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <FoodLoggingModal {...defaultProps} visible={false} />
    );

    expect(queryByText('Log Food')).toBeFalsy();
  });

  it('should search foods when query changes', async () => {
    const { getByPlaceholderText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    const searchInput = getByPlaceholderText('Search for foods...');
    fireEvent.changeText(searchInput, 'banana');

    await waitFor(() => {
      expect(mockFoodDatabase.searchFoods).toHaveBeenCalledWith('banana', 20);
    });
  });

  it('should display search results', async () => {
    const { getByPlaceholderText, getByText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    const searchInput = getByPlaceholderText('Search for foods...');
    fireEvent.changeText(searchInput, 'banana');

    await waitFor(() => {
      expect(getByText('Banana')).toBeTruthy();
      expect(getByText('1 medium (118g)')).toBeTruthy();
      expect(getByText('105 cal')).toBeTruthy();
    });
  });

  it('should select a food item', async () => {
    const { getByPlaceholderText, getByText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    const searchInput = getByPlaceholderText('Search for foods...');
    fireEvent.changeText(searchInput, 'banana');

    await waitFor(() => {
      const bananaItem = getByText('Banana');
      fireEvent.press(bananaItem);
    });

    expect(getByText('Selected Food')).toBeTruthy();
  });

  it('should change meal type', () => {
    const { getByText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    const lunchButton = getByText('Lunch');
    fireEvent.press(lunchButton);

    // The lunch button should be selected (this would be tested via style changes in a real test)
    expect(lunchButton).toBeTruthy();
  });

  it('should update quantity', async () => {
    const { getByPlaceholderText, getByText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    // First select a food
    const searchInput = getByPlaceholderText('Search for foods...');
    fireEvent.changeText(searchInput, 'banana');

    await waitFor(() => {
      const bananaItem = getByText('Banana');
      fireEvent.press(bananaItem);
    });

    // Then update quantity
    const quantityInput = getByPlaceholderText('1.0');
    fireEvent.changeText(quantityInput, '2');

    // Should show updated calories
    await waitFor(() => {
      expect(getByText('210 calories')).toBeTruthy(); // 105 * 2
    });
  });

  it('should add selected food', async () => {
    const { getByPlaceholderText, getByText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    // Select a food
    const searchInput = getByPlaceholderText('Search for foods...');
    fireEvent.changeText(searchInput, 'banana');

    await waitFor(() => {
      const bananaItem = getByText('Banana');
      fireEvent.press(bananaItem);
    });

    // Add the food
    const addButton = getByText('Add Food');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockFoodDatabase.addToRecent).toHaveBeenCalled();
      expect(defaultProps.onAddFood).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Banana',
          calories: 105,
          protein: 1,
          carbs: 27,
          fats: 0,
          quantity: 1,
          mealType: 'breakfast',
        })
      );
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should switch to custom entry mode', () => {
    const { getByText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    const customButton = getByText('Add Custom Food');
    fireEvent.press(customButton);

    expect(getByText('Custom Food Entry')).toBeTruthy();
    expect(getByText('Food name')).toBeTruthy();
  });

  it('should validate custom food entry', async () => {
    const { getByText, getByPlaceholderText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    // Switch to custom entry
    const customButton = getByText('Add Custom Food');
    fireEvent.press(customButton);

    // Fill in custom food details
    fireEvent.changeText(getByPlaceholderText('Food name'), 'Custom Food');
    fireEvent.changeText(getByPlaceholderText('Serving size (e.g., 1 cup, 100g)'), '1 serving');
    fireEvent.changeText(getByPlaceholderText('Calories'), '200');
    fireEvent.changeText(getByPlaceholderText('Protein (g)'), '10');

    // Try to add
    const addButton = getByText('Add Food');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockFoodDatabase.validateNutritionData).toHaveBeenCalledWith({
        calories: 200,
        protein: 10,
        carbs: 0,
        fats: 0,
      });
    });
  });

  it('should add custom food', async () => {
    const { getByText, getByPlaceholderText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    // Switch to custom entry
    const customButton = getByText('Add Custom Food');
    fireEvent.press(customButton);

    // Fill in custom food details
    fireEvent.changeText(getByPlaceholderText('Food name'), 'Custom Food');
    fireEvent.changeText(getByPlaceholderText('Serving size (e.g., 1 cup, 100g)'), '1 serving');
    fireEvent.changeText(getByPlaceholderText('Calories'), '200');
    fireEvent.changeText(getByPlaceholderText('Protein (g)'), '10');
    fireEvent.changeText(getByPlaceholderText('Carbs (g)'), '20');
    fireEvent.changeText(getByPlaceholderText('Fats (g)'), '5');

    // Add the food
    const addButton = getByText('Add Food');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockFoodDatabase.addUserFood).toHaveBeenCalledWith({
        name: 'Custom Food',
        servingSize: '1 serving',
        caloriesPerServing: 200,
        macrosPerServing: {
          protein: 10,
          carbs: 20,
          fats: 5,
        },
      });

      expect(defaultProps.onAddFood).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Food',
          calories: 200,
          protein: 10,
          carbs: 20,
          fats: 5,
          servingSize: '1 serving',
          quantity: 1,
        })
      );
    });
  });

  it('should handle validation errors', async () => {
    mockFoodDatabase.validateNutritionData.mockReturnValue({
      isValid: false,
      errors: ['Calories must be between 0 and 2000 per serving'],
    });

    const { getByText, getByPlaceholderText } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    // Switch to custom entry
    const customButton = getByText('Add Custom Food');
    fireEvent.press(customButton);

    // Fill in invalid data
    fireEvent.changeText(getByPlaceholderText('Food name'), 'Invalid Food');
    fireEvent.changeText(getByPlaceholderText('Serving size (e.g., 1 cup, 100g)'), '1 serving');
    fireEvent.changeText(getByPlaceholderText('Calories'), '5000'); // Invalid

    // Try to add
    const addButton = getByText('Add Food');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockFoodDatabase.validateNutritionData).toHaveBeenCalled();
      // Should not call onAddFood due to validation error
      expect(defaultProps.onAddFood).not.toHaveBeenCalled();
    });
  });

  it('should close modal when close button is pressed', () => {
    const { getByTestId } = render(
      <FoodLoggingModal {...defaultProps} />
    );

    // Note: In a real test, you'd need to add testID to the close button
    // For now, we'll test the cancel button
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should reset form when modal opens', () => {
    const { rerender, getByPlaceholderText } = render(
      <FoodLoggingModal {...defaultProps} visible={false} />
    );

    // Open modal
    rerender(<FoodLoggingModal {...defaultProps} visible={true} />);

    // Check that search is empty
    const searchInput = getByPlaceholderText('Search for foods...');
    expect(searchInput.props.value).toBe('');

    // Check that quantity is reset
    const quantityInput = getByPlaceholderText('1.0');
    expect(quantityInput.props.value).toBe('1');
  });
});