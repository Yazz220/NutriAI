import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuiIf, ThreadPrimitive } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { getNoshStartConfig } from './noshConversationPresentation';

export function NoshConversationStart({
  interaction,
  contextModelEnabled,
}: {
  interaction: NoshInteractionSession;
  contextModelEnabled: boolean;
}) {
  const { close } = useNoshConversation();
  const config = getNoshStartConfig(interaction, contextModelEnabled);
  return (
    <AuiIf condition={(state) => state.thread.isEmpty}>
      <View style={styles.container}>
        <Text style={styles.title}>{config.title}</Text>
        <View style={styles.actions}>
          {config.prompts.map((prompt) => prompt === 'Save or check a recipe' ? (
            <Pressable
              key={prompt}
              style={styles.action}
              accessibilityRole="button"
              accessibilityLabel={prompt}
              onPress={() => {
                close();
                router.push('/(book)/save');
              }}
            >
              <Text style={styles.actionText}>{prompt}</Text>
            </Pressable>
          ) : (
            <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send style={styles.action} accessibilityLabel={prompt}>
              <Text style={styles.actionText}>{prompt}</Text>
            </ThreadPrimitive.Suggestion>
          ))}
        </View>
      </View>
    </AuiIf>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs, paddingVertical: Spacing.sm },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.md, },
  copy: { color: Colors.textSecondary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight19, maxWidth: 390 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingTop: Spacing.xs },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
});
