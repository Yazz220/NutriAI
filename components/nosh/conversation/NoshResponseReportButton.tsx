import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Flag } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { reportAiResponse } from '@/utils/cookbook/aiResponseReport';
import { Fonts } from '@/utils/fonts';

interface NoshResponseReportButtonProps {
  messageId: string;
  responseText: string;
  agentRequestId?: string;
  compact?: boolean;
}

export function NoshResponseReportButton({
  messageId,
  responseText,
  agentRequestId,
  compact = false,
}: NoshResponseReportButtonProps) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await reportAiResponse({
        messageId,
        responseText,
        ...(agentRequestId ? { agentRequestId } : {}),
      });
      Alert.alert('Report sent', 'Thanks. This response was sent privately for review.');
    } catch (error) {
      Alert.alert(
        'Could not send report',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = () => {
    Alert.alert(
      'Report this response?',
      'The response text will be sent privately to Nosh support for safety and quality review.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send report', onPress: () => { void submit(); } },
      ],
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Report this Nosh response"
      accessibilityState={{ disabled: submitting }}
      disabled={submitting}
      hitSlop={8}
      onPress={confirm}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Flag size={14} color={Colors.textSecondary} />
      {compact ? null : <Text style={styles.label}>{submitting ? 'Sending...' : 'Report'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[4],
    minHeight: 32,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  pressed: { opacity: 0.65 },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight16,
    fontFamily: Fonts.ui.medium,
  },
});
