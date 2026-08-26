import React from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Camera, Check, ChefHat, Copy as CopyIcon, RefreshCw } from 'lucide-react-native';
import {
  ActionBarPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { NoshComposer } from './NoshComposer';
import { NoshConversationStart } from './NoshConversationStart';
import { NoshResponseReportButton } from './NoshResponseReportButton';
import { NoshStreamingText } from './NoshStreamingText';

function UserMessage() {
  return (
    <MessagePrimitive.Root style={styles.userRow}>
      <View style={styles.userBubble}>
        <MessagePrimitive.Attachments>
          {({ attachment }) => (
            <View style={styles.userAttachment}>
              <Camera size={13} color={Colors.onPrimary} />
              <Text style={styles.userAttachmentText}>{attachment.name || 'Recipe photo'}</Text>
            </View>
          )}
        </MessagePrimitive.Attachments>
        <MessagePrimitive.Parts components={USER_MESSAGE_PARTS} />
      </View>
    </MessagePrimitive.Root>
  );
}

function UserText({ text }: { text: string }) {
  return <Text style={styles.userText}>{text}</Text>;
}

const USER_MESSAGE_PARTS = { Text: UserText };
const ASSISTANT_MESSAGE_PARTS = { Text: NoshStreamingText };

function CompletedAssistantActions() {
  const messageId = useAuiState((state) => state.message.id);
  const responseText = useAuiState((state) => state.message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim());
  const agentRequestId = useAuiState((state) => {
    const value = state.message.metadata.custom?.noshAgentRequestId;
    return typeof value === 'string' ? value : undefined;
  });
  if (!responseText) return null;

  return (
    <View style={styles.actionBar}>
      <ActionBarPrimitive.Copy
        accessibilityRole="button"
        accessibilityLabel="Copy Nosh response"
        hitSlop={8}
        copyToClipboard={async (text) => { await Clipboard.setStringAsync(text); }}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      >
        {({ isCopied }) => isCopied
          ? <Check size={14} color={Colors.success} />
          : <CopyIcon size={14} color={Colors.textSecondary} />}
      </ActionBarPrimitive.Copy>
      <NoshResponseReportButton
        compact
        messageId={messageId}
        responseText={responseText}
        agentRequestId={agentRequestId}
      />
    </View>
  );
}

function AssistantMessage() {
  const statusType = useAuiState((state) => state.message.status?.type);
  const hasText = useAuiState((state) => state.message.content.some((part) => (
    part.type === 'text' && part.text.length > 0
  )));
  const isRunning = statusType === 'running';
  return (
    <MessagePrimitive.Root style={styles.assistantRow}>
      <View style={styles.avatar}><ChefHat size={15} color={Colors.onPrimary} /></View>
      <View style={styles.assistantBubble}>
        <MessagePrimitive.Parts components={ASSISTANT_MESSAGE_PARTS} />
        {isRunning && !hasText ? (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            accessibilityLabel="Nosh is responding"
          />
        ) : null}
        <ErrorPrimitive.Root style={styles.errorCard} accessibilityRole="alert">
          <ErrorPrimitive.Message style={styles.errorText}>
            Nosh could not finish that response. Your message is still here.
          </ErrorPrimitive.Message>
          <ActionBarPrimitive.Reload
            accessibilityRole="button"
            accessibilityLabel="Try the Nosh response again"
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <RefreshCw size={14} color={Colors.error} />
            <Text style={styles.retryText}>Try again</Text>
          </ActionBarPrimitive.Reload>
        </ErrorPrimitive.Root>
        {statusType === 'complete' && hasText ? <CompletedAssistantActions /> : null}
      </View>
    </MessagePrimitive.Root>
  );
}

export function NoshConversationDisplay({ interaction, contextModelEnabled, sendDisabled = false }: {
  interaction: NoshInteractionSession;
  contextModelEnabled: boolean;
  sendDisabled?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.messagesArea} onPress={Keyboard.dismiss}>
        <ThreadPrimitive.MessagesFlatList autoScroll contentContainerStyle={styles.messagesContent} style={styles.messagesList} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" components={{ UserMessage, AssistantMessage }} />
        {sendDisabled ? null : (
          <NoshConversationStart interaction={interaction} contextModelEnabled={contextModelEnabled} />
        )}
      </Pressable>
      {sendDisabled ? (
        <View style={styles.contextLoading} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.contextLoadingText}>Loading this recipe for Nosh…</Text>
        </View>
      ) : null}
      <NoshComposer
        interaction={interaction}
        contextModelEnabled={contextModelEnabled}
        sendDisabled={sendDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.sm }, messagesArea: { flex: 1, gap: Spacing.sm }, messagesList: { flex: 1, minHeight: 220 }, messagesContent: { gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.values[2] },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' }, userBubble: { maxWidth: '86%', gap: Spacing.xs, borderRadius: Radii.lg, borderBottomRightRadius: Radii.sm, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }, userText: { color: Colors.onPrimary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, fontFamily: Fonts.ui.regular },
  userAttachment: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[4] },
  userAttachmentText: { color: Colors.onPrimary, fontSize: Typography.sizes.xs, fontFamily: Fonts.ui.medium },
  assistantRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }, avatar: { width: 28, height: 28, borderRadius: Radii.numeric[14], alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, marginTop: Spacing.values[2] }, assistantBubble: { flex: 1, maxWidth: '88%', borderRadius: Radii.lg, borderBottomLeftRadius: Radii.sm, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.ash, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[2], marginTop: Spacing.values[2] },
  actionButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full },
  errorCard: { gap: Spacing.xs, marginTop: Spacing.xs, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.error, backgroundColor: Colors.errorLight, padding: Spacing.sm },
  errorText: { color: Colors.text, fontSize: Typography.sizes.sm, lineHeight: Typography.metrics.lineHeight18, fontFamily: Fonts.ui.regular },
  retryButton: { alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  retryText: { color: Colors.error, fontSize: Typography.sizes.sm, fontFamily: Fonts.ui.medium },
  pressed: { opacity: 0.65 },
  contextLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  contextLoadingText: { color: Colors.textMuted, fontSize: Typography.sizes.sm, fontFamily: Fonts.ui.regular },
});
