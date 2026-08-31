import { Linking, Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesConfiguration,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import {
  getRevenueCatPublicApiKey,
  isRevenueCatPlatformSupported,
  NOSH_SUBSCRIPTION_IDS,
} from '@/constants/subscriptions';
import type { SubscriptionPackage, SubscriptionPackageId } from '@/types/subscription';

type PurchasesSdk = Pick<typeof Purchases,
  | 'addCustomerInfoUpdateListener'
  | 'checkTrialOrIntroductoryPriceEligibility'
  | 'configure'
  | 'getAppUserID'
  | 'getCustomerInfo'
  | 'getOfferings'
  | 'isConfigured'
  | 'logIn'
  | 'purchasePackage'
  | 'removeCustomerInfoUpdateListener'
  | 'restorePurchases'
  | 'setLogLevel'
  | 'showManageSubscriptions'
>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const APPLE_SUBSCRIPTION_MANAGEMENT_URL = 'https://apps.apple.com/account/subscriptions';

export class RevenueCatUnavailableError extends Error {
  constructor(message = 'Purchases are not available in this build.') {
    super(message);
    this.name = 'RevenueCatUnavailableError';
  }
}

export class RevenueCatPurchaseCancelledError extends Error {
  constructor() {
    super('The purchase was cancelled.');
    this.name = 'RevenueCatPurchaseCancelledError';
  }
}

function assertSafeUserId(userId: string): void {
  if (!UUID_PATTERN.test(userId)) {
    throw new RevenueCatUnavailableError('A signed-in Nosh account is required for purchases.');
  }
}

function packageForPeriod(
  offering: PurchasesOffering,
  period: SubscriptionPackageId,
): PurchasesPackage | null {
  return period === 'monthly' ? offering.monthly : offering.annual;
}

function expectedProductForPeriod(period: SubscriptionPackageId): string {
  return NOSH_SUBSCRIPTION_IDS.products[period];
}

export function mapRevenueCatPackage(
  period: SubscriptionPackageId,
  value: PurchasesPackage,
  introEligible = false,
): SubscriptionPackage | null {
  const product = value.product;
  if (product.identifier !== expectedProductForPeriod(period)) return null;

  return {
    id: period,
    identifier: value.identifier,
    productIdentifier: product.identifier,
    title: product.title,
    description: product.description,
    localizedPrice: product.priceString,
    localizedPricePerMonth: product.pricePerMonthString,
    price: product.price,
    currencyCode: product.currencyCode,
    billingPeriod: product.subscriptionPeriod,
    introOffer: introEligible && product.introPrice
      ? {
          eligible: true,
          localizedPrice: product.introPrice.priceString,
          price: product.introPrice.price,
          period: product.introPrice.period,
          periodUnit: product.introPrice.periodUnit,
          periodNumberOfUnits: product.introPrice.periodNumberOfUnits,
          cycles: product.introPrice.cycles,
        }
      : null,
  };
}

function activeOffering(offerings: Awaited<ReturnType<PurchasesSdk['getOfferings']>>): PurchasesOffering | null {
  return offerings.current ?? offerings.all[NOSH_SUBSCRIPTION_IDS.offering] ?? null;
}

function isCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; userCancelled?: unknown };
  return candidate.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    || candidate.userCancelled === true;
}

/**
 * Small stateful adapter around RevenueCat's process-wide singleton.
 * It never configures anonymously and never calls logOut, which would create
 * an anonymous RevenueCat identity capable of receiving another user's store
 * purchase during an account transition.
 */
export class RevenueCatClient {
  private activeUserId: string | null = null;
  private identityWork: Promise<void> = Promise.resolve();

  constructor(
    private readonly sdk: PurchasesSdk = Purchases,
    private readonly platform: string = Platform.OS,
    private readonly apiKey: string | null = getRevenueCatPublicApiKey(platform),
  ) {}

  get available(): boolean {
    return isRevenueCatPlatformSupported(this.platform) && Boolean(this.apiKey);
  }

  async identify(userId: string): Promise<void> {
    assertSafeUserId(userId);
    if (!this.available || !this.apiKey) throw new RevenueCatUnavailableError();

    const work = this.identityWork
      .catch(() => undefined)
      .then(async () => {
        const configured = await this.sdk.isConfigured();
        if (!configured) {
          await this.sdk.setLogLevel(
            typeof __DEV__ !== 'undefined' && __DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR,
          );
          this.sdk.configure({
            apiKey: this.apiKey!,
            appUserID: userId,
          } as PurchasesConfiguration);
          this.activeUserId = userId;
          return;
        }

        const currentUserId = await this.sdk.getAppUserID();
        if (currentUserId !== userId) {
          await this.sdk.logIn(userId);
        }
        this.activeUserId = userId;
      });

    this.identityWork = work.then(() => undefined, () => undefined);
    return work;
  }

  private assertIdentified(userId: string): void {
    if (this.activeUserId !== userId) {
      throw new RevenueCatUnavailableError('Purchase identity is still being prepared.');
    }
  }

  async getCustomerInfo(userId: string): Promise<CustomerInfo> {
    this.assertIdentified(userId);
    return this.sdk.getCustomerInfo();
  }

  async getPackages(userId: string): Promise<SubscriptionPackage[]> {
    this.assertIdentified(userId);
    const offering = activeOffering(await this.sdk.getOfferings());
    if (!offering) return [];

    const packages = (['monthly', 'annual'] as const)
      .map((period) => ({ period, value: packageForPeriod(offering, period) }))
      .filter((entry): entry is { period: SubscriptionPackageId; value: PurchasesPackage } => (
        entry.value !== null
      ));
    const productIdsWithIntro = packages
      .filter(({ value }) => value.product.introPrice !== null)
      .map(({ value }) => value.product.identifier);
    let eligibleProductIds = new Set<string>();
    if (this.platform === 'ios' && productIdsWithIntro.length > 0) {
      try {
        const eligibility = await this.sdk.checkTrialOrIntroductoryPriceEligibility(
          productIdsWithIntro,
        );
        eligibleProductIds = new Set(
          productIdsWithIntro.filter((productId) => (
            eligibility[productId]?.status
              === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
          )),
        );
      } catch {
        // Unknown eligibility must show standard pricing. StoreKit will still
        // apply any offer it determines the purchaser can receive.
      }
    }

    return packages
      .map(({ period, value }) => mapRevenueCatPackage(
        period,
        value,
        eligibleProductIds.has(value.product.identifier),
      ))
      .filter((value): value is SubscriptionPackage => value !== null);
  }

  async purchase(userId: string, period: SubscriptionPackageId): Promise<CustomerInfo> {
    this.assertIdentified(userId);
    const offering = activeOffering(await this.sdk.getOfferings());
    const purchasePackage = offering ? packageForPeriod(offering, period) : null;
    if (!purchasePackage || purchasePackage.product.identifier !== expectedProductForPeriod(period)) {
      throw new Error('This Nosh Plus option is not available right now.');
    }

    try {
      const result = await this.sdk.purchasePackage(purchasePackage);
      return result.customerInfo;
    } catch (error) {
      if (isCancellation(error)) throw new RevenueCatPurchaseCancelledError();
      throw error;
    }
  }

  async restore(userId: string): Promise<CustomerInfo> {
    this.assertIdentified(userId);
    return this.sdk.restorePurchases();
  }

  addCustomerInfoListener(
    userId: string,
    listener: CustomerInfoUpdateListener,
  ): () => void {
    this.assertIdentified(userId);
    const guardedListener: CustomerInfoUpdateListener = (customerInfo) => {
      if (this.activeUserId === userId) listener(customerInfo);
    };
    this.sdk.addCustomerInfoUpdateListener(guardedListener);
    return () => {
      this.sdk.removeCustomerInfoUpdateListener(guardedListener);
    };
  }

  async manage(userId: string, customerInfo: CustomerInfo | null): Promise<boolean> {
    if (this.platform === 'ios') {
      if (this.activeUserId === userId) {
        try {
          await this.sdk.showManageSubscriptions();
          return true;
        } catch {
          // Fall through to RevenueCat's or Apple's management URL.
        }
      }

      try {
        await Linking.openURL(customerInfo?.managementURL ?? APPLE_SUBSCRIPTION_MANAGEMENT_URL);
        return true;
      } catch {
        return false;
      }
    }

    this.assertIdentified(userId);
    const url = customerInfo?.managementURL;
    if (!url || !(await Linking.canOpenURL(url))) return false;
    await Linking.openURL(url);
    return true;
  }
}

export function customerHasNoshPlus(customerInfo: CustomerInfo | null): boolean {
  return customerInfo?.entitlements.active[NOSH_SUBSCRIPTION_IDS.entitlement]?.isActive === true;
}

export const revenueCatClient = new RevenueCatClient();
