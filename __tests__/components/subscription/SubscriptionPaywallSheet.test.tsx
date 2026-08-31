import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SubscriptionPaywallSheet } from '@/components/subscription/SubscriptionPaywallSheet';
import type { SubscriptionPackage } from '@/types/subscription';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/components/brand/NoshBrandAssets', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return { NoshSymbol: () => mockReact.createElement(View, { testID: 'nosh-symbol' }) };
});
jest.mock('@/components/ui/Sheet', () => {
  const mockReact = require('react');
  return {
    Sheet: ({ visible, header, children }: {
      visible: boolean;
      header?: React.ReactNode;
      children: React.ReactNode;
    }) => visible ? mockReact.createElement(mockReact.Fragment, null, header, children) : null,
  };
});

const packages: SubscriptionPackage[] = [
  {
    id: 'monthly',
    identifier: '$rc_monthly',
    productIdentifier: 'nosh_plus_monthly',
    title: 'Monthly',
    description: 'Nosh Plus monthly',
    localizedPrice: 'SAR 39.99',
    localizedPricePerMonth: null,
    price: 39.99,
    currencyCode: 'SAR',
    billingPeriod: 'P1M',
    introOffer: {
      eligible: true,
      localizedPrice: 'SAR 0.00',
      price: 0,
      period: 'P1W',
      periodUnit: 'WEEK',
      periodNumberOfUnits: 1,
      cycles: 1,
    },
  },
  {
    id: 'annual',
    identifier: '$rc_annual',
    productIdentifier: 'nosh_plus_annual',
    title: 'Annual',
    description: 'Nosh Plus annual',
    localizedPrice: 'SAR 299.99',
    localizedPricePerMonth: 'SAR 25.00',
    price: 299.99,
    currencyCode: 'SAR',
    billingPeriod: 'P1Y',
    introOffer: null,
  },
];

describe('SubscriptionPaywallSheet', () => {
  it('defaults to annual and purchases using App Store-localized prices', () => {
    const onPurchase = jest.fn();
    const screen = render(
      <SubscriptionPaywallSheet
        visible
        reason="page_capture"
        packages={packages}
        offeringsStatus="ready"
        purchaseState="idle"
        error={null}
        onClose={jest.fn()}
        onPurchase={onPurchase}
        onRestore={jest.fn()}
        onRetryOfferings={jest.fn()}
        onOpenTerms={jest.fn()}
        onOpenPrivacy={jest.fn()}
      />,
    );

    const yearly = screen.getByRole('radio', { name: /Yearly, SAR 299.99 per year/ });
    expect(yearly.props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('SAR 25.00 per month')).toBeTruthy();
    expect(screen.getByText('1 week free')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Subscribe for SAR 299.99/year' }));
    expect(onPurchase).toHaveBeenCalledWith('annual');
  });

  it('states an eligible free trial and the localized renewal price before purchase', () => {
    const onPurchase = jest.fn();
    const screen = render(
      <SubscriptionPaywallSheet
        visible
        reason="settings"
        packages={packages}
        offeringsStatus="ready"
        purchaseState="idle"
        error={null}
        onClose={jest.fn()}
        onPurchase={onPurchase}
        onRestore={jest.fn()}
        onRetryOfferings={jest.fn()}
        onOpenTerms={jest.fn()}
        onOpenPrivacy={jest.fn()}
      />,
    );

    const monthly = screen.getByRole('radio', { name: /Monthly, SAR 39.99 per month, 1 week free/ });
    fireEvent.press(monthly);
    expect(screen.getByRole('button', { name: 'Start 1 week free' })).toBeTruthy();
    expect(screen.getByText(/After the offer, your Apple Account is charged SAR 39.99\/month/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start 1 week free' }));
    expect(onPurchase).toHaveBeenCalledWith('monthly');
  });

  it('offers a real retry when App Store plans fail to load', () => {
    const onRetryOfferings = jest.fn();
    const screen = render(
      <SubscriptionPaywallSheet
        visible
        reason="settings"
        packages={[]}
        offeringsStatus="error"
        purchaseState="idle"
        error="Plans could not be loaded."
        onClose={jest.fn()}
        onPurchase={jest.fn()}
        onRestore={jest.fn()}
        onRetryOfferings={onRetryOfferings}
        onOpenTerms={jest.fn()}
        onOpenPrivacy={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Try loading plans again' }));
    expect(onRetryOfferings).toHaveBeenCalledTimes(1);
  });
});
