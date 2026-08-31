import type { NoshBillingPeriod, NoshPlanId } from '@/supabase/functions/_shared/subscriptionCatalog';

export type SubscriptionPlanId = NoshPlanId;
export type SubscriptionPackageId = NoshBillingPeriod;

export type SubscriptionEntitlementStatus =
  | 'free'
  | 'active'
  | 'grace_period'
  | 'billing_retry'
  | 'cancelled'
  | 'expired'
  | 'revoked'
  | 'paused'
  | 'inactive'
  | 'unknown';

export interface SubscriptionLimitUsage {
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface DesignedPageUsage extends SubscriptionLimitUsage {
  reserved: number;
  periodStart: string | null;
  periodEnd: string | null;
}

/** Server-authoritative plan and usage snapshot. */
export interface SubscriptionAccessSnapshot {
  planId: SubscriptionPlanId;
  planName: string;
  entitlementStatus: SubscriptionEntitlementStatus;
  productId: string | null;
  environment: 'production' | 'sandbox' | null;
  periodType: SubscriptionPackageId | null;
  currentPeriodStartedAt: string | null;
  currentPeriodEndsAt: string | null;
  /** Compatibility alias for currentPeriodEndsAt. */
  expiresAt: string | null;
  willRenew: boolean;
  features: {
    cookbooks: SubscriptionLimitUsage;
    designedPages: DesignedPageUsage;
  };
}

export interface SubscriptionIntroOffer {
  /** Only present after RevenueCat confirms eligibility for this user. */
  eligible: true;
  localizedPrice: string;
  price: number;
  period: string;
  periodUnit: string;
  periodNumberOfUnits: number;
  cycles: number;
}

/** Store-localized package data safe for presentation components. */
export interface SubscriptionPackage {
  id: SubscriptionPackageId;
  identifier: string;
  productIdentifier: string;
  title: string;
  description: string;
  localizedPrice: string;
  localizedPricePerMonth: string | null;
  price: number;
  currencyCode: string;
  billingPeriod: string | null;
  introOffer: SubscriptionIntroOffer | null;
}

export type SubscriptionOfferingsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unavailable'
  | 'error';

export type SubscriptionActionState =
  | 'idle'
  | 'purchasing'
  | 'restoring'
  | 'syncing';
