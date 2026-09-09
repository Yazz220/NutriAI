import React from 'react';
import { render } from '@testing-library/react-native';
import { FoilStampedTitle } from '@/components/physical-book/FoilStampedTitle';

const foil = ['#7A5A18', '#D4AF37', '#F7E8B0'] as const;

describe('FoilStampedTitle', () => {
  it('uses one crisp text face for the phone-scale Editorial treatment', () => {
    const screen = render(
      <FoilStampedTitle
        title="My Cookbook"
        foil={foil}
        width={220}
        spineWidth={18}
        placementId="upper"
      />,
    );

    expect(screen.getAllByText('My Cookbook')).toHaveLength(1);
    expect(screen.queryByText('FOLIO / RECIPES')).toBeNull();
  });

  it('keeps the embossed foil layers for Classic', () => {
    const screen = render(
      <FoilStampedTitle
        title="My Cookbook"
        foil={foil}
        width={220}
        spineWidth={18}
        placementId="center"
      />,
    );

    expect(screen.getAllByText('My Cookbook')).toHaveLength(3);
  });

  it('renders Bookplate as a crisp framed composition', () => {
    const screen = render(
      <FoilStampedTitle
        title="My Cookbook"
        foil={foil}
        width={220}
        spineWidth={18}
        placementId="bookplate"
      />,
    );

    expect(screen.getAllByText('My Cookbook')).toHaveLength(1);
    expect(screen.queryByText('PERSONAL COOKBOOK')).toBeNull();
    expect(screen.getByTestId('bookplate-title-frame')).toBeTruthy();
  });
});
