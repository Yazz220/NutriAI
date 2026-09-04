import React from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy as CopyIcon, Paperclip, RefreshCw } from 'lucide-react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import {
  ActionBarPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { NoshComposer } from './NoshComposer';
import { NoshActivityDots } from './NoshActivityDots';
import { NoshConversationStart } from './NoshConversationStart';
import { getNoshContextNote } from './noshConversationPresentation';
import { NoshResponseReportButton } from './NoshResponseReportButton';
import { NoshStreamingText, NoshThinkingIndicator } from './NoshStreamingText';

function UserMessage() {
  return (
    <MessagePrimitive.Root style={styles.userRow}>
      <View style={styles.userBubble}>
        <MessagePrimitive.Attachments>
          {({ attachment }) => (
            <View style={styles.userAttachment}>
              <Paperclip size={13} color={Colors.onPrimary} />
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
const ASSISTANT_MESSAGE_PARTS = {
  Text: NoshStreamingText,
  Empty: NoshThinkingIndicator,
};

function CompletedAssistantActions() {
  const reduceMotion = useReducedMotion();
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
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(140)}
      style={styles.actionBar}
    >
      <ActionBarPrimitive.Copy
        accessibilityRole="button"
        accessibilityLabel="Copy Folio response"
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
    </Animated.View>
  );
}

function AssistantMessage() {
  const statusType = useAuiState((state) => state.message.status?.type);
  const hasText = useAuiState((state) => state.message.content.some((part) => (
    part.type === 'text' && part.text.length > 0
  )));
  return (
    <MessagePrimitive.Root style={styles.assistantRow}>
      <View style={styles.avatar} accessibilityElementsHidden><NoshSymbol size={22} /></View>
      <View style={styles.assistantBubble}>
        <MessagePrimitive.Parts components={ASSISTANT_MESSAGE_PARTS} />
        <ErrorPrimitive.Root style={styles.errorRow} accessibilityRole="alert">
          <ErrorPrimitive.Message style={styles.errorText}>
            Folio couldn’t finish that response.
          </ErrorPrimitive.Message>
          <ActionBarPrimitive.Reload
            accessibilityRole="button"
            accessibilityLabel="Try the Folio response again"
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

export function NoshConversationDisplay({ interaction, sendDisabled = false }: {
  interaction: NoshInteractionSession;
  sendDisabled?: boolean;
}) {
  const contextNote = getNoshContextNote(interaction);
  return (
    <View style={styles.container}>
      {contextNote ? (
        <View style={styles.contextNote} accessible accessibilityLabel={contextNote}>
          <View style={styles.contextDot} />
          <Text style={styles.contextNoteText} numberOfLines={1}>{contextNote}</Text>
        </View>
      ) : null}
      <Pressable style={styles.messagesArea} onPress={Keyboard.dismiss}>
        <ThreadPrimitive.MessagesFlatList autoScroll contentContainerStyle={styles.messagesContent} style={styles.messagesList} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" components={{ UserMessage, AssistantMessage }} />
        <NoshConversationStart interaction={interaction} disabled={sendDisabled} />
      </Pressable>
      {sendDisabled ? (
        <View style={styles.contextLoading} accessibilityRole="progressbar">
          <NoshActivityDots size={5} />
          <Text style={styles.contextLoadingText}>Loading this recipe for Folio…</Text>
        </View>
      ) : null}
      <NoshComposer
        interaction={interaction}
        sendDisabled={sendDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.sm }, messagesArea: { flex: 1, gap: Spacing.sm }, messagesList: { flex: 1, minHeight: 220 }, messagesContent: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.values[2] },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' }, userBubble: { maxWidth: '86%', gap: Spacing.xs, borderRadius: Radii.lg, borderBottomRightRadius: Radii.sm, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }, userText: { color: Colors.onPrimary, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight20, fontFamily: Fonts.ui.regular },
  userAttachment: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[4] },
  userAttachmentText: { color: Colors.onPrimary, fontSize: Typography.sizes.xs, fontFamily: Fonts.ui.medium },
  assistantRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }, avatar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.values[2] }, assistantBubble: { flex: 1, maxWidth: '88%', paddingHorizontal: Spacing.values[2], paddingVertical: Spacing.sm },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[2], marginTop: Spacing.values[2] },
  actionButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full },
  errorRow: { gap: Spacing.values[2], marginTop: Spacing.xs, paddingVertical: Spacing.values[2] },
  errorText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, lineHeight: Typography.metrics.lineHeight18, fontFamily: Fonts.ui.regular },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  retryText: { color: Colors.error, fontSize: Typography.sizes.sm, fontFamily: Fonts.ui.medium },
  pressed: { opacity: 0.65 },
  contextLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  contextLoadingText: { color: Colors.textMuted, fontSize: Typography.sizes.sm, fontFamily: Fonts.ui.regular },
  contextNote: {
    minHeight: 32,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.values[4],
  },
  contextDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  contextNoteText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, fontFamily: Fonts.ui.medium },
});
