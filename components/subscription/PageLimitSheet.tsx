import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export function PageLimitSheet({
  visible,
  limit,
  resetAt,
  onClose,
  onManage,
}: {
  visible: boolean;
  limit: number;
  resetAt: string | null;
  onClose: () => void;
  onManage: () => void;
}) {
  const insets = useSafeAreaInsets();
  const resetCopy = resetAt ? `Your allowance refreshes ${formatDate(resetAt)}.` : 'Your allowance will refresh with your next plan period.';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      closeAccessibilityLabel="Close page allowance"
      header={
        <View style={styles.header}>
          <View style={styles.icon} accessibilityElementsHidden>
            <CalendarClock size={21} color={Colors.warning} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>NOSH PLUS</Text>
            <Text style={styles.title}>More pages are coming</Text>
          </View>
        </View>
      }
    >
      <Text style={styles.body}>
        You have used all {limit} page creations for this period. {resetCopy}
      </Text>
      <Button title="Done" onPress={onClose} fullWidth size="lg" />
      <Pressable
        style={({ pressed }) => [styles.manage, pressed && styles.pressed]}
        onPress={onManage}
        accessibilityRole="button"
        accessibilityLabel="Manage Nosh Plus subscription"
      >
        <Text style={styles.manageCopy}>Manage subscription</Text>
      </Pressable>
      <View style={{ height: insets.bottom }} />
    </Sheet>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'soon';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(date);
}

const styles = StyleSheet.create({
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.warningLight,
  },
  headerCopy: { flex: 1, gap: Spacing.values[2] },
  eyebrow: {
    color: Colors.warning,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight12,
    letterSpacing: Typography.metrics.letterSpacing14,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxlMd,
    lineHeight: Typography.metrics.lineHeight29,
  },
  body: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.mdPlus,
    lineHeight: Typography.metrics.lineHeight22,
  },
  manage: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  manageCopy: { color: Colors.primary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  pressed: { opacity: 0.68 },
});
