import { Linking } from 'react-native';
import { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import {
  APPLE_SUBSCRIPTION_MANAGEMENT_URL,
  mapRevenueCatPackage,
  RevenueCatClient,
  RevenueCatPurchaseCancelledError,
  RevenueCatUnavailableError,
} from '@/utils/subscriptions/revenueCatClient';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    addCustomerInfoUpdateListener: jest.fn(),
    checkTrialOrIntroductoryPriceEligibility: jest.fn(),
    configure: jest.fn(),
    getAppUserID: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    isConfigured: jest.fn(),
    logIn: jest.fn(),
    purchasePackage: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    restorePurchases: jest.fn(),
    setLogLevel: jest.fn(),
    showManageSubscriptions: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG', ERROR: 'ERROR' },
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: 'PURCHASE_CANCELLED_ERROR' },
}));

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

function makeSdk() {
  return {
    addCustomerInfoUpdateListener: jest.fn(),
    checkTrialOrIntroductoryPriceEligibility: jest.fn().mockResolvedValue({}),
    configure: jest.fn(),
    getAppUserID: jest.fn().mockResolvedValue(USER_A),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    isConfigured: jest.fn().mockResolvedValue(false),
    logIn: jest.fn().mockResolvedValue({ customerInfo: {}, created: true }),
    purchasePackage: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    restorePurchases: jest.fn(),
    setLogLevel: jest.fn().mockResolvedValue(undefined),
    showManageSubscriptions: jest.fn().mockResolvedValue(undefined),
  };
}

function makePackage(productIdentifier = 'com.yaz12.nosh.plus.monthly') {
  return {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    offeringIdentifier: 'default',
    presentedOfferingContext: { offeringIdentifier: 'default' },
    webCheckoutUrl: null,
    product: {
      identifier: productIdentifier,
      title: 'Folio Plus Monthly',
      description: 'Folio Plus',
      price: 9.99,
      priceString: '$9.99',
      pricePerMonthString: '$9.99',
      currencyCode: 'USD',
      subscriptionPeriod: 'P1M',
      introPrice: {
        price: 0,
        priceString: '$0.00',
        cycles: 1,
        period: 'P1W',
        periodUnit: 'WEEK',
        periodNumberOfUnits: 1,
      },
    },
  } as unknown as Parameters<typeof mapRevenueCatPackage>[1];
}

describe('RevenueCatClient', () => {
  it('configures exactly once with the authenticated Supabase UUID', async () => {
    const sdk = makeSdk();
    const client = new RevenueCatClient(
      sdk as unknown as ConstructorParameters<typeof RevenueCatClient>[0],
      'ios',
      'test_public_key',
    );

    await client.identify(USER_A);

    expect(sdk.configure).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'test_public_key',
      appUserID: USER_A,
    }));
    expect(sdk.logIn).not.toHaveBeenCalled();
  });

  it('switches known accounts with logIn and never creates an anonymous logout identity', async () => {
    const sdk = makeSdk();
    sdk.isConfigured.mockResolvedValue(true);
    const client = new RevenueCatClient(
      sdk as unknown as ConstructorParameters<typeof RevenueCatClient>[0],
      'ios',
      'test_public_key',
    );

    await client.identify(USER_B);

    expect(sdk.logIn).toHaveBeenCalledWith(USER_B);
    expect(sdk).not.toHaveProperty('logOut');
  });

  it('refuses email or placeholder identities before configuring purchases', async () => {
    const sdk = makeSdk();
    const client = new RevenueCatClient(
      sdk as unknown as ConstructorParameters<typeof RevenueCatClient>[0],
      'ios',
      'test_public_key',
    );

    await expect(client.identify('cook@nosh.app')).rejects.toBeInstanceOf(RevenueCatUnavailableError);
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it('maps localized store metadata and rejects a mismatched dashboard product', () => {
    expect(mapRevenueCatPackage('monthly', makePackage(), true)).toEqual(expect.objectContaining({
      id: 'monthly',
      localizedPrice: '$9.99',
      billingPeriod: 'P1M',
      introOffer: expect.objectContaining({
        eligible: true,
        period: 'P1W',
        periodUnit: 'WEEK',
        periodNumberOfUnits: 1,
        cycles: 1,
      }),
    }));
    expect(mapRevenueCatPackage('monthly', makePackage())?.introOffer).toBeNull();
    expect(mapRevenueCatPackage('monthly', makePackage('wrong.product'))).toBeNull();
  });

  it('merchandises an intro offer only when RevenueCat confirms eligibility', async () => {
    const sdk = makeSdk();
    sdk.getOfferings.mockResolvedValue({
      current: { monthly: makePackage(), annual: null },
      all: {},
    });
    sdk.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({
      'com.yaz12.nosh.plus.monthly': { status: 2, description: 'eligible' },
    });
    const client = new RevenueCatClient(
      sdk as unknown as ConstructorParameters<typeof RevenueCatClient>[0],
      'ios',
      'test_public_key',
    );
    await client.identify(USER_A);

    await expect(client.getPackages(USER_A)).resolves.toEqual([
      expect.objectContaining({ introOffer: expect.objectContaining({ eligible: true }) }),
    ]);

    sdk.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({
      'com.yaz12.nosh.plus.monthly': { status: 0, description: 'unknown' },
    });
    await expect(client.getPackages(USER_A)).resolves.toEqual([
      expect.objectContaining({ introOffer: null }),
    ]);
  });

  it('normalizes store-sheet cancellation without treating it as a purchase failure', async () => {
    const sdk = makeSdk();
    sdk.getOfferings.mockResolvedValue({
      current: { monthly: makePackage(), annual: null },
      all: {},
    });
    sdk.purchasePackage.mockRejectedValue({
      code: PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
    });
    const client = new RevenueCatClient(
      sdk as unknown as ConstructorParameters<typeof RevenueCatClient>[0],
      'ios',
      'test_public_key',
    );
    await client.identify(USER_A);

    await expect(client.purchase(USER_A, 'monthly'))
      .rejects.toBeInstanceOf(RevenueCatPurchaseCancelledError);
  });

  it('always exposes Apple subscription management when SDK setup is unavailable', async () => {
    const sdk = makeSdk();
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const client = new RevenueCatClient(
      sdk as unknown as ConstructorParameters<typeof RevenueCatClient>[0],
      'ios',
      null,
    );

    await expect(client.manage(USER_A, null)).resolves.toBe(true);
    expect(openUrl).toHaveBeenCalledWith(APPLE_SUBSCRIPTION_MANAGEMENT_URL);
    expect(sdk.showManageSubscriptions).not.toHaveBeenCalled();
    openUrl.mockRestore();
  });
});
