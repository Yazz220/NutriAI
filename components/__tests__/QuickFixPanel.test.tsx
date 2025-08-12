/**
 * Tests for QuickFixPanel component
 * Validates quick-fix review panel functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuickFixPanel, QuickFixAction } from '../QuickFixPanel';

// Mock the icons
jest.mock('lucide-react-native', () => ({
  CheckCircle: 'CheckCircle',
  AlertTriangle: 'AlertTriangle',
  AlertCircle: 'AlertCircle',
  Plus: 'Plus',
  Edit3: 'Edit3',
  Trash2: 'Trash2',
  Zap: 'Zap',
  Clock: 'Clock',
  Users: 'Users',
  ChefHat: 'ChefHat'
}));

describe('QuickFixPanel', () => {
  const mockOnApplyFix = jest.fn();
  const mockOnApplyAllFixes = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleActions: QuickFixAction[] = [
    {
      id: 'add_ingredient_1',
      type: 'add_ingredient',
      title: 'Add missing ingredient: salt',
      description: 'This ingredient is mentioned in instructions but missing from the ingredients list.',
      severity: 'high',
      autoFix: true,
      data: {
        name: 'salt',
        quantity: 1,
        unit: 'tsp',
        optional: false,
        confidence: 0.8,
        inferred: true
      }
    },
    {
      id: 'fix_quantity_1',
      type: 'fix_quantity',
      title: 'Verify quantity: flour',
      description: 'The quantity "2 cups" has low confidence and may be incorrect.',
      severity: 'medium',
      autoFix: false,
      data: {
        ingredientIndex: 0,
        ingredientName: 'flour',
        currentQuantity: 2,
        currentUnit: 'cups',
        newQuantity: 2,
        newUnit: 'cups'
      }
    },
    {
      id: 'add_time_1',
      type: 'add_time',
      title: 'Add cooking times',
      description: 'Prep time and cook time are missing. Adding these helps with meal planning.',
      severity: 'low',
      autoFix: false,
      data: {
        prepTime: undefined,
        cookTime: undefined
      }
    }
  ];

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={false}
      />
    );

    expect(queryByText('Quick Fixes')).toBeNull();
  });

  it('renders nothing when no actions provided', () => {
    const { queryByText } = render(
      <QuickFixPanel
        actions={[]}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    expect(queryByText('Quick Fixes')).toBeNull();
  });

  it('renders quick fixes panel with actions', () => {
    const { getByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    expect(getByText('Quick Fixes (3)')).toBeTruthy();
    expect(getByText('Add missing ingredient: salt')).toBeTruthy();
    expect(getByText('Verify quantity: flour')).toBeTruthy();
    expect(getByText('Add cooking times')).toBeTruthy();
  });

  it('groups actions by priority', () => {
    const { getByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    expect(getByText('High Priority')).toBeTruthy();
    expect(getByText('Medium Priority')).toBeTruthy();
    expect(getByText('Low Priority')).toBeTruthy();
  });

  it('shows Fix All button when auto-fixable actions exist', () => {
    const { getByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    expect(getByText('Fix All (1)')).toBeTruthy();
  });

  it('applies auto-fix when Fix button is pressed', () => {
    const { getByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    const fixButton = getByText('Fix');
    fireEvent.press(fixButton);

    expect(mockOnApplyFix).toHaveBeenCalledWith('add_ingredient_1', sampleActions[0].data);
  });

  it('applies all auto-fixes when Fix All button is pressed', () => {
    const { getByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    const fixAllButton = getByText('Fix All (1)');
    fireEvent.press(fixAllButton);

    expect(mockOnApplyAllFixes).toHaveBeenCalled();
  });

  it('dismisses action when dismiss button is pressed', () => {
    const { getAllByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    const dismissButtons = getAllByText('×');
    fireEvent.press(dismissButtons[0]);

    expect(mockOnDismiss).toHaveBeenCalledWith('add_ingredient_1');
  });

  it('expands manual fix form when edit button is pressed', () => {
    const { getByText, queryByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    // Initially form should not be visible
    expect(queryByText('Quantity')).toBeNull();

    // Press on the action to expand it (non-auto-fix actions)
    const actionTitle = getByText('Verify quantity: flour');
    fireEvent.press(actionTitle);

    // Form should now be visible
    expect(getByText('Fix quantity for "flour"')).toBeTruthy();
    expect(getByText('Quantity')).toBeTruthy();
    expect(getByText('Unit')).toBeTruthy();
  });

  describe('Add Ingredient Form', () => {
    const addIngredientAction: QuickFixAction = {
      id: 'add_ingredient_manual',
      type: 'add_ingredient',
      title: 'Add ingredient manually',
      description: 'Manual ingredient addition',
      severity: 'medium',
      autoFix: false,
      data: {
        name: '',
        quantity: undefined,
        unit: ''
      }
    };

    it('renders add ingredient form when expanded', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuickFixPanel
          actions={[addIngredientAction]}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Add ingredient manually'));

      expect(getByText('Ingredient Name')).toBeTruthy();
      expect(getByPlaceholderText('Enter ingredient name')).toBeTruthy();
      expect(getByPlaceholderText('1')).toBeTruthy();
      expect(getByPlaceholderText('cup')).toBeTruthy();
    });

    it('updates form values when typing', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuickFixPanel
          actions={[addIngredientAction]}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Add ingredient manually'));

      const nameInput = getByPlaceholderText('Enter ingredient name');
      const quantityInput = getByPlaceholderText('1');
      const unitInput = getByPlaceholderText('cup');

      fireEvent.changeText(nameInput, 'sugar');
      fireEvent.changeText(quantityInput, '2');
      fireEvent.changeText(unitInput, 'cups');

      // Values should be updated (we can't directly test state, but the component should handle it)
      expect(nameInput.props.value).toBe('sugar');
      expect(quantityInput.props.value).toBe('2');
      expect(unitInput.props.value).toBe('cups');
    });

    it('applies manual fix with form data', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuickFixPanel
          actions={[addIngredientAction]}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Add ingredient manually'));

      // Fill form
      const nameInput = getByPlaceholderText('Enter ingredient name');
      const quantityInput = getByPlaceholderText('1');
      const unitInput = getByPlaceholderText('cup');

      fireEvent.changeText(nameInput, 'sugar');
      fireEvent.changeText(quantityInput, '2');
      fireEvent.changeText(unitInput, 'cups');

      // Apply the fix
      const applyButton = getByText('Add Ingredient');
      fireEvent.press(applyButton);

      expect(mockOnApplyFix).toHaveBeenCalledWith('add_ingredient_manual', expect.objectContaining({
        name: 'sugar',
        quantity: 2,
        unit: 'cups'
      }));
    });

    it('cancels form when cancel button is pressed', () => {
      const { getByText, queryByText } = render(
        <QuickFixPanel
          actions={[addIngredientAction]}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Add ingredient manually'));
      expect(getByText('Ingredient Name')).toBeTruthy();

      // Cancel the form
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      // Form should be hidden
      expect(queryByText('Ingredient Name')).toBeNull();
    });
  });

  describe('Fix Quantity Form', () => {
    it('renders fix quantity form with current values', () => {
      const { getByText, getByDisplayValue } = render(
        <QuickFixPanel
          actions={sampleActions}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Verify quantity: flour'));

      expect(getByText('Fix quantity for "flour"')).toBeTruthy();
      expect(getByDisplayValue('2')).toBeTruthy();
      expect(getByDisplayValue('cups')).toBeTruthy();
    });
  });

  describe('Add Time Form', () => {
    it('renders add time form', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuickFixPanel
          actions={sampleActions}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Add cooking times'));

      expect(getByText('Add Missing Time Information')).toBeTruthy();
      expect(getByText('Prep Time (min)')).toBeTruthy();
      expect(getByText('Cook Time (min)')).toBeTruthy();
      expect(getByPlaceholderText('15')).toBeTruthy();
      expect(getByPlaceholderText('30')).toBeTruthy();
    });
  });

  describe('Fix Servings Form', () => {
    const servingsAction: QuickFixAction = {
      id: 'fix_servings_1',
      type: 'fix_servings',
      title: 'Add serving size',
      description: 'Number of servings is missing.',
      severity: 'low',
      autoFix: false,
      data: {
        servings: undefined
      }
    };

    it('renders fix servings form', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuickFixPanel
          actions={[servingsAction]}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Add serving size'));

      expect(getByText('Set Number of Servings')).toBeTruthy();
      expect(getByPlaceholderText('4')).toBeTruthy();
    });
  });

  describe('Fix Instruction Form', () => {
    const instructionAction: QuickFixAction = {
      id: 'fix_instruction_1',
      type: 'fix_instruction',
      title: 'Expand step 1',
      description: 'This instruction is very short.',
      severity: 'low',
      autoFix: false,
      data: {
        stepNumber: 1,
        stepIndex: 0,
        currentText: 'Mix',
        newText: 'Mix'
      }
    };

    it('renders fix instruction form', () => {
      const { getByText, getByDisplayValue } = render(
        <QuickFixPanel
          actions={[instructionAction]}
          onApplyFix={mockOnApplyFix}
          onApplyAllFixes={mockOnApplyAllFixes}
          onDismiss={mockOnDismiss}
          visible={true}
        />
      );

      // Expand the form
      fireEvent.press(getByText('Expand step 1'));

      expect(getByText('Edit Step 1')).toBeTruthy();
      expect(getByDisplayValue('Mix')).toBeTruthy();
    });
  });

  it('handles multiple expanded forms correctly', () => {
    const { getByText, queryByText } = render(
      <QuickFixPanel
        actions={sampleActions}
        onApplyFix={mockOnApplyFix}
        onApplyAllFixes={mockOnApplyAllFixes}
        onDismiss={mockOnDismiss}
        visible={true}
      />
    );

    // Expand first form
    fireEvent.press(getByText('Verify quantity: flour'));
    expect(getByText('Fix quantity for "flour"')).toBeTruthy();

    // Expand second form
    fireEvent.press(getByText('Add cooking times'));
    expect(getByText('Add Missing Time Information')).toBeTruthy();

    // Both forms should be visible
    expect(getByText('Fix quantity for "flour"')).toBeTruthy();
    expect(getByText('Add Missing Time Information')).toBeTruthy();

    // Collapse first form
    fireEvent.press(getByText('Verify quantity: flour'));
    expect(queryByText('Fix quantity for "flour"')).toBeNull();
    expect(getByText('Add Missing Time Information')).toBeTruthy();
  });
});