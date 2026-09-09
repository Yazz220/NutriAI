import { Image, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { FolioWordmark, FolioHorizontalLockup } from '@/components/brand/NoshBrandAssets';

describe('Folio name assets', () => {
  it('renders the supplied horizontal lockup instead of a text-built wordmark', () => {
    const { getByLabelText, queryByText, UNSAFE_getByType } = render(<FolioHorizontalLockup width={200} />);

    expect(getByLabelText('Folio')).toHaveStyle({ width: 200 });
    expect(queryByText('Folio')).toBeNull();
    expect(UNSAFE_getByType(Image).props.source).toBeTruthy();
  });

  it('keeps the standalone Folio wordmark available as its own asset', () => {
    const { getByLabelText, UNSAFE_getByType } = render(<FolioWordmark width={160} tone="ivory" />);

    expect(getByLabelText('Folio')).toHaveStyle({ width: 160 });
    expect(StyleSheet.flatten(UNSAFE_getByType(Image).props.style)).toMatchObject({
      tintColor: '#F7F2EA',
    });
  });
});
