import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { Fonts } from '@/utils/fonts';
import { useSubscriptionUi } from './SubscriptionHost';

export function PageAllowanceStatus({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const { access, isLoading } = useNoshSubscription();
  const { openPaywall } = useSubscriptionUi();
  const allowance = access?.features.designedPages;
  const tier = access?.planId;

  if (isLoading || !allowance || !tier) return null;
  const remaining = allowance.remaining ?? 0;
  if (!alwaysShow && tier === 'plus' && remaining > 5) return null;

  const copy = tier === 'free'
    ? `Nosh Free · ${remaining} ${remaining === 1 ? 'page creation' : 'page creations'} left`
    : `Nosh Plus · ${remaining} ${remaining === 1 ? 'page creation' : 'page creations'} left this month`;

  const content = (
    <>
      <View style={[styles.dot, tier === 'plus' && styles.plusDot]} />
      <Text style={styles.copy}>{copy}</Text>
      {tier === 'free' ? <ChevronRight size={15} color={Colors.textMuted} /> : null}
    </>
  );

  if (tier === 'plus') {
    return <View style={styles.row} accessible accessibilityLabel={copy}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => { void openPaywall('settings'); }}
      accessibilityRole="button"
      accessibilityLabel={`${copy}. View plan`}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.coral,
  },
  plusDot: { backgroundColor: Colors.primary },
  copy: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
  },
  pressed: {
    backgroundColor: Colors.alpha.primary[5],
    opacity: 0.78,
  },
});
