import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecipeDetail } from '../recipe-detail/RecipeDetail';
import type { CanonicalRecipe } from '@/types';

const baseRecipe: CanonicalRecipe = {
  id: 'r1',
  title: 'Test Recipe',
  ingredients: [{ name: 'Water' }],
  steps: ['Boil water'],
};

describe('RecipeDetail component', () => {
  test('renders header without image and shows title', () => {
    const { getByText } = render(
      <RecipeDetail
        onClose={() => {}}
        recipe={{ ...baseRecipe, image: undefined }}
        mode="discover"
      />
    );
    expect(getByText('Test Recipe')).toBeTruthy();
  });

  test('discover mode shows Save/Plan/Ask/Share', () => {
    const { getByText } = render(
      <RecipeDetail onClose={() => {}} recipe={baseRecipe} mode="discover" />
    );
    expect(getByText(/save/i)).toBeTruthy();
    expect(getByText(/plan/i)).toBeTruthy();
    expect(getByText(/ask/i)).toBeTruthy();
    expect(getByText(/share/i)).toBeTruthy();
  });

  test('library mode shows Cook/Plan/Ask/Share and triggers callbacks', () => {
    const onCook = jest.fn();
    const onPlan = jest.fn();
    const onAskAI = jest.fn();
    const onShare = jest.fn();

    const { getByText } = render(
      <RecipeDetail
        onClose={() => {}}
        recipe={baseRecipe}
        mode="library"
        onCook={onCook}
        onPlan={onPlan}
        onAskAI={onAskAI}
        onShare={onShare}
      />
    );

    fireEvent.press(getByText(/cook/i));
    fireEvent.press(getByText(/plan/i));
    fireEvent.press(getByText(/ask/i));
    fireEvent.press(getByText(/share/i));

    expect(onCook).toHaveBeenCalled();
    expect(onPlan).toHaveBeenCalled();
    expect(onAskAI).toHaveBeenCalled();
    expect(onShare).toHaveBeenCalled();
  });

  test('ai mode shows Save and Share only', () => {
    const { getByText, queryByText } = render(
      <RecipeDetail onClose={() => {}} recipe={baseRecipe} mode="ai" />
    );
    expect(getByText(/save/i)).toBeTruthy();
    expect(getByText(/share/i)).toBeTruthy();
    expect(queryByText(/cook/i)).toBeNull();
    expect(queryByText(/plan/i)).toBeNull();
    expect(queryByText(/ask/i)).toBeNull();
  });
});
