import type {
  SubscriptionAccessSnapshot,
  SubscriptionEntitlementStatus,
} from '@/types/subscription';

const EFFECTIVE_PLUS_STATUSES = new Set<SubscriptionEntitlementStatus>([
  'active',
  'grace_period',
  'billing_retry',
  // Cancellation disables renewal, not access already paid for. The server
  // keeps planId=plus only until currentPeriodEndsAt.
  'cancelled',
]);

export function isEffectivePlusAccess(
  snapshot: SubscriptionAccessSnapshot | null | undefined,
): boolean {
  return snapshot?.planId === 'plus'
    && EFFECTIVE_PLUS_STATUSES.has(snapshot.entitlementStatus);
}
