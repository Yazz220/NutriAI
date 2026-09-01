import { normalizeSubscriptionAccess } from '@/utils/subscriptions/api';
import { isEffectivePlusAccess } from '@/utils/subscriptions/access';

jest.mock('@/lib/supabase', () => ({
  supabase: { schema: jest.fn() },
}));

jest.mock('@/utils/supabaseEdge', () => ({
  callAuthenticatedFunction: jest.fn(),
}));

describe('subscription access normalization', () => {
  it('keeps the server snapshot authoritative and preserves reserved usage', () => {
    expect(normalizeSubscriptionAccess({
      planId: 'plus',
      entitlementStatus: 'active',
      expiresAt: '2026-10-01T00:00:00.000Z',
      willRenew: true,
      features: {
        cookbooks: { limit: null, used: 4, remaining: null },
        designedPages: {
          limit: 20,
          used: 7,
          reserved: 2,
          remaining: 11,
          periodStart: '2026-09-01T00:00:00.000Z',
          periodEnd: '2026-10-01T00:00:00.000Z',
        },
      },
    })).toEqual({
      planId: 'plus',
      planName: 'Folio Plus',
      entitlementStatus: 'active',
      productId: null,
      environment: null,
      periodType: null,
      currentPeriodStartedAt: null,
      currentPeriodEndsAt: null,
      expiresAt: '2026-10-01T00:00:00.000Z',
      willRenew: true,
      features: {
        cookbooks: { limit: null, used: 4, remaining: null },
        designedPages: {
          limit: 20,
          used: 7,
          reserved: 2,
          remaining: 11,
          periodStart: '2026-09-01T00:00:00.000Z',
          periodEnd: '2026-10-01T00:00:00.000Z',
        },
      },
    });
  });

  it('uses unknown instead of silently treating a new provider state as active', () => {
    expect(normalizeSubscriptionAccess({
      planId: 'free',
      entitlementStatus: 'future_state',
      features: {},
    }).entitlementStatus).toBe('unknown');
  });

  it('keeps a cancelled subscription effective through its server-authorized period', () => {
    const access = normalizeSubscriptionAccess({
      planId: 'plus',
      entitlementStatus: 'cancelled',
      currentPeriodEndsAt: '2026-10-01T00:00:00.000Z',
      willRenew: false,
      features: {},
    });

    expect(isEffectivePlusAccess(access)).toBe(true);
    expect(isEffectivePlusAccess({ ...access, planId: 'free' })).toBe(false);
  });
});
