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

jest.mock('@/components/physical-book/SkiaBookCover', () => ({
  SkiaBookCover: () => null,
}));

describe('CreationStudio', () => {
  it('creates one canonical book with independent texture, color, and recipe-page style', async () => {
    const onCreateBook = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <CreationStudio canCreate onCreateBook={onCreateBook} onSignIn={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Healthy Meals'), 'Desserts');
    fireEvent.press(screen.getByRole('button', {
      name: 'Natural linen cover texture: A warmer, more open woven texture',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Midnight cover color' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Editorial recipe page style: Bold imagery and clean type',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Add this cookbook to my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith({
        title: 'Desserts',
        coverFinishId: 'natural-linen',
        coverColorId: 'midnight',
        pageStyleId: 'studio-editorial',
      });
    });
  });

  it('opens the two-page sample when a recipe-page style is selected', () => {
    const screen = render(
      <CreationStudio canCreate onCreateBook={jest.fn()} onSignIn={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Open cookbook preview' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: 'Heritage recipe page style: Classic ink and quiet ornament',
    }));

    expect(screen.getByRole('button', { name: 'Close cookbook preview' })).toBeTruthy();
    expect(screen.getByLabelText('Heritage brownie recipe sample')).toBeTruthy();
    expect(screen.getByLabelText('Heritage cookie recipe sample')).toBeTruthy();
    expect(screen.getByText('Fine cloth · Sage cover · Heritage recipe pages')).toBeTruthy();
  });

  it('starts the first cookbook with a usable name and the full identity controls', async () => {
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
    expect(screen.getByText('Cover texture')).toBeTruthy();
    expect(screen.getByText('Cover color')).toBeTruthy();
    expect(screen.getByText('Recipe page style')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clay cover color' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Heritage recipe page style: Classic ink and quiet ornament',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Put this cookbook on my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith({
        title: 'My Cookbook',
        coverFinishId: 'fine-cloth',
        coverColorId: 'clay',
        pageStyleId: 'heritage',
      });
    });
  });
});
