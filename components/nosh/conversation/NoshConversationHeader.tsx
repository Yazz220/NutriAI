import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { History, MessageSquarePlus } from 'lucide-react-native';
import { useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

export function NoshHeaderIdentity({ contextLabel, showingHistory }: { contextLabel: string; showingHistory: boolean }) {
  const sessionTitle = useAuiState((state) => state.threadListItem.title);
  return (
    <View style={styles.identity}>
      <Text variant="h3" style={styles.title} numberOfLines={1}>
        {showingHistory ? 'Conversations' : sessionTitle || 'New conversation'}
      </Text>
      {!showingHistory ? (
        <Text
          variant="bodySmall"
          style={styles.context}
          numberOfLines={1}
          accessibilityLabel={`Folio focused on ${contextLabel}`}
        >
          {contextLabel}
        </Text>
      ) : null}
    </View>
  );
}

export function NoshHeaderActions({ showingHistory, onToggleHistory, onNewConversation }: {
  showingHistory: boolean;
  onToggleHistory: () => void;
  onNewConversation: () => void;
}) {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  return (
    <View style={styles.actions}>
      {!showingHistory ? (
        <Pressable
          onPress={onToggleHistory}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open conversation history"
        >
          <History size={19} color={Colors.textSecondary} strokeWidth={1.8} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onNewConversation}
        disabled={isRunning}
        style={({ pressed }) => [styles.action, isRunning && styles.disabled, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Start a new conversation"
        accessibilityState={{ disabled: isRunning }}
      >
        <MessageSquarePlus size={19} color={Colors.textSecondary} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flex: 1, gap: Spacing.values[2] },
  title: { color: Colors.text },
  context: { color: Colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.55, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
});
