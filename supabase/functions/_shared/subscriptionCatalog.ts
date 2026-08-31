/**
 * Stable identifiers shared by the client and Edge Functions.
 *
 * Store product identifiers and RevenueCat entitlement identifiers are
 * effectively permanent once shipped. Keep them here instead of scattering
 * string literals through UI, billing, and webhook code.
 */
export const NOSH_SUBSCRIPTION_IDS = {
  entitlement: 'nosh_plus',
  offering: 'default',
  products: {
    monthly: 'com.yaz12.nosh.plus.monthly',
    annual: 'com.yaz12.nosh.plus.annual',
  },
  packages: {
    monthly: '$rc_monthly',
    annual: '$rc_annual',
  },
} as const;

export const NOSH_PLAN_CATALOG = {
  free: {
    id: 'free',
    name: 'Nosh Free',
    limits: {
      cookbooks: 2,
      designedPagesLifetime: 5,
    },
  },
  plus: {
    id: 'plus',
    name: 'Nosh Plus',
    limits: {
      cookbooks: null,
      designedPagesPerPeriod: 20,
    },
  },
} as const;

export type NoshBillingPeriod = keyof typeof NOSH_SUBSCRIPTION_IDS.products;
export type NoshPlanId = keyof typeof NOSH_PLAN_CATALOG;

export function isNoshSubscriptionProduct(value: unknown): value is string {
  return value === NOSH_SUBSCRIPTION_IDS.products.monthly
    || value === NOSH_SUBSCRIPTION_IDS.products.annual;
}
