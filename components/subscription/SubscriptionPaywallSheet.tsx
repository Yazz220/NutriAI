import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BookOpen, Check, LibraryBig } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { SubscriptionPackage } from '@/types/subscription';
import { Fonts } from '@/utils/fonts';
import { SubscriptionStatusSkeleton } from './SubscriptionStatusSkeleton';
import type { PaywallReason } from './SubscriptionHost';

interface SubscriptionPaywallSheetProps {
  visible: boolean;
  reason: PaywallReason;
  packages: SubscriptionPackage[];
  offeringsStatus: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
  purchaseState: 'idle' | 'purchasing' | 'restoring' | 'syncing';
  error: string | null;
  onClose: () => void;
  onPurchase: (packageId: 'monthly' | 'annual') => void;
  onRestore: () => void;
  onRetryOfferings: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

const REASON_COPY: Record<PaywallReason, { title: string; body: string }> = {
  settings: {
    title: 'More room for your recipes.',
    body: 'Create up to 20 beautifully designed recipe pages each month, with as many cookbooks as you like.',
  },
  page_capture: {
    title: 'Keep filling your cookbooks.',
    body: 'You have used the page creations included with Folio Free. Folio Plus includes 20 each month.',
  },
  cookbook_limit: {
    title: 'Start another cookbook.',
    body: 'Folio Plus gives every part of your recipe collection room to grow.',
  },
  recipe_revision: {
    title: 'Save the next edition.',
    body: 'Folio Plus includes 20 designed page creations each month for new recipes and saved changes.',
  },
  page_redesign: {
    title: 'Try a fresh page design.',
    body: 'Folio Plus includes 20 designed page creations each month, including replacement designs.',
  },
  agent_capture: {
    title: 'Keep filling your cookbooks.',
    body: 'Folio Plus includes 20 designed page creations each month and keeps the same helpful chef alongside them.',
  },
  agent_recipe_save: {
    title: 'Save this recipe change.',
    body: 'Folio Plus includes 20 designed page creations each month for saved updates and copies.',
  },
  agent_artwork: {
    title: 'Create the next design.',
    body: 'Folio Plus includes 20 designed page creations each month, including artwork previews.',
  },
  native_share: {
    title: 'Bring this recipe into Folio.',
    body: 'Your shared source is still here. Folio Plus includes 20 designed page creations each month.',
  },
};

export function SubscriptionPaywallSheet({
  visible,
  reason,
  packages,
  offeringsStatus,
  purchaseState,
  error,
  onClose,
  onPurchase,
  onRestore,
  onRetryOfferings,
  onOpenTerms,
  onOpenPrivacy,
}: SubscriptionPaywallSheetProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<'monthly' | 'annual'>('annual');
  const busy = purchaseState !== 'idle';
  const orderedPackages = useMemo(() => (
    [...packages].sort((left, right) => left.id === 'annual' ? -1 : right.id === 'annual' ? 1 : 0)
  ), [packages]);

  useEffect(() => {
    if (!visible) return;
    setSelectedId(packages.some((item) => item.id === 'annual') ? 'annual' : 'monthly');
  }, [packages, visible]);

  const selected = packages.find((item) => item.id === selectedId) ?? packages[0];
  const selectedOfferCopy = selected?.introOffer ? introOfferCopy(selected.introOffer) : null;
  const annual = packages.find((item) => item.id === 'annual');
  const monthly = packages.find((item) => item.id === 'monthly');
  const savings = annual && monthly && monthly.price > 0
    ? Math.max(0, Math.round((1 - annual.price / (monthly.price * 12)) * 100))
    : 0;
  const copy = REASON_COPY[reason];

  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => undefined : onClose}
      maxHeight="94%"
      closeAccessibilityLabel="Close Folio Plus"
      header={
        <View style={styles.sheetHeader}>
          <View style={styles.brandBadge} accessibilityElementsHidden>
            <NoshSymbol size={25} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>NOSH PLUS</Text>
            <Text style={styles.headerTitle}>Subscription</Text>
          </View>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
        </View>

        <View style={styles.benefits}>
          <Benefit icon={<BookOpen size={18} color={Colors.primary} />} copy="20 designed page creations each month" />
          <Benefit icon={<LibraryBig size={18} color={Colors.primary} />} copy="Unlimited cookbooks" />
        </View>

        <Text style={styles.trust}>Your existing recipes remain yours if you cancel.</Text>

        {offeringsStatus === 'loading' || offeringsStatus === 'idle' ? (
          <SubscriptionStatusSkeleton />
        ) : offeringsStatus === 'ready' && orderedPackages.length > 0 ? (
          <View style={styles.options} accessibilityRole="radiogroup">
            {orderedPackages.map((item) => (
              <PackageOption
                key={item.id}
                item={item}
                selected={item.id === selected?.id}
                savings={item.id === 'annual' ? savings : 0}
                monthlyEquivalent={item.id === 'annual' && item.price > 0
                  ? formatMonthlyEquivalent(item)
                  : null}
                disabled={busy}
                onPress={() => setSelectedId(item.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.unavailable} accessibilityRole="alert">
            <Text style={styles.unavailableTitle}>Plans are unavailable right now</Text>
            <Text style={styles.unavailableCopy}>Check your connection and try again.</Text>
            <Button
              title="Try loading plans again"
              variant="secondary"
              onPress={onRetryOfferings}
              fullWidth
            />
          </View>
        )}

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        {selected && offeringsStatus === 'ready' ? (
          <Button
            title={purchaseState === 'syncing'
              ? 'Finishing setup…'
              : selectedOfferCopy
                ? `Start ${selectedOfferCopy}`
                : `Subscribe for ${selected.localizedPrice}/${selected.id === 'annual' ? 'year' : 'month'}`}
            onPress={() => onPurchase(selected.id)}
            fullWidth
            size="lg"
            loading={purchaseState === 'purchasing' || purchaseState === 'syncing'}
            disabled={busy}
            accessibilityHint="Completes your subscription through the App Store"
          />
        ) : null}

        {purchaseState === 'restoring' ? (
          <View style={styles.restoring} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.restoringCopy}>Checking App Store purchases…</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
            onPress={onRestore}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Restore App Store purchases"
            accessibilityState={{ disabled: busy }}
          >
            <Text style={styles.textActionCopy}>Restore purchases</Text>
          </Pressable>
        )}

        <Text style={styles.disclosure}>
          {selected && selectedOfferCopy
            ? `Your eligible offer is ${selectedOfferCopy}. After the offer, your Apple Account is charged ${selected.localizedPrice}/${selected.id === 'annual' ? 'year' : 'month'}, and the subscription renews automatically unless canceled at least 24 hours before the end of the current period.`
            : 'Payment is charged to your Apple Account. Your subscription renews automatically unless canceled at least 24 hours before the end of the current period.'}
        </Text>

        <View style={styles.legalLinks}>
          <Pressable onPress={onOpenTerms} accessibilityRole="link" style={styles.legalLink}>
            <Text style={styles.legalLinkCopy}>Terms of Use</Text>
          </Pressable>
          <Pressable onPress={onOpenPrivacy} accessibilityRole="link" style={styles.legalLink}>
            <Text style={styles.legalLinkCopy}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}

function Benefit({ icon, copy }: { icon: React.ReactNode; copy: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>{icon}</View>
      <Text style={styles.benefitCopy}>{copy}</Text>
      <Check size={16} color={Colors.primary} />
    </View>
  );
}

function PackageOption({
  item,
  selected,
  savings,
  monthlyEquivalent,
  disabled,
  onPress,
}: {
  item: SubscriptionPackage;
  selected: boolean;
  savings: number;
  monthlyEquivalent: string | null;
  disabled: boolean;
  onPress: () => void;
}) {
  const label = item.id === 'annual' ? 'Yearly' : 'Monthly';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.package,
        selected && styles.packageSelected,
        disabled && styles.disabled,
        pressed && !disabled && styles.packagePressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${label}, ${item.localizedPrice} per ${item.id === 'annual' ? 'year' : 'month'}${savings ? `, save ${savings} percent` : ''}${item.introOffer ? `, ${introOfferCopy(item.introOffer)}` : ''}`}
    >
      <View style={styles.packageCopy}>
        <View style={styles.packageHeading}>
          <Text style={styles.packageTitle}>{label}</Text>
          {savings > 0 ? (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsCopy}>SAVE {savings}%</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.packagePrice}>{item.localizedPrice}/{item.id === 'annual' ? 'year' : 'month'}</Text>
        {monthlyEquivalent ? <Text style={styles.packageMeta}>{monthlyEquivalent}</Text> : null}
        {item.introOffer ? (
          <Text style={styles.packageMeta}>{introOfferCopy(item.introOffer)}</Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

function introOfferCopy(offer: NonNullable<SubscriptionPackage['introOffer']>) {
  const unitsPerCycle = Math.max(1, offer.periodNumberOfUnits);
  const cycles = Math.max(1, offer.cycles);
  const totalUnits = unitsPerCycle * cycles;
  const unit = offer.periodUnit.trim().toLowerCase() || 'period';
  const duration = formatDuration(totalUnits, unit);

  if (offer.price === 0) return `${duration} free`;
  if (cycles === 1) return `${offer.localizedPrice} for ${duration}`;

  const cadence = unitsPerCycle === 1
    ? `each ${unit}`
    : `every ${formatDuration(unitsPerCycle, unit)}`;
  return `${offer.localizedPrice} ${cadence} for ${duration}`;
}

function formatDuration(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

function formatMonthlyEquivalent(item: SubscriptionPackage) {
  if (item.localizedPricePerMonth) return `${item.localizedPricePerMonth} per month`;
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: item.currencyCode,
      maximumFractionDigits: 2,
    });
    return `${formatter.format(item.price / 12)} per month`;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  sheetHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: Spacing.values[2] },
  eyebrow: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight12,
    letterSpacing: Typography.metrics.letterSpacing14,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlMd,
    lineHeight: Typography.metrics.lineHeight29,
  },
  scroll: { flexShrink: 1 },
  content: { gap: Spacing.lg },
  hero: { gap: Spacing.sm },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxxlPlus,
    lineHeight: Typography.metrics.lineHeight34,
  },
  body: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.mdPlus,
    lineHeight: Typography.metrics.lineHeight22,
  },
  benefits: { gap: Spacing.xs },
  benefit: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  benefitIcon: { width: 24, alignItems: 'center' },
  benefitCopy: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  trust: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
  },
  options: { gap: Spacing.sm },
  package: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  packageSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.book.accentSoft,
  },
  packagePressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  packageCopy: { flex: 1, gap: Spacing.values[3] },
  packageHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  packageTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.mdPlus,
  },
  packagePrice: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xlPlus,
    lineHeight: Typography.metrics.lineHeight27,
  },
  packageMeta: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
  },
  savingsBadge: {
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.values[3],
  },
  savingsCopy: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.metrics.letterSpacing07,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: Radii.full, backgroundColor: Colors.primary },
  unavailable: {
    gap: Spacing.xs,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.parchment,
    padding: Spacing.lg,
  },
  unavailableTitle: { color: Colors.text, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  unavailableCopy: { color: Colors.textSecondary, fontSize: Typography.sizes.md },
  error: {
    color: Colors.dangerText,
    backgroundColor: Colors.errorLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  textAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textActionCopy: { color: Colors.primary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  restoring: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  restoringCopy: { color: Colors.textSecondary, fontSize: Typography.sizes.md },
  disclosure: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
    textAlign: 'center',
  },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: Spacing.lg },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalLinkCopy: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.sm },
  disabled: { opacity: Colors.state.disabledOpacity },
  pressed: { opacity: 0.68 },
});
