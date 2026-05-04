import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ChefHat, Send, X } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { useNoshAssistant } from '@/hooks/useNoshAssistant';
import { Fonts } from '@/utils/fonts';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantSheetProps {
  visible: boolean;
  page: CookbookPage | null;
  cookbookPages: CookbookPage[];
  onClose: () => void;
}

export function NoshAssistantSheet({ visible, page, cookbookPages, onClose }: NoshAssistantSheetProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const { messages, isSending, quickPrompts, send } = useNoshAssistant(page, cookbookPages);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, visible]);

  async function handleSend(value = input) {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    setInput('');
    await send(trimmed);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.iconBadge}>
                <ChefHat size={20} color={Colors.onPrimary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>Nosh</Text>
                <Text style={styles.title} numberOfLines={1}>
                  {page ? page.title : 'Cookbook assistant'}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close Nosh chat">
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <View style={styles.welcome}>
                  <Text style={styles.welcomeTitle}>Ask me about this page.</Text>
                  <Text style={styles.welcomeText}>
                    I can help scale servings, swap ingredients, make a shopping list, or guide you step by step.
                  </Text>
                </View>
              ) : null}

              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <View key={message.id} style={[styles.messageRow, isUser && styles.userRow]}>
                    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                      <Text style={[styles.messageText, isUser && styles.userText]}>{message.text}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {quickPrompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={styles.chip}
                  onPress={() => handleSend(prompt)}
                  disabled={isSending}
                >
                  <Text style={styles.chipText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask Nosh..."
                placeholderTextColor="#9B835A"
                style={styles.input}
                editable={!isSending}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => handleSend()}
              />
              <Pressable
                style={[styles.sendButton, (!input.trim() || isSending) && styles.disabled]}
                onPress={() => handleSend()}
                disabled={!input.trim() || isSending}
                accessibilityLabel="Send Nosh message"
              >
                <Send size={18} color={Colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(35, 21, 10, 0.42)',
  },
  keyboard: {
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#D8BE8E',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8BE8E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#806A46',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#3E2C1B',
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xl,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4E1BE',
  },
  messages: {
    minHeight: 220,
  },
  messagesContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  welcome: {
    borderRadius: Radii.lg,
    backgroundColor: '#F4E1BE',
    padding: Spacing.md,
  },
  welcomeTitle: {
    color: '#3E2C1B',
    fontWeight: '800',
    marginBottom: 4,
  },
  welcomeText: {
    color: '#6D5738',
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  assistantBubble: {
    backgroundColor: '#F4E1BE',
  },
  userBubble: {
    backgroundColor: Colors.primary,
  },
  messageText: {
    color: '#3E2C1B',
    lineHeight: 20,
  },
  userText: {
    color: Colors.onPrimary,
  },
  chips: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  chip: {
    borderRadius: 999,
    backgroundColor: '#F7E6C8',
    borderWidth: 1,
    borderColor: '#D8BE8E',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    color: '#3E2C1B',
    fontWeight: '800',
  },
  composer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#D8BE8E',
    backgroundColor: '#FFF3DB',
    color: '#3E2C1B',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  disabled: {
    opacity: 0.45,
  },
});
