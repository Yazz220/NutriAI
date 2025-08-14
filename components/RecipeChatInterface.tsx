import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Brain, Send } from 'lucide-react-native';
import { useCoachChat } from '@/hooks/useCoachChat';

// A dedicated chat interface for the Recipes tab that leverages the same
// AI meal-planning logic as the Coach page. Dark-theme, high-contrast
// styling aligned with the global design tokens.

export const RecipeChatInterface: React.FC = () => {
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const quickChips = useMemo(
    () => [
      'Breakfast Ideas',
      'Low Carb',
      '30-min Meals',
      'Vegetarian',
      'Comfort Food',
      'Healthy Snacks',
      'Dinner Tonight',
    ],
    []
  );

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Brain size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Meal Generator</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: Spacing.lg }}
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
            {!!m.text && <Text style={styles.bubbleText}>{m.text}</Text>}
            {!!m.summary && <Text style={styles.bubbleText}>{m.summary}</Text>}
            {/* Inline actions */}
            {!!m.actions && m.actions.length > 0 && (
              <View style={styles.actionsRow}>
                {m.actions.map((a, idx) => (
                  <TouchableOpacity
                    key={`${m.id}-a-${idx}`}
                    onPress={() => performInlineAction(a, m.meals)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.bubbleText}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick chips */}
      <ScrollView
        style={styles.chipsBar}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' }}
      >
        {quickChips.map((c) => (
          <TouchableOpacity key={c} style={styles.chip} onPress={() => sendMessage(c)}>
            <Text style={styles.chipText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Composer */}
      <View style={styles.composer}>
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
          <Send size={18} color={Colors.white} />
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    maxHeight: 56,
    flexGrow: 0,
  },
  chip: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    height: 36,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  chipText: {
    color: Colors.text,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.secondary,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

export default RecipeChatInterface;
