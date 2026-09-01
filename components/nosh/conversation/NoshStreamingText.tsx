import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuiState } from '@assistant-ui/react-native';
import Reanimated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { NoshActivityDots } from './NoshActivityDots';
import { parseNoshResponseBlocks } from './noshResponseFormatting';

const RESPONSE_ENTER_DURATION_MS = 140;

export function NoshThinkingIndicator() {
  const isRunning = useAuiState((state) => state.message.status?.type === 'running');

  if (!isRunning) return null;

  return (
    <View
      style={styles.thinking}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Folio is thinking"
    >
      <NoshActivityDots />
    </View>
  );
}

export function NoshStreamingText({ text }: { text: string }) {
  const isRunning = useAuiState((state) => state.message.status?.type === 'running');
  const reduceMotion = useReducedMotion();
  const blocks = React.useMemo(() => parseNoshResponseBlocks(text), [text]);

  return (
    <Reanimated.View
      entering={isRunning && !reduceMotion
        ? FadeIn.duration(RESPONSE_ENTER_DURATION_MS)
        : undefined}
      style={styles.response}
    >
      {blocks.map((block, index) => block.kind === 'bullet' ? (
        <View key={`${block.kind}-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletMark} accessibilityElementsHidden>•</Text>
          <Text style={styles.text}>{block.text}</Text>
        </View>
      ) : (
        <Text key={`${block.kind}-${index}`} style={styles.text}>{block.text}</Text>
      ))}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  response: {
    gap: Spacing.values[10],
  },
  text: {
    flexShrink: 1,
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.metrics.lineHeight24,
    fontFamily: Fonts.ui.regular,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bulletMark: {
    width: Spacing.sm,
    color: Colors.primary,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.metrics.lineHeight24,
    fontFamily: Fonts.ui.medium,
  },
  thinking: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[4],
    paddingVertical: Spacing.values[6],
  },
});
