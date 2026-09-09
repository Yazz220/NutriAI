import { supabase } from '@/lib/supabase';
import type {
  DesignedPageUsage,
  SubscriptionAccessSnapshot,
  SubscriptionEntitlementStatus,
  SubscriptionLimitUsage,
  SubscriptionPlanId,
} from '@/types/subscription';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

export const SUBSCRIPTION_ACCESS_QUERY_KEY = (userId: string | undefined) => [
  'subscription-access',
  userId,
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function nullableLimit(value: unknown): number | null {
  return value === null || value === undefined ? null : finiteNumber(value);
}

function nullableDate(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function normalizeLimit(value: unknown): SubscriptionLimitUsage {
  const record = isRecord(value) ? value : {};
  return {
    limit: nullableLimit(record.limit),
    used: finiteNumber(record.used),
    remaining: nullableLimit(record.remaining),
  };
}

function normalizeDesignedPages(value: unknown): DesignedPageUsage {
  const record = isRecord(value) ? value : {};
  return {
    ...normalizeLimit(record),
    reserved: finiteNumber(record.reserved),
    periodStart: nullableDate(record.periodStart),
    periodEnd: nullableDate(record.periodEnd),
  };
}

function normalizePlanId(value: unknown): SubscriptionPlanId {
  return value === 'plus' ? 'plus' : 'free';
}

function normalizeEntitlementStatus(value: unknown): SubscriptionEntitlementStatus {
  if (
    value === 'free'
    || value === 'active'
    || value === 'grace_period'
    || value === 'billing_retry'
    || value === 'cancelled'
    || value === 'expired'
    || value === 'revoked'
    || value === 'paused'
    || value === 'inactive'
  ) {
    return value;
  }
  return 'unknown';
}

export function normalizeSubscriptionAccess(value: unknown): SubscriptionAccessSnapshot {
  if (!isRecord(value)) throw new Error('Folio returned an invalid subscription status.');
  const features = isRecord(value.features) ? value.features : {};
  const planId = normalizePlanId(value.planId);
  const currentPeriodEndsAt = nullableDate(value.currentPeriodEndsAt);
  return {
    planId,
    planName: typeof value.planName === 'string'
      ? value.planName
      : planId === 'plus' ? 'Folio Plus' : 'Folio Free',
    entitlementStatus: value.entitlementStatus == null && planId === 'free'
      ? 'free'
      : normalizeEntitlementStatus(value.entitlementStatus),
    productId: typeof value.productId === 'string' ? value.productId : null,
    environment: value.environment === 'production' || value.environment === 'sandbox'
      ? value.environment
      : null,
    periodType: value.periodType === 'monthly' || value.periodType === 'annual'
      ? value.periodType
      : null,
    currentPeriodStartedAt: nullableDate(value.currentPeriodStartedAt),
    currentPeriodEndsAt,
    expiresAt: nullableDate(value.expiresAt) ?? currentPeriodEndsAt,
    willRenew: value.willRenew === true,
    features: {
      cookbooks: normalizeLimit(features.cookbooks),
      designedPages: normalizeDesignedPages(features.designedPages),
    },
  };
}

export async function fetchSubscriptionAccess(): Promise<SubscriptionAccessSnapshot> {
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('get_subscription_access');
  if (error) throw error;
  return normalizeSubscriptionAccess(data);
}

export async function syncSubscriptionAccess(): Promise<SubscriptionAccessSnapshot> {
  const result = await callAuthenticatedFunction<unknown>(
    'sync-subscription',
    {},
    { timeoutMs: 20_000 },
  );
  const access = isRecord(result) && 'access' in result ? result.access : result;
  return normalizeSubscriptionAccess(access);
}
