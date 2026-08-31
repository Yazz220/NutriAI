import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RecipeCorrectionSheet } from '@/components/nosh/capture/RecipeCorrectionSheet';
import type { RecipeGraphDraft } from '@/types/recipeGraph';

function graph(): RecipeGraphDraft {
  return {
    title: 'Sheet Pan Chicken',
    servings: 4,
    yieldText: 'Serves 4',
    category: 'dinner',
    ingredientGroups: [{
      id: 'default',
      ingredients: [
        { name: 'chicken thighs', quantity: '4' },
        { name: 'potatoes', quantity: '500', unit: 'g' },
      ],
    }],
    stepGroups: [{
      id: 'default',
      steps: [{ id: 'step-1', text: 'Bake for 30 minutes.' }],
    }],
    tags: [],
    provenance: {
      sourceType: 'text',
      confidence: 0.8,
      qualityAssessment: {
        version: 1,
        decision: 'needs_correction',
        issues: [{
          key: 'missing_baking_temperature:stepGroups.0.steps.0.text',
          code: 'missing_baking_temperature',
          severity: 'blocking',
          message: 'The method uses an oven but does not include an oven temperature.',
          fieldPaths: ['stepGroups.0.steps.0.text'],
          confirmed: false,
        }],
        metrics: {
          ingredientCount: 2,
          quantifiedIngredientCount: 2,
          stepCount: 1,
          hasYield: true,
          hasCookingTemperature: false,
          hasCookingDuration: true,
        },
      },
    },
  };
}

describe('RecipeCorrectionSheet', () => {
  it('shows the exact issue and submits corrected recipe data', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <RecipeCorrectionSheet
        visible
        recipeGraph={graph()}
        saving={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(await screen.findByText('The method uses an oven but does not include an oven temperature.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Direction 1'), 'Bake at 200°C for 30 minutes.');
    fireEvent.press(screen.getByRole('button', { name: 'Save corrected recipe' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sheet Pan Chicken',
      stepGroups: [expect.objectContaining({
        steps: [expect.objectContaining({ text: 'Bake at 200°C for 30 minutes.' })],
      })],
    })));
  });

  it('validates numeric fields before submitting', async () => {
    const onSubmit = jest.fn();
    const screen = render(
      <RecipeCorrectionSheet
        visible
        recipeGraph={graph()}
        saving={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.changeText(await screen.findByLabelText('Cook min'), '-4');
    fireEvent.press(screen.getByRole('button', { name: 'Save corrected recipe' }));

    expect(await screen.findByText('Cook time must be a whole number between 0 and 10080.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
