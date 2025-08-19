import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Brain } from 'lucide-react-native';
import { useChefChat } from '@/hooks/useChefChat';
import { StructuredMessage } from '@/components/StructuredMessage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

// A dedicated chat interface for the Recipes tab that leverages the same
// AI meal-planning logic as the Coach page. Dark-theme, high-contrast
// styling aligned with the global design tokens.

export const RecipeChatInterface: React.FC = () => {
  const { messages, sendMessage, performInlineAction, isTyping } = useChefChat('');
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Quick chat chips removed per request

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const TAB_BAR_HEIGHT = 56;
  const TAB_BAR_OFFSET = 12;
  const composerBottomOffset = TAB_BAR_HEIGHT + TAB_BAR_OFFSET + Math.max(insets.bottom, 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Header aligned with Coach */}
      <ScreenHeader title="AI Chef" icon={<Brain size={28} color={Colors.text} />} />

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{
          padding: Spacing.lg,
          // Ensure last messages are never hidden behind chips/composer/tab bar
          paddingBottom: Spacing.lg + 64 /* composer est. */ + composerBottomOffset,
        }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {/* Initial greeting bubble if empty */}
        {messages.length === 0 && (
          <View style={[styles.bubble, styles.bubbleAI]}
          >
            <Text style={styles.bubbleText}>
              Hello! I'm Chef AI, your personal cooking assistant! I'm here to help you discover amazing meals and recipes. What kind of culinary adventure are you in the mood for today?
            </Text>
            <Text style={styles.bubbleMeta}>Just now</Text>
          </View>
        )}

        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
            {m.structuredData ? (
              <StructuredMessage data={m.structuredData} />
            ) : (
              !!m.text && (
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextOnPrimary]}>
                  {m.text}
                </Text>
              )
            )}
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.bubbleText}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick chips removed */}

      {/* Composer */}
      <View style={[
        styles.composer,
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: composerBottomOffset,
          zIndex: 100,
          // keep comfortable touch target spacing inside
          paddingBottom: Spacing.lg,
        },
      ]}>
        <TextInput
          style={styles.input}
          placeholder="Ask your AI Chef for meal ideas…"
          placeholderTextColor={Colors.lightText}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
  messages: {
    flex: 1,
  },
  bubble: {
    maxWidth: '90%',
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  bubbleText: {
    color: Colors.text,
  },
  bubbleTextOnPrimary: {
    color: Colors.white,
  },
  bubbleMeta: {
    marginTop: 4,
    color: Colors.lightText,
    fontSize: Typography.sizes.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
  },
  actionBtnText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  chipsBar: {
    // removed
  },
  chip: {
    // removed
  },
  chipText: {
    // removed
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.card,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.text,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sendText: { color: Colors.primary, fontWeight: '600' },
});

export default RecipeChatInterface;
