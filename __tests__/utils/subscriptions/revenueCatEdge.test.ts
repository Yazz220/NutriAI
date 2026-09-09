import { webcrypto } from 'node:crypto';
import {
  deleteRevenueCatSubscriber,
  fetchRevenueCatSubscriber,
  findRevenueCatUserId,
  findRevenueCatUserIds,
  parseRevenueCatSubscriber,
  parseRevenueCatWebhookEnvironment,
  syncRevenueCatSubscriber,
  verifyRevenueCatWebhookAuthorization,
  verifyRevenueCatWebhookSignature,
} from '@/supabase/functions/_shared/revenueCat';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TRANSFER_USER_ID = '22222222-2222-4222-8222-222222222222';
const MERGED_ALIAS_USER_ID = '33333333-3333-4333-8333-333333333333';

describe('RevenueCat server contract', () => {
  it('normalizes billing retry and sandbox status from the canonical subscriber response', () => {
    const state = parseRevenueCatSubscriber({
      request_date: '2026-08-31T00:00:00.000Z',
      subscriber: {
        original_app_user_id: USER_ID,
        entitlements: {
          nosh_plus: {
            product_identifier: 'com.yaz12.nosh.plus.annual',
            expires_date: '2026-10-01T00:00:00.000Z',
          },
        },
        subscriptions: {
          'com.yaz12.nosh.plus.annual': {
            billing_issues_detected_at: '2026-08-30T00:00:00.000Z',
            expires_date: '2026-10-01T00:00:00.000Z',
            is_sandbox: true,
            period_type: 'NORMAL',
            purchase_date: '2026-08-31T00:00:00.000Z',
            store: 'app_store',
          },
        },
      },
    }, USER_ID, Date.parse('2026-09-01T00:00:00.000Z'));

    expect(state).toEqual(expect.objectContaining({
      productId: 'com.yaz12.nosh.plus.annual',
      environment: 'sandbox',
      status: 'billing_retry',
      periodType: 'annual',
      willRenew: true,
      hasCurrentEntitlement: true,
    }));
  });

  it('finds only a UUID-shaped Folio identity among RevenueCat aliases', () => {
    expect(findRevenueCatUserId({
      app_user_id: '$RCAnonymousID:abc',
      aliases: ['$RCAnonymousID:def', USER_ID],
    })).toBe(USER_ID);
    expect(findRevenueCatUserId({ app_user_id: 'cook@nosh.app' })).toBeNull();
  });

  it('routes a normal event to one canonical UUID instead of every merged alias', () => {
    expect(findRevenueCatUserIds({
      type: 'RENEWAL',
      app_user_id: USER_ID,
      original_app_user_id: TRANSFER_USER_ID,
      aliases: [MERGED_ALIAS_USER_ID, TRANSFER_USER_ID],
    })).toEqual([USER_ID]);
    expect(findRevenueCatUserIds({
      type: 'INITIAL_PURCHASE',
      app_user_id: '$RCAnonymousID:abc',
      original_app_user_id: TRANSFER_USER_ID,
      aliases: [USER_ID, MERGED_ALIAS_USER_ID],
    })).toEqual([TRANSFER_USER_ID]);
  });

  it('finds both Supabase owners on a RevenueCat transfer event', () => {
    expect(findRevenueCatUserIds({
      type: 'TRANSFER',
      app_user_id: '$RCAnonymousID:abc',
      aliases: [MERGED_ALIAS_USER_ID],
      transferred_from: [USER_ID, '$RCAnonymousID:def'],
      transferred_to: [TRANSFER_USER_ID, USER_ID],
    })).toEqual([USER_ID, TRANSFER_USER_ID]);
  });

  it('audits omitted transfer environments while rejecting malformed values', () => {
    expect(parseRevenueCatWebhookEnvironment({ type: 'TRANSFER' })).toBe('unknown');
    expect(parseRevenueCatWebhookEnvironment({ environment: 'SANDBOX' })).toBe('sandbox');
    expect(() => parseRevenueCatWebhookEnvironment({ environment: null })).toThrow(
      'Invalid RevenueCat webhook environment',
    );
    expect(() => parseRevenueCatWebhookEnvironment({ environment: 'staging' })).toThrow(
      'Invalid RevenueCat webhook environment',
    );
  });

  it('marks cancelled access active through its paid period but not renewing', () => {
    const state = parseRevenueCatSubscriber({
      request_date: '2026-08-31T00:00:00.000Z',
      subscriber: {
        original_app_user_id: USER_ID,
        entitlements: {
          nosh_plus: {
            product_identifier: 'com.yaz12.nosh.plus.monthly',
            expires_date: '2026-10-01T00:00:00.000Z',
          },
        },
        subscriptions: {
          'com.yaz12.nosh.plus.monthly': {
            expires_date: '2026-10-01T00:00:00.000Z',
            is_sandbox: false,
            purchase_date: '2026-09-01T00:00:00.000Z',
            store: 'app_store',
            unsubscribe_detected_at: '2026-09-02T00:00:00.000Z',
          },
        },
      },
    }, USER_ID, Date.parse('2026-09-03T00:00:00.000Z'));

    expect(state).toEqual(expect.objectContaining({
      status: 'cancelled',
      willRenew: false,
      hasCurrentEntitlement: true,
    }));
  });

  it('deactivates transferred-away history when the current entitlement is absent', () => {
    const state = parseRevenueCatSubscriber({
      request_date: '2026-08-31T00:00:00.000Z',
      subscriber: {
        original_app_user_id: USER_ID,
        entitlements: {},
        subscriptions: {
          'com.yaz12.nosh.plus.monthly': {
            expires_date: '2026-10-01T00:00:00.000Z',
            purchase_date: '2026-09-01T00:00:00.000Z',
            store: 'test_store',
          },
        },
      },
    }, USER_ID, Date.parse('2026-09-03T00:00:00.000Z'));

    expect(state).toEqual(expect.objectContaining({
      productId: 'com.yaz12.nosh.plus.monthly',
      store: 'app_store',
      hasCurrentEntitlement: false,
    }));
  });

  it('does not grant indefinite Plus when a subscription expiry is missing', async () => {
    const response = {
      request_date: '2026-09-01T00:00:00.000Z',
      subscriber: {
        original_app_user_id: USER_ID,
        entitlements: {
          nosh_plus: {
            product_identifier: 'com.yaz12.nosh.plus.monthly',
            purchase_date: '2026-09-01T00:00:00.000Z',
          },
        },
        subscriptions: {
          'com.yaz12.nosh.plus.monthly': {
            purchase_date: '2026-09-01T00:00:00.000Z',
            store: 'app_store',
          },
        },
      },
    };
    const state = parseRevenueCatSubscriber(
      response,
      USER_ID,
      Date.parse('2026-09-02T00:00:00.000Z'),
    );
    expect(state).toEqual(expect.objectContaining({
      productId: 'com.yaz12.nosh.plus.monthly',
      currentPeriodEndsAt: null,
      hasCurrentEntitlement: false,
      status: 'expired',
      willRenew: false,
    }));

    const rpc = jest.fn().mockResolvedValue({ data: { planId: 'free' }, error: null });
    const admin = { schema: jest.fn().mockReturnValue({ rpc }) };
    await syncRevenueCatSubscriber(admin, USER_ID, response, { acceptSandbox: true });
    expect(rpc).toHaveBeenCalledWith(
      'deactivate_subscription_from_provider',
      expect.objectContaining({ p_user_id: USER_ID, p_entitlement_id: 'nosh_plus' }),
    );
    expect(rpc).not.toHaveBeenCalledWith(
      'sync_subscription_from_provider',
      expect.anything(),
    );
  });

  it('turns a missing RevenueCat customer into an empty Free snapshot', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 404, ok: false });

    await expect(fetchRevenueCatSubscriber(
      USER_ID,
      'secret-key',
      fetchImpl as unknown as typeof fetch,
    )).resolves.toEqual(expect.objectContaining({
      subscriber: {
        original_app_user_id: USER_ID,
        entitlements: {},
        subscriptions: {},
      },
    }));
  });

  it('deactivates stale access through the service-only RPC for an empty snapshot', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { applied: true, planId: 'free' },
      error: null,
    });
    const admin = { schema: jest.fn().mockReturnValue({ rpc }) };
    const response = {
      request_date: '2026-09-01T00:00:00.000Z',
      subscriber: {
        original_app_user_id: USER_ID,
        entitlements: {},
        subscriptions: {},
      },
    };

    await expect(syncRevenueCatSubscriber(admin, USER_ID, response, {
      acceptSandbox: false,
    })).resolves.toEqual(expect.objectContaining({ ignored: false }));
    expect(admin.schema).toHaveBeenCalledWith('nutriai');
    expect(rpc).toHaveBeenCalledWith('deactivate_subscription_from_provider', {
      p_user_id: USER_ID,
      p_entitlement_id: 'nosh_plus',
      p_provider_customer_id: USER_ID,
      p_environment: 'production',
      p_provider_updated_at: '2026-09-01T00:00:00.000Z',
      p_raw: response,
    });
  });

  it('verifies both the configured bearer token and raw-body HMAC timestamp', async () => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    const rawBody = '{"event":{"id":"event-1"}}';
    const secret = 'signing-secret';
    const timestamp = 1_788_134_400;
    const key = await webcrypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signed = await webcrypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`),
    );
    const signature = Buffer.from(signed).toString('hex');

    expect(verifyRevenueCatWebhookAuthorization('Bearer auth-token', 'auth-token')).toBe(true);
    await expect(verifyRevenueCatWebhookSignature(
      rawBody,
      `t=${timestamp},v1=${signature}`,
      secret,
      timestamp * 1000,
    )).resolves.toBe(true);
    await expect(verifyRevenueCatWebhookSignature(
      `${rawBody} `,
      `t=${timestamp},v1=${signature}`,
      secret,
      timestamp * 1000,
    )).resolves.toBe(false);
  });

  it.each([200, 201, 204, 404])(
    'treats RevenueCat subscriber deletion status %i as complete',
    async (status) => {
      const fetchImpl = jest.fn().mockResolvedValue({ status });

      await expect(deleteRevenueCatSubscriber(
        USER_ID,
        'secret-key',
        fetchImpl as unknown as typeof fetch,
      )).resolves.toBeUndefined();
      expect(fetchImpl).toHaveBeenCalledWith(
        `https://api.revenuecat.com/v1/subscribers/${USER_ID}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer secret-key' }),
          signal: expect.anything(),
        }),
      );
    },
  );

  it('fails account erasure when RevenueCat does not confirm deletion', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 500 });

    await expect(deleteRevenueCatSubscriber(
      USER_ID,
      'secret-key',
      fetchImpl as unknown as typeof fetch,
    )).rejects.toThrow('RevenueCat subscriber deletion failed (500)');
  });
});
