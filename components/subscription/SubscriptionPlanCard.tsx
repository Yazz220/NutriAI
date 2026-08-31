import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AlertTriangle, ChevronRight, Crown, RefreshCw } from 'lucide-react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { useToast } from '@/contexts/ToastContext';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import type { SubscriptionAccessSnapshot } from '@/types/subscription';
import { Fonts } from '@/utils/fonts';
import { isEffectivePlusAccess } from '@/utils/subscriptions/access';
import { trackEvent } from '@/utils/analytics';
import { useSubscriptionUi } from './SubscriptionHost';
import { SubscriptionStatusSkeleton } from './SubscriptionStatusSkeleton';

export function SubscriptionPlanCard() {
  const subscription = useNoshSubscription();
  const { openPaywall } = useSubscriptionUi();
  const { showToast } = useToast();
  const [action, setAction] = useState<'restore' | 'manage' | 'refresh' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (subscription.isLoading) return <SubscriptionStatusSkeleton />;

  if (!subscription.access) {
    return (
      <View style={styles.card} accessibilityRole="alert">
        <View style={styles.heading}>
          <View style={styles.iconBadge}><NoshSymbol size={23} /></View>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Could not check your plan</Text>
            <Text style={styles.meta}>Your cookbooks are still available.</Text>
          </View>
        </View>
        {subscription.error ? <Text style={styles.error}>{subscription.error}</Text> : null}
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => {
            setAction('refresh');
            setActionError(null);
            void subscription.refresh()
              .catch((error) => setActionError(error instanceof Error ? error.message : 'Could not check your plan.'))
              .finally(() => setAction(null));
          }}
          loading={action === 'refresh' || subscription.isRefreshing}
          fullWidth
        />
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      </View>
    );
  }

  const access = subscription.access;
  const isPlus = isEffectivePlusAccess(access);
  const allowance = access.features.designedPages;
  const cookbookAllowance = access.features.cookbooks;
  const limit = allowance.limit ?? 0;
  const remaining = allowance.remaining ?? 0;
  const usedPercent = limit > 0
    ? Math.min(100, Math.max(0, (allowance.used / limit) * 100))
    : 0;
  const billingIssue = isPlus && (access.entitlementStatus === 'grace_period' || access.entitlementStatus === 'billing_retry');

  const restore = async () => {
    if (action) return;
    setAction('restore');
    setActionError(null);
    trackEvent({ type: 'restore_started', data: { reason: 'settings' } });
    try {
      const restored = await subscription.restore();
      if (!isEffectivePlusAccess(restored)) {
        trackEvent({
          type: restored ? 'restore_not_found' : 'restore_failed',
          data: { reason: 'settings' },
        });
        setActionError(restored
          ? 'No active Nosh Plus purchase was found for this Apple Account.'
          : 'Nosh could not confirm restored purchases. Please try again.');
        return;
      }
      trackEvent({ type: 'restore_succeeded', data: { reason: 'settings' } });
      showToast({ type: 'success', message: 'Nosh Plus restored.' });
    } catch (error) {
      trackEvent({ type: 'restore_failed', data: { reason: 'settings' } });
      setActionError(error instanceof Error ? error.message : 'Purchases could not be restored.');
    } finally {
      setAction(null);
    }
  };

  const manage = async () => {
    if (action) return;
    setAction('manage');
    setActionError(null);
    try {
      if (!await subscription.manage()) {
        trackEvent({ type: 'manage_subscription_failed', data: { reason: 'settings' } });
        setActionError('Subscription settings could not be opened.');
      } else {
        trackEvent({ type: 'manage_subscription_opened', data: { reason: 'settings' } });
      }
    } catch (error) {
      trackEvent({ type: 'manage_subscription_failed', data: { reason: 'settings' } });
      setActionError(error instanceof Error ? error.message : 'Subscription settings could not be opened.');
    } finally {
      setAction(null);
    }
  };

  return (
    <View style={[styles.card, isPlus && styles.plusCard]}>
      <View style={styles.heading}>
        <View style={[styles.iconBadge, isPlus && styles.plusIconBadge]} accessibilityElementsHidden>
          {isPlus ? <Crown size={20} color={Colors.primary} /> : <NoshSymbol size={23} />}
        </View>
        <View style={styles.headingCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{isPlus ? 'Nosh Plus' : 'Nosh Free'}</Text>
            {isPlus ? (
              <View style={styles.plusBadge}><Text style={styles.plusBadgeText}>PLUS</Text></View>
            ) : null}
          </View>
          <Text style={styles.meta}>{remaining} {remaining === 1 ? 'page creation' : 'page creations'} left{isPlus ? ' this month' : ''}</Text>
        </View>
      </View>

      <Text style={styles.cookbookMeta}>
        {cookbookAllowance.limit === null
          ? 'Unlimited cookbooks'
          : `${formatNumber(cookbookAllowance.used)} of ${formatNumber(cookbookAllowance.limit)} cookbooks used`}
      </Text>

      {billingIssue ? (
        <View style={styles.billingNotice} accessibilityRole="alert">
          <AlertTriangle size={17} color={Colors.warning} />
          <View style={styles.billingCopy}>
            <Text style={styles.billingTitle}>Billing needs attention</Text>
            <Text style={styles.billingBody}>Your Plus access is still active. Update billing to avoid an interruption.</Text>
          </View>
        </View>
      ) : null}

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={allowanceAccessibilityLabel(access)}
        accessibilityValue={{ min: 0, max: limit, now: allowance.used }}
        style={styles.progressTrack}
      >
        <View style={[styles.progressFill, { width: `${usedPercent}%` }]} />
      </View>

      <View style={styles.allowanceCopy}>
        <Text style={styles.allowanceMeta}>{allowance.used} of {limit} used</Text>
        <Text style={styles.allowanceMeta}>
          {isPlus && allowance.periodEnd
            ? `Refreshes ${formatDate(allowance.periodEnd, false)}`
            : 'Five page creations are included with Free'}
        </Text>
      </View>

      {isPlus ? (
        <Text style={styles.renewal}>{renewalCopy(access)}</Text>
      ) : (
        <Text style={styles.trust}>Every recipe and page you already created stays in your cookbooks.</Text>
      )}

      {actionError ? <Text style={styles.error} accessibilityRole="alert">{actionError}</Text> : null}

      {isPlus ? (
        <Button
          title={billingIssue ? 'Update billing' : 'Manage subscription'}
          variant="secondary"
          onPress={() => { void manage(); }}
          loading={action === 'manage'}
          fullWidth
        />
      ) : (
        <Button
          title="Upgrade to Nosh Plus"
          onPress={() => { void openPaywall('settings'); }}
          fullWidth
          size="lg"
        />
      )}

      {!isPlus ? (
        <Pressable
          style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
          onPress={() => { void restore(); }}
          disabled={action !== null}
          accessibilityRole="button"
          accessibilityLabel="Restore App Store purchases"
          accessibilityState={{ disabled: action !== null, busy: action === 'restore' }}
        >
          {action === 'restore' ? <RefreshCw size={16} color={Colors.primary} /> : null}
          <Text style={styles.restoreText}>{action === 'restore' ? 'Checking purchases…' : 'Restore purchases'}</Text>
          {action !== 'restore' ? <ChevronRight size={16} color={Colors.textMuted} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function renewalCopy(access: SubscriptionAccessSnapshot) {
  if (!access.expiresAt) return 'Your Plus allowance refreshes monthly.';
  return access.willRenew
    ? `Renews ${formatDate(access.expiresAt, true)}`
    : `Ends ${formatDate(access.expiresAt, true)}`;
}

function allowanceAccessibilityLabel(access: SubscriptionAccessSnapshot) {
  const allowance = access.features.designedPages;
  const reset = allowance.periodEnd ? ` Refreshes ${formatDate(allowance.periodEnd, false)}.` : '';
  return `${allowance.used} of ${allowance.limit ?? 0} page creations used.${reset}`;
}

function formatDate(value: string, includeYear: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'soon';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    overflow: 'hidden',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  plusCard: { borderColor: Colors.alpha.primary[20], backgroundColor: Colors.book.accentSoft },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
  },
  plusIconBadge: { backgroundColor: Colors.white },
  headingCopy: { flex: 1, gap: Spacing.values[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlSm,
    lineHeight: Typography.metrics.lineHeight28,
  },
  meta: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md },
  cookbookMeta: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm },
  plusBadge: { borderRadius: Radii.full, backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.values[3] },
  plusBadgeText: { color: Colors.onPrimary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.xs, letterSpacing: Typography.metrics.letterSpacing07 },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: Radii.full, backgroundColor: Colors.backgroundSecondary },
  progressFill: { height: '100%', borderRadius: Radii.full, backgroundColor: Colors.primary },
  allowanceCopy: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.xs },
  allowanceMeta: { color: Colors.textMuted, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm },
  trust: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm, lineHeight: Typography.metrics.lineHeight18 },
  renewal: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.sm },
  billingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    borderRadius: Radii.md,
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
  },
  billingCopy: { flex: 1, gap: Spacing.values[2] },
  billingTitle: { color: Colors.text, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  billingBody: { color: Colors.textSecondary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm, lineHeight: Typography.metrics.lineHeight17 },
  error: { color: Colors.dangerText, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.sm, lineHeight: Typography.metrics.lineHeight18 },
  restore: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  restoreText: { color: Colors.primary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  pressed: { opacity: 0.68 },
});
