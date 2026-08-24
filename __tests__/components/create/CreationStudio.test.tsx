import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CreationStudio } from '@/components/create/CreationStudio';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/components/physical-book/PhysicalBook', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return {
    PhysicalBook: ({ title, coverStyle }: { title: string; coverStyle: string }) => (
      ReactModule.createElement(Text, {
        accessibilityLabel: `Book preview: ${title}, ${coverStyle}`,
      })
    ),
  };
});

describe('CreationStudio', () => {
  it('creates one book with independently selected cover and recipe-page styles', async () => {
    const onCreateBook = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <CreationStudio canCreate onCreateBook={onCreateBook} onSignIn={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Healthy Meals'), 'Desserts');
    fireEvent.press(screen.getByRole('button', { name: 'Midnight Leather cover' }));
    fireEvent.press(screen.getByText('Editorial'));
    fireEvent.press(screen.getByRole('button', { name: 'Add this cookbook to my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith(
        'Desserts',
        'navy-leather',
        'studio-editorial',
      );
    });
  });

  it('switches to the inside preview when a recipe-page style is selected', () => {
    const screen = render(
      <CreationStudio canCreate onCreateBook={jest.fn()} onSignIn={jest.fn()} />,
    );

    fireEvent.press(screen.getByText('Heritage'));

    expect(screen.getByRole('button', { name: 'Close cookbook preview' })).toBeTruthy();
    expect(screen.getByLabelText('Heritage brownie recipe sample')).toBeTruthy();
    expect(screen.getByLabelText('Heritage cookie recipe sample')).toBeTruthy();
  });

  it('keeps first-book setup short while preserving detailed customization', async () => {
    const onCreateBook = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <CreationStudio
        mode="first-run"
        canCreate
        onCreateBook={onCreateBook}
        onSignIn={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue('My Cookbook')).toBeTruthy();
    expect(screen.queryByText('Cover finish')).toBeNull();

    fireEvent.press(screen.getByLabelText('Editorial: Clay book cloth with bold culinary pages'));
    fireEvent.press(screen.getByRole('button', { name: 'Put this cookbook on my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith(
        'My Cookbook',
        'terracotta-cloth',
        'studio-editorial',
      );
    });

    fireEvent.press(screen.getByText('Customize details'));
    expect(screen.getByText('Cover finish')).toBeTruthy();
    expect(screen.getByText('Recipe pages')).toBeTruthy();
  });
});
