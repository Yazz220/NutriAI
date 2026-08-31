import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface StaleDataNoticeProps {
  onRefresh: () => void;
  subject: 'cookbooks' | 'cookbook';
}

export function StaleDataNotice({ onRefresh, subject }: StaleDataNoticeProps) {
  const detail = subject === 'cookbooks'
    ? 'You’re viewing the last saved version of your shelf.'
    : 'You’re viewing the last saved version of this book.';

  return (
    <View style={styles.notice} accessibilityRole="alert">
      <View style={styles.copy}>
        <Text style={styles.title}>Saved edition</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Pressable
        style={styles.refresh}
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel={`Refresh ${subject}`}
      >
        <RefreshCw size={14} color={Colors.text} />
        <Text style={styles.refreshLabel}>Refresh</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.honeyBronze,
    backgroundColor: Colors.parchment,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  copy: {
    flex: 1,
    gap: Spacing.values[1],
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
  },
  detail: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
  },
  refresh: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
  },
  refreshLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
});
