import { StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { Fonts } from '@/utils/fonts';

export function PageCreationDisclosure({ children }: { children: string }) {
  const { access } = useNoshSubscription();
  const remaining = access?.features.designedPages.remaining;
  const suffix = remaining == null
    ? ''
    : ` · ${remaining} ${remaining === 1 ? 'left' : 'left'}`;

  return (
    <Text style={styles.copy} accessibilityLabel={`${children}${suffix}`}>
      {children}{suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
  },
});
