import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import { PHYSICAL_BOOK_ASPECT, PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { SAMPLE_COOKBOOK } from '@/utils/cookbook/sampleCookbook';

jest.mock('@/components/physical-book/SkiaBookCover', () => ({
  SkiaBookCover: () => null,
}));

describe('PhysicalBook canonical shell', () => {
  it('uses the canonical 4:5 cookbook proportion', () => {
    expect(PHYSICAL_BOOK_ASPECT).toBe(5 / 4);
  });

  it('keeps artwork as a surface layer on the titled canonical front cover', () => {
    const screen = render(
      <PhysicalBook
        title="Week Night Table Recipes"
        coverStyle={SAMPLE_COOKBOOK.coverStyle}
        imageAsset={SAMPLE_COOKBOOK.coverImageAsset}
        showShadow={false}
      />,
    );

    expect(screen.UNSAFE_getByType(Image).props.source).toBe(SAMPLE_COOKBOOK.coverImageAsset);
    expect(screen.getAllByText('Week Night Table Recipes')).toHaveLength(3);
    expect(screen.queryByText('NOSH')).toBeNull();
    expect(screen.getByTestId('nosh-cover-maker-mark', { includeHiddenElements: true })).toBeTruthy();
  });

  it('reuses artwork on the canonical back without adding front-cover text', () => {
    const screen = render(
      <PhysicalBook
        title=""
        coverStyle={SAMPLE_COOKBOOK.coverStyle}
        imageAsset={SAMPLE_COOKBOOK.coverImageAsset}
        face="back"
        showShadow={false}
      />,
    );

    expect(screen.UNSAFE_getByType(Image).props.source).toBe(SAMPLE_COOKBOOK.coverImageAsset);
    expect(screen.queryByText('Untitled')).toBeNull();
    expect(screen.queryByText('NOSH')).toBeNull();
    expect(screen.queryByTestId('nosh-cover-maker-mark', { includeHiddenElements: true })).toBeNull();
  });

  it('keeps a legacy back face free of placeholder copy', () => {
    const screen = render(<PhysicalBook title="" coverStyle="handwritten" face="back" showShadow={false} />);

    expect(screen.queryByText('Untitled')).toBeNull();
    expect(screen.queryByText('NOSH')).toBeNull();
  });

  it('normalizes a legacy style onto the same titled front shell', () => {
    const screen = render(<PhysicalBook title="Family Recipes" coverStyle="handwritten" showShadow={false} />);

    expect(screen.getAllByText('Family Recipes')).toHaveLength(3);
    expect(screen.queryByText('NOSH')).toBeNull();
    expect(screen.getByTestId('nosh-cover-maker-mark', { includeHiddenElements: true })).toBeTruthy();
  });
});
