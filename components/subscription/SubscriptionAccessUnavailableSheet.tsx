import { StyleSheet, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export function SubscriptionAccessUnavailableSheet({
  visible,
  refreshing,
  onClose,
  onRetry,
}: {
  visible: boolean;
  refreshing: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={refreshing ? () => undefined : onClose}
      closeAccessibilityLabel="Close plan check"
      header={
        <View style={styles.header}>
          <View style={styles.icon} accessibilityElementsHidden>
            <WifiOff size={20} color={Colors.textSecondary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>YOUR PLAN</Text>
            <Text style={styles.title}>Could not check your plan</Text>
          </View>
        </View>
      }
    >
      <Text style={styles.body}>
        Your recipe is still here. Check your connection, then try again before creating the page.
      </Text>
      <Button title="Try again" onPress={onRetry} loading={refreshing} fullWidth size="lg" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
  },
  headerCopy: { flex: 1, gap: Spacing.values[2] },
  eyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
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
});
