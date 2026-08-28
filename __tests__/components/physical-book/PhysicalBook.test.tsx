import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import { PHYSICAL_BOOK_ASPECT, PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { SAMPLE_COOKBOOK } from '@/utils/cookbook/sampleCookbook';

describe('PhysicalBook back cover', () => {
  it('uses the canonical 4:5 cookbook proportion', () => {
    expect(PHYSICAL_BOOK_ASPECT).toBe(5 / 4);
  });

  it('reuses a generated front asset without adding front-cover text', () => {
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
    expect(screen.queryByText('COOKBOOK')).toBeNull();
  });

  it('keeps a legacy back face free of placeholder copy', () => {
    const screen = render(
      <PhysicalBook title="" coverStyle="handwritten" face="back" showShadow={false} />,
    );

    expect(screen.queryByText('Untitled')).toBeNull();
    expect(screen.queryByText('COOKBOOK')).toBeNull();
  });
});
