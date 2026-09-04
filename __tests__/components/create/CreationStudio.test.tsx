import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CreationStudio } from '@/components/create/CreationStudio';
import { COOKBOOK_PAGE_STYLES, getCookbookPageStylePreview } from '@/constants/cookbookCustomization';

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
  it('uses the saved Illustrated portrait sample while editing an older book', () => {
    const screen = render(
      <CreationStudio mode="edit" existingPageStylePreview={getCookbookPageStylePreview('illustrated', 1)} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Open cookbook preview' }));
    expect(screen.getByLabelText('Illustrated brownie recipe sample').props.source)
      .toBe(COOKBOOK_PAGE_STYLES.watercolor.samples.brownies);
  });

  it('keeps the cover visible when a saved revision has no matching sample', () => {
    const screen = render(<CreationStudio mode="edit" existingPageStylePreview={null} />);
    expect(screen.queryByRole('button', { name: 'Open cookbook preview' })).toBeNull();
    expect(screen.getByLabelText('Cookbook cover preview')).toBeTruthy();
    expect(screen.queryByLabelText('Studio brownie recipe sample')).toBeNull();
  });

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
    expect(StyleSheet.flatten(screen.getByTestId('page-style-rail').props.style).overflow)
      .not.toBe('visible');
    const pageSampleStyle = StyleSheet.flatten(
      screen.getByTestId('page-style-sample-studio').props.style,
    );
    expect(pageSampleStyle).toMatchObject({ aspectRatio: 4 / 5 });
    expect(pageSampleStyle.height).toBeCloseTo(pageSampleStyle.width / (4 / 5));
    expect(screen.getByTestId('page-style-sample-studio').props.resizeMode).toBe('contain');
    expect(screen.getByText('Studio')).toBeTruthy();
    expect(screen.getByText('Clean, modern, and quietly precise')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Sunday Suppers'), 'Desserts');
    fireEvent.press(screen.getByRole('button', {
      name: 'Natural linen cover finish',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Midnight cover color' }));
    fireEvent.press(screen.getByRole('button', { name: 'Plum title color' }));
    fireEvent.press(screen.getByRole('button', { name: 'Modern title treatment' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Editorial recipe page style: Dramatic food-magazine art direction',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Add this cookbook to my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith({
        title: 'Desserts',
        coverFinishId: 'natural-linen',
        coverColorId: 'midnight',
        coverTitleColorId: 'plum',
        coverTitlePlacementId: 'lower',
        pageStyleId: 'editorial',
      });
    });
  });

  it('preserves the studio and re-enables creation when an access guard returns false', async () => {
    const onCreateBook = jest.fn().mockResolvedValue(false);
    const screen = render(
      <CreationStudio canCreate onCreateBook={onCreateBook} onSignIn={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Sunday Suppers'), 'My Baking Book');
    const createButton = screen.getByRole('button', { name: 'Add this cookbook to my shelf' });
    fireEvent.press(createButton);

    await waitFor(() => expect(onCreateBook).toHaveBeenCalledTimes(1));
    expect(screen.getByDisplayValue('My Baking Book')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add this cookbook to my shelf' }).props.accessibilityState?.disabled).not.toBe(true);
  });

  it('selects the page style after the carousel settles', () => {
    const screen = render(
      <CreationStudio canCreate onCreateBook={jest.fn()} onSignIn={jest.fn()} />,
    );
    const rail = screen.getByTestId('page-style-rail');

    fireEvent(rail, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: rail.props.snapToInterval, y: 0 } },
    });

    expect(screen.getAllByText('Editorial').length).toBeGreaterThan(0);
    expect(screen.getByText('Dramatic food-magazine art direction')).toBeTruthy();
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
    expect(screen.getByLabelText('Studio brownie recipe sample')).toBeTruthy();
    expect(screen.getByLabelText('Studio cookie recipe sample')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close cookbook preview' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Heritage recipe page style: Heirloom print with modern legibility',
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
    expect(screen.getByText('Title treatment')).toBeTruthy();
    expect(screen.getByText('Page style')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clay cover color' }));
    fireEvent.press(screen.getByRole('button', {
      name: 'Heritage recipe page style: Heirloom print with modern legibility',
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

  it('edits the physical cookbook identity without exposing page-style or scene changes', async () => {
    const onSaveBook = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <CreationStudio
        mode="edit"
        initialDetails={{
          title: 'Weeknight Table',
          coverFinishId: 'natural-linen',
          coverColorId: 'midnight',
          coverTitleColorId: 'ivory',
          coverTitlePlacementId: 'upper',
          pageStyleId: 'studio',
        }}
        onSaveBook={onSaveBook}
      />,
    );

    expect(screen.getByDisplayValue('Weeknight Table')).toBeTruthy();
    expect(screen.queryByText('Page style')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Customize bookshelf scene' })).toBeNull();

    fireEvent.changeText(screen.getByDisplayValue('Weeknight Table'), 'Weeknight Favorites');
    fireEvent.press(screen.getByRole('button', { name: 'Clay cover color' }));
    fireEvent.press(screen.getByRole('button', { name: 'Modern title treatment' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save cookbook changes' }));

    await waitFor(() => {
      expect(onSaveBook).toHaveBeenCalledWith({
        title: 'Weeknight Favorites',
        coverFinishId: 'natural-linen',
        coverColorId: 'clay',
        coverTitleColorId: 'ivory',
        coverTitlePlacementId: 'lower',
        pageStyleId: 'studio',
      });
    });
  });
});
