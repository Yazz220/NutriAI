import React from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { NoshActivityDots } from './NoshActivityDots';

const ENTER_DURATION_MS = 140;
const EXIT_DURATION_MS = 100;

export function NoshToolActivity({
  icon,
  label,
  detail,
  running = false,
  error = false,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  running?: boolean;
  error?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeIn.duration(ENTER_DURATION_MS)}
      exiting={reduceMotion ? undefined : FadeOut.duration(EXIT_DURATION_MS)}
      style={styles.row}
      accessible
      accessibilityRole={error ? 'alert' : running ? 'progressbar' : 'text'}
      accessibilityLabel={[label, detail].filter(Boolean).join('. ')}
      accessibilityState={{ busy: running }}
      accessibilityLiveRegion={error ? 'assertive' : 'polite'}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <Text style={[styles.label, error && styles.error]}>{label}</Text>
        {detail ? <Text style={[styles.detail, error && styles.errorDetail]}>{detail}</Text> : null}
      </View>
      {running ? <NoshActivityDots color={Colors.primary} size={5} /> : null}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.values[4],
    marginVertical: Spacing.values[2],
  },
  icon: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  label: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.smPlus,
    lineHeight: Typography.metrics.lineHeight18,
  },
  detail: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
  },
  error: {
    color: Colors.error,
  },
  errorDetail: {
    color: Colors.textSecondary,
  },
});
