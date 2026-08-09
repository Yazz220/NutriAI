import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AddPageComposer } from '@/components/cookbook/AddPageComposer';

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/components/cookbook/SelectedRecipeTemplateCard', () => ({
  SelectedRecipeTemplateCard: () => null,
}));

describe('AddPageComposer', () => {
  it('keeps the source visible and retries from the import error panel', () => {
    const onRetry = jest.fn();
    const screen = render(
      <AddPageComposer
        input="https://example.com/recipe"
        imageBase64={null}
        error="The recipe link could not be reached."
        selectedTemplateId="clean-cream"
        favoriteTemplateIds={[]}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onOpenTemplateLibrary={jest.fn()}
        onRetry={onRetry}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue('https://example.com/recipe')).toBeTruthy();
    expect(screen.getByText('Couldn’t read this recipe')).toBeTruthy();
    expect(screen.getByText('The recipe link could not be reached.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try importing recipe again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
