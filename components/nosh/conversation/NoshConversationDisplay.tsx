import React from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { MessagePrimitive, ThreadPrimitive, useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { NoshComposer } from './NoshComposer';
import { NoshConversationStart } from './NoshConversationStart';

function UserMessage() {
  return <View style={styles.userRow}><View style={styles.userBubble}><MessagePrimitive.Parts components={{ Text: ({ text }: { text: string }) => <Text style={styles.userText}>{text}</Text> }} /></View></View>;
}

function AssistantMessage() {
  const isRunning = useAuiState((state) => state.message.status?.type === 'running');
  const hasText = useAuiState((state) => state.message.content.some((part) => part.type === 'text' && part.text.length > 0));
  return <View style={styles.assistantRow}><View style={styles.avatar}><ChefHat size={15} color={Colors.onPrimary} /></View><View style={styles.assistantBubble}><MessagePrimitive.Parts components={{ Text: ({ text }: { text: string }) => <Text style={styles.assistantText}>{text}</Text> }} />{isRunning && !hasText ? <ActivityIndicator size="small" color={Colors.primary} accessibilityLabel="Nosh is responding" /> : null}</View></View>;
}

export function NoshConversationDisplay({ interaction, contextModelEnabled }: {
  interaction: NoshInteractionSession;
  contextModelEnabled: boolean;
}) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.messagesArea} onPress={Keyboard.dismiss}>
        <ThreadPrimitive.MessagesFlatList autoScroll contentContainerStyle={styles.messagesContent} style={styles.messagesList} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" components={{ UserMessage, AssistantMessage }} />
        <NoshConversationStart interaction={interaction} contextModelEnabled={contextModelEnabled} />
      </Pressable>
      <NoshComposer interaction={interaction} contextModelEnabled={contextModelEnabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.sm }, messagesArea: { flex: 1, gap: Spacing.sm }, messagesList: { flex: 1, minHeight: 220 }, messagesContent: { gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.values[2] },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' }, userBubble: { maxWidth: '86%', borderRadius: Radii.lg, borderBottomRightRadius: Radii.sm, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }, userText: { color: Colors.onPrimary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, fontFamily: Fonts.ui.regular },
  assistantRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }, avatar: { width: 28, height: 28, borderRadius: Radii.numeric[14], alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, marginTop: Spacing.values[2] }, assistantBubble: { flex: 1, maxWidth: '88%', borderRadius: Radii.lg, borderBottomLeftRadius: Radii.sm, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.ash, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }, assistantText: { color: Colors.text, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, fontFamily: Fonts.ui.regular },
});
