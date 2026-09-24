import { View } from 'react-native';
import { SubscriptionPaywallSheet } from '@/components/subscription/SubscriptionPaywallSheet';
import { Colors } from '@/constants/colors';
import type { SubscriptionPackage } from '@/types/subscription';

const packages: SubscriptionPackage[] = [
  {
    id: 'annual',
    identifier: '$rc_annual',
    productIdentifier: 'com.yaz12.nosh.plus.annual',
    title: 'Folio Plus Annual',
    description: 'Unlimited cookbooks and 40 designed page creations each month.',
    localizedPrice: '$89.99',
    localizedPricePerMonth: '$7.50',
    price: 89.99,
    currencyCode: 'USD',
    billingPeriod: 'P1Y',
    introOffer: null,
  },
  {
    id: 'monthly',
    identifier: '$rc_monthly',
    productIdentifier: 'com.yaz12.nosh.plus.monthly',
    title: 'Folio Plus Monthly',
    description: 'Unlimited cookbooks and 40 designed page creations each month.',
    localizedPrice: '$9.99',
    localizedPricePerMonth: '$9.99',
    price: 9.99,
    currencyCode: 'USD',
    billingPeriod: 'P1M',
    introOffer: null,
  },
];

export default function PaywallReviewPreview() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SubscriptionPaywallSheet
        visible
        reason="settings"
        packages={packages}
        offeringsStatus="ready"
        purchaseState="idle"
        error={null}
        onClose={() => undefined}
        onPurchase={() => undefined}
        onRestore={() => undefined}
        onRetryOfferings={() => undefined}
        onOpenTerms={() => undefined}
        onOpenPrivacy={() => undefined}
      />
    </View>
  );
}
