import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, History, MessageSquarePlus } from 'lucide-react-native';
import { useAuiState } from '@assistant-ui/react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

export function NoshHeaderIdentity({ contextLabel, showingHistory }: { contextLabel: string; showingHistory: boolean }) {
  const sessionTitle = useAuiState((state) => state.threadListItem.title);
  return (
    <View style={styles.identityRow}>
      <View style={styles.mark} accessibilityElementsHidden>
        <NoshSymbol size={32} />
      </View>
      <View style={styles.identity}>
        <Text variant="overline" style={styles.eyebrow} numberOfLines={1} accessibilityLabel={`Nosh focused on ${contextLabel}`}>
          {showingHistory ? 'Nosh · conversations' : `Nosh · ${contextLabel}`}
        </Text>
        <Text variant="h3" style={styles.title} numberOfLines={1}>
          {showingHistory ? 'History' : sessionTitle || 'New conversation'}
        </Text>
      </View>
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
  identityRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mark: { width: 36, alignItems: 'center' },
  identity: { flex: 1 },
  eyebrow: { color: Colors.textMuted },
  title: { color: Colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  action: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white },
  disabled: { opacity: 0.4 },
});
