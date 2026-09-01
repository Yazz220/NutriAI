import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  applyDestinationCarouselResistance,
  CookbookDestinationCarousel,
  getDestinationCarouselRelativePosition,
  normalizeDestinationCarouselIndex,
  resolveDestinationCarouselSnap,
} from '@/components/cookbook/CookbookDestinationCarousel';
import type { Cookbook } from '@/types/cookbook';

const mockSelectionAsync = jest.fn().mockResolvedValue(undefined);
const mockImpactAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-haptics', () => ({
  selectionAsync: (...args: unknown[]) => mockSelectionAsync(...args),
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@/components/physical-book/PhysicalBook', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return {
    PhysicalBook: ({ title }: { title: string }) => mockReact.createElement(Text, null, `Book: ${title}`),
  };
});

function cookbook(id: string, title: string): Cookbook {
  return {
    id,
    userId: 'user-1',
    title,
    theme: { name: 'Test', prompt: 'Test' },
    sectionOrder: ['dinner'],
    coverStyle: 'sage-linen',
    coverFinishId: 'fine-cloth',
    coverColorId: 'sage',
    coverTitleColorId: 'auto',
    coverTitlePlacementId: 'center',
    pageStyleId: 'studio',
    styleRevision: 1,
    isDefault: id === 'book-1',
    pageTemplateId: 'clean-cream',
    sections: [],
    pageCount: 4,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  };
}

describe('CookbookDestinationCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows one physical cookbook without a dropdown control', () => {
    const book = cookbook('book-1', 'Family Table');
    const screen = render(
      <CookbookDestinationCarousel
        cookbooks={[book]}
        selectedCookbookId={book.id}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('Book: Family Table')).toBeTruthy();
    expect(screen.getByLabelText('Family Table, destination cookbook')).toBeTruthy();
    expect(screen.queryByTestId('destination-cookbook-gesture-stage')).toBeNull();
  });

  it('centers a tapped cookbook and selects it without opening an overlay', () => {
    const books = [
      cookbook('book-1', 'Family Table'),
      cookbook('book-2', 'Weeknight Book'),
      cookbook('book-3', 'Baking Notes'),
    ];
    const onSelect = jest.fn();
    const screen = render(
      <CookbookDestinationCarousel
        cookbooks={books}
        selectedCookbookId="book-1"
        onSelect={onSelect}
      />,
    );

    fireEvent(screen.getByTestId('cookbook-destination-carousel'), 'layout', {
      nativeEvent: { layout: { width: 360, height: 132, x: 0, y: 0 } },
    });
    fireEvent.press(screen.getByRole('button', { name: 'Add recipes to Weeknight Book' }));

    expect(onSelect).toHaveBeenCalledWith('book-2');
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
    expect(screen.getByTestId('destination-cookbook-gesture-stage')).toBeTruthy();
  });

  it('adds resistance after one cookbook without creating an end stop', () => {
    expect(applyDestinationCarouselResistance(-0.5, 0)).toBe(-0.5);
    expect(applyDestinationCarouselResistance(-2, 0)).toBeCloseTo(-1.18);
    expect(applyDestinationCarouselResistance(2, 0)).toBeCloseTo(1.18);
  });

  it('wraps cookbook indexes and positions continuously in either direction', () => {
    expect(normalizeDestinationCarouselIndex(-1, 4)).toBe(3);
    expect(normalizeDestinationCarouselIndex(4, 4)).toBe(0);
    expect(getDestinationCarouselRelativePosition(3, 0, 4)).toBe(-1);
    expect(getDestinationCarouselRelativePosition(0, 4, 4)).toBe(0);
  });

  it('serializes gesture math as UI-thread worklets', () => {
    const resistanceWorklet = applyDestinationCarouselResistance as typeof applyDestinationCarouselResistance & {
      __workletHash?: number;
    };
    const snapWorklet = resolveDestinationCarouselSnap as typeof resolveDestinationCarouselSnap & {
      __workletHash?: number;
    };
    const normalizeWorklet = normalizeDestinationCarouselIndex as typeof normalizeDestinationCarouselIndex & {
      __workletHash?: number;
    };
    const relativePositionWorklet = getDestinationCarouselRelativePosition as typeof getDestinationCarouselRelativePosition & {
      __workletHash?: number;
    };

    expect(resistanceWorklet.__workletHash).toEqual(expect.any(Number));
    expect(snapWorklet.__workletHash).toEqual(expect.any(Number));
    expect(normalizeWorklet.__workletHash).toEqual(expect.any(Number));
    expect(relativePositionWorklet.__workletHash).toEqual(expect.any(Number));
  });

  it('does not change cookbooks for a tentative low-velocity drag', () => {
    expect(resolveDestinationCarouselSnap(1.18, 0, 1)).toBe(1);
  });

  it('snaps at most one cookbook per gesture without first or last edges', () => {
    expect(resolveDestinationCarouselSnap(3.8, -4000, 1)).toBe(2);
    expect(resolveDestinationCarouselSnap(-0.8, 4000, 0)).toBe(-1);
    expect(resolveDestinationCarouselSnap(4.8, -4000, 4)).toBe(5);
  });
});
