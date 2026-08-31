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

    expect(screen.getByTestId('cover-finish-rail').props.horizontal).toBe(true);
    expect(screen.getByTestId('cover-color-rail').props.horizontal).toBe(true);
    expect(screen.getByTestId('title-color-rail').props.horizontal).toBe(true);
    expect(screen.getByTestId('title-position-rail').props.horizontal).toBe(true);
    expect(screen.getByTestId('page-style-rail').props.horizontal).toBe(true);

    fireEvent.changeText(screen.getByPlaceholderText('Sunday Suppers'), 'Desserts');
    fireEvent.press(screen.getByRole('button', {
      name: 'Natural linen cover texture: A warmer, more open woven texture',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Midnight cover color' }));
    fireEvent.press(screen.getByRole('button', { name: 'Plum title color' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lower title position' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Editorial recipe page style: Bold imagery and clean type',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Add this cookbook to my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith({
        title: 'Desserts',
        coverFinishId: 'natural-linen',
        coverColorId: 'midnight',
        coverTitleColorId: 'plum',
        coverTitlePlacementId: 'lower',
        pageStyleId: 'studio-editorial',
      });
    });
  });

  it('opens the selected sample directly from the book without nested preview tabs', () => {
    const screen = render(
      <CreationStudio canCreate onCreateBook={jest.fn()} onSignIn={jest.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Cover' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pages' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open cookbook preview' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Open cookbook preview' }));

    expect(screen.getByRole('button', { name: 'Close cookbook preview' })).toBeTruthy();
    expect(screen.getByLabelText('Illustrated brownie recipe sample')).toBeTruthy();
    expect(screen.getByLabelText('Illustrated cookie recipe sample')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close cookbook preview' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Heritage recipe page style: Classic ink and quiet ornament',
    }));

    expect(screen.getByRole('button', { name: 'Close cookbook preview' })).toBeTruthy();
    expect(screen.getByLabelText('Heritage brownie recipe sample')).toBeTruthy();
    expect(screen.getByLabelText('Heritage cookie recipe sample')).toBeTruthy();
    expect(screen.queryByText('Fine cloth · Sage cover · Heritage recipe pages')).toBeNull();
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
    expect(screen.getByText('Cover finish')).toBeTruthy();
    expect(screen.getByText('Cover color')).toBeTruthy();
    expect(screen.getByText('Title style')).toBeTruthy();
    expect(screen.getByText('Page style')).toBeTruthy();

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
        coverTitleColorId: 'auto',
        coverTitlePlacementId: 'center',
        pageStyleId: 'heritage',
      });
    });
  });

  it('keeps bookshelf scene styling separate and applies a shelf choice immediately', async () => {
    const onShelfStyleChange = jest.fn().mockResolvedValue(undefined);
    const onWallpaperStyleChange = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <CreationStudio
        canCreate
        shelfStyleId="classic-oak"
        wallpaperStyleId="paper-ivory"
        onCreateBook={jest.fn()}
        onShelfStyleChange={onShelfStyleChange}
        onWallpaperStyleChange={onWallpaperStyleChange}
        onSignIn={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Customize bookshelf scene' }));

    expect(screen.getByText('Set the scene')).toBeTruthy();
    expect(screen.getByText('Shelf')).toBeTruthy();
    expect(screen.getByText('Wallpaper')).toBeTruthy();
    expect(screen.queryByText('Cover finish')).toBeNull();
    expect(screen.getByTestId('shelf-style-rail').props.horizontal).toBe(true);
    expect(screen.getByTestId('wallpaper-style-rail').props.horizontal).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Carved walnut shelf' }));

    await waitFor(() => {
      expect(onShelfStyleChange).toHaveBeenCalledWith('carved-walnut');
    });

    fireEvent.press(screen.getByRole('button', { name: 'Charcoal damask wallpaper' }));

    await waitFor(() => {
      expect(onWallpaperStyleChange).toHaveBeenCalledWith('charcoal-damask');
    });
  });
});
