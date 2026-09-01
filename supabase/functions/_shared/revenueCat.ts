import {
  isNoshSubscriptionProduct,
  NOSH_SUBSCRIPTION_IDS,
} from './subscriptionCatalog.ts';

export type RevenueCatEnvironment = 'production' | 'sandbox';
export type RevenueCatEntitlementStatus =
  | 'active'
  | 'grace_period'
  | 'billing_retry'
  | 'cancelled'
  | 'expired';

interface RevenueCatSubscriptionRecord {
  billing_issues_detected_at?: string | null;
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  is_sandbox?: boolean;
  original_purchase_date?: string | null;
  period_type?: string | null;
  purchase_date?: string | null;
  refunded_at?: string | null;
  store?: string | null;
  unsubscribe_detected_at?: string | null;
}

interface RevenueCatEntitlementRecord {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
}

export interface RevenueCatSubscriberResponse {
  request_date?: string;
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlementRecord>;
    subscriptions?: Record<string, RevenueCatSubscriptionRecord>;
    original_app_user_id?: string;
  };
}

export interface RevenueCatSubscriptionState {
  providerCustomerId: string;
  entitlementId: string;
  productId: string | null;
  environment: RevenueCatEnvironment;
  status: RevenueCatEntitlementStatus;
  periodType: 'monthly' | 'annual' | null;
  currentPeriodStartedAt: string | null;
  currentPeriodEndsAt: string | null;
  willRenew: boolean;
  store: string;
  providerUpdatedAt: string;
  hasCurrentEntitlement: boolean;
  raw: RevenueCatSubscriberResponse;
}

export interface RevenueCatSyncResult {
  ignored: boolean;
  reason?: 'sandbox_not_accepted';
  access: unknown | null;
  state: RevenueCatSubscriptionState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validDate(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function isFuture(value: string | null, nowMs: number): boolean {
  return value !== null && Date.parse(value) > nowMs;
}

function newestKnownProduct(
  subscriptions: Record<string, RevenueCatSubscriptionRecord>,
): string | null {
  return Object.entries(subscriptions)
    .filter(([productId]) => isNoshSubscriptionProduct(productId))
    .sort(([, left], [, right]) => {
      const leftDate = Date.parse(left.expires_date ?? left.purchase_date ?? '') || 0;
      const rightDate = Date.parse(right.expires_date ?? right.purchase_date ?? '') || 0;
      return rightDate - leftDate;
    })[0]?.[0] ?? null;
}

function normalizeStore(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const store = value.toLowerCase();
  if (store === 'play_store') return 'play_store';
  // Folio's current products are App Store products. RevenueCat's Test Store
  // uses the same configured product identifiers in sandbox builds.
  if (store === 'app_store' || store === 'mac_app_store' || store === 'test_store') {
    return 'app_store';
  }
  return 'unknown';
}

export function parseRevenueCatSubscriber(
  value: unknown,
  fallbackCustomerId: string,
  nowMs = Date.now(),
): RevenueCatSubscriptionState {
  if (!isRecord(value) || !isRecord(value.subscriber)) {
    throw new Error('RevenueCat returned an invalid subscriber response');
  }

  const raw = value as unknown as RevenueCatSubscriberResponse;
  const subscriber = raw.subscriber!;
  const entitlements = subscriber.entitlements ?? {};
  const subscriptions = subscriber.subscriptions ?? {};
  const entitlement = entitlements[NOSH_SUBSCRIPTION_IDS.entitlement] ?? {};
  const entitlementProductId = typeof entitlement.product_identifier === 'string'
    && isNoshSubscriptionProduct(entitlement.product_identifier)
    ? entitlement.product_identifier
    : null;
  const productId = entitlementProductId ?? newestKnownProduct(subscriptions);
  const subscription = productId ? subscriptions[productId] ?? {} : {};
  const expiresAt = validDate(entitlement.expires_date)
    ?? validDate(subscription.expires_date);
  const gracePeriodEndsAt = validDate(subscription.grace_period_expires_date)
    ?? validDate(entitlement.grace_period_expires_date);
  const refunded = validDate(subscription.refunded_at) !== null;
  const billingIssue = validDate(subscription.billing_issues_detected_at) !== null;
  const unsubscribed = validDate(subscription.unsubscribe_detected_at) !== null;
  const hasCurrentEntitlement = entitlementProductId !== null
    && !refunded
    && (
      isFuture(expiresAt, nowMs)
      || isFuture(gracePeriodEndsAt, nowMs)
    );

  let status: RevenueCatEntitlementStatus = 'expired';
  if (hasCurrentEntitlement && isFuture(gracePeriodEndsAt, nowMs)) {
    status = 'grace_period';
  } else if (hasCurrentEntitlement) {
    status = unsubscribed ? 'cancelled' : billingIssue ? 'billing_retry' : 'active';
  }

  return {
    providerCustomerId: subscriber.original_app_user_id ?? fallbackCustomerId,
    entitlementId: NOSH_SUBSCRIPTION_IDS.entitlement,
    productId,
    environment: subscription.is_sandbox === true ? 'sandbox' : 'production',
    status,
    periodType: productId === NOSH_SUBSCRIPTION_IDS.products.monthly
      ? 'monthly'
      : productId === NOSH_SUBSCRIPTION_IDS.products.annual ? 'annual' : null,
    currentPeriodStartedAt: validDate(subscription.purchase_date)
      ?? validDate(entitlement.purchase_date)
      ?? validDate(subscription.original_purchase_date),
    currentPeriodEndsAt: expiresAt,
    willRenew: status !== 'expired' && !unsubscribed && !refunded,
    store: normalizeStore(subscription.store),
    providerUpdatedAt: validDate(raw.request_date) ?? new Date(nowMs).toISOString(),
    hasCurrentEntitlement,
    raw,
  };
}

export async function fetchRevenueCatSubscriber(
  appUserId: string,
  secretApiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RevenueCatSubscriberResponse> {
  if (!secretApiKey) throw new Error('RevenueCat server API is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${secretApiKey}`,
        },
        signal: controller.signal,
      },
    );
    if (response.status === 404) {
      // A never-created customer and a transferred-from/deleted customer are
      // both valid Free snapshots. Keeping this path deterministic lets a
      // transfer event deactivate stale access before activating its new owner.
      return {
        request_date: new Date().toISOString(),
        subscriber: {
          original_app_user_id: appUserId,
          entitlements: {},
          subscriptions: {},
        },
      };
    }
    if (!response.ok) {
      throw new Error(`RevenueCat subscriber lookup failed (${response.status})`);
    }
    return await response.json() as RevenueCatSubscriberResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteRevenueCatSubscriber(
  appUserId: string,
  secretApiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!secretApiKey) throw new Error('RevenueCat server API is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${secretApiKey}`,
        },
        signal: controller.signal,
      },
    );
    if (![200, 201, 204, 404].includes(response.status)) {
      throw new Error(`RevenueCat subscriber deletion failed (${response.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncRevenueCatSubscriber(
  admin: any,
  userId: string,
  response: RevenueCatSubscriberResponse,
  options: { acceptSandbox: boolean },
): Promise<RevenueCatSyncResult> {
  const state = parseRevenueCatSubscriber(response, userId);
  if (state.environment === 'sandbox' && !options.acceptSandbox) {
    return { ignored: true, reason: 'sandbox_not_accepted', access: null, state };
  }

  if (!state.hasCurrentEntitlement) {
    const { data, error } = await admin
      .schema('nutriai')
      .rpc('deactivate_subscription_from_provider', {
        p_user_id: userId,
        p_entitlement_id: state.entitlementId,
        p_provider_customer_id: state.providerCustomerId,
        p_environment: state.environment,
        p_provider_updated_at: state.providerUpdatedAt,
        p_raw: state.raw,
      });
    if (error) throw error;
    return { ignored: false, access: data, state };
  }

  const { data, error } = await admin
    .schema('nutriai')
    .rpc('sync_subscription_from_provider', {
      p_user_id: userId,
      p_provider_customer_id: state.providerCustomerId,
      p_entitlement_id: state.entitlementId,
      p_product_id: state.productId,
      p_environment: state.environment,
      p_status: state.status,
      p_period_type: state.periodType,
      p_current_period_started_at: state.currentPeriodStartedAt,
      p_current_period_ends_at: state.currentPeriodEndsAt,
      p_will_renew: state.willRenew,
      p_store: state.store,
      p_provider_updated_at: state.providerUpdatedAt,
      p_raw: state.raw,
    });
  if (error) throw error;
  return { ignored: false, access: data, state };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uniqueUuidCandidates(values: unknown[]): string[] {
  const userIds: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) continue;
    const userId = value.toLowerCase();
    if (!userIds.includes(userId)) userIds.push(userId);
  }
  return userIds;
}

export function findRevenueCatUserIds(event: unknown): string[] {
  if (!isRecord(event)) return [];

  // Aliases are every identifier ever merged into the same RevenueCat
  // customer. A normal event must therefore reconcile one canonical Folio
  // account, never fan the same entitlement out to every UUID alias.
  if (typeof event.type !== 'string' || event.type.toUpperCase() !== 'TRANSFER') {
    return uniqueUuidCandidates([
      event.app_user_id,
      event.original_app_user_id,
      ...(Array.isArray(event.aliases) ? event.aliases : []),
    ]).slice(0, 1);
  }

  // Transfer events are the sole multi-owner case: the old owner must lose
  // access and the new owner must receive it from their canonical snapshots.
  return uniqueUuidCandidates([
    ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
    ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
  ]);
}

export function findRevenueCatUserId(event: unknown): string | null {
  return findRevenueCatUserIds(event)[0] ?? null;
}

export function parseRevenueCatWebhookEnvironment(
  event: unknown,
): RevenueCatEnvironment | 'unknown' {
  if (!isRecord(event)) throw new Error('Invalid RevenueCat webhook event');
  const value = event.environment;
  if (value === undefined) return 'unknown';
  if (typeof value !== 'string') throw new Error('Invalid RevenueCat webhook environment');
  const normalized = value.toLowerCase();
  if (normalized !== 'production' && normalized !== 'sandbox') {
    throw new Error('Invalid RevenueCat webhook environment');
  }
  return normalized;
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyRevenueCatWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  signingSecret: string,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!signatureHeader || !signingSecret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.trim().split('=', 2)),
  );
  const timestamp = parts.t;
  const providedSignature = parts.v1;
  if (!timestamp || !providedSignature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowMs - Number(timestamp) * 1000) > 5 * 60 * 1000) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return constantTimeEqual(bytesToHex(signature), providedSignature.toLowerCase());
}

export function verifyRevenueCatWebhookAuthorization(
  authorizationHeader: string | null,
  expectedToken: string,
): boolean {
  if (!authorizationHeader || !expectedToken) return false;
  return constantTimeEqual(authorizationHeader, `Bearer ${expectedToken}`);
}
