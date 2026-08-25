import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, History, MessageSquarePlus } from 'lucide-react-native';
import { useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export function NoshHeaderIdentity({ contextLabel, showingHistory }: { contextLabel: string; showingHistory: boolean }) {
  const sessionTitle = useAuiState((state) => state.threadListItem.title);
  return (
    <View style={styles.identity}>
      <Text style={styles.eyebrow} numberOfLines={1} accessibilityLabel={`Nosh focused on ${contextLabel}`}>
        {showingHistory ? 'Nosh · conversations' : `Nosh · ${contextLabel}`}
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {showingHistory ? 'History' : sessionTitle || 'New conversation'}
      </Text>
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
      <Pressable
        onPress={onToggleHistory}
        style={styles.action}
        accessibilityRole="button"
        accessibilityLabel={showingHistory ? 'Back to current conversation' : 'Open conversation history'}
      >
        {showingHistory ? <ArrowLeft size={18} color={Colors.text} /> : <History size={18} color={Colors.text} />}
      </Pressable>
      <Pressable
        onPress={onNewConversation}
        disabled={isRunning}
        style={[styles.action, isRunning && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Start a new conversation"
        accessibilityState={{ disabled: isRunning }}
      >
        <MessageSquarePlus size={18} color={Colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flex: 1 },
  eyebrow: { color: Colors.textMuted, fontSize: Typography.sizes.md, fontFamily: Fonts.ui.medium },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.xl, },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  action: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white },
  disabled: { opacity: 0.4 },
});
