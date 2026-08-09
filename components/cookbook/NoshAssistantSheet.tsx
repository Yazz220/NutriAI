import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ChefHat, Send } from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
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
  cookbookTitle?: string;
  pageNumber?: number;
  onClose: () => void;
}

export function NoshAssistantSheet({
  visible,
  page,
  cookbookPages,
  cookbookTitle,
  pageNumber,
  onClose,
}: NoshAssistantSheetProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const { messages, isSending, quickPrompts, send } = useNoshAssistant(
    page,
    cookbookPages,
    cookbookTitle,
    pageNumber,
  );
  const contextLabel = page
    ? [
        page.title,
        pageNumber ? `Page ${pageNumber}` : null,
        cookbookTitle ?? 'Cookbook',
      ]
        .filter(Boolean)
        .join(' - ')
    : cookbookTitle ?? 'Cookbook';

  useEffect(() => {
    if (!visible || messages.length === 0) return;
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
    <Sheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      maxHeight="82%"
      contentStyle={styles.sheet}
      handleStyle={styles.handle}
      closeButtonStyle={styles.closeButton}
      closeAccessibilityLabel="Close Nosh chat"
      header={
        <>
          <View style={styles.iconBadge}>
            <ChefHat size={20} color={Colors.onPrimary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Ask Nosh</Text>
            <Text style={styles.title} numberOfLines={1}>
              Chef assistant
            </Text>
          </View>
        </>
      }
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Nosh is looking at:</Text>
            <Text style={styles.contextText} numberOfLines={2}>
              {contextLabel}
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

      {messages.length > 0 ? (
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
      ) : null}

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Nosh..."
          placeholderTextColor={Colors.textMuted}
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.ash,
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  handle: {
    backgroundColor: Colors.duskGrey,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xl,
  },
  closeButton: {
    backgroundColor: Colors.white,
  },
  messages: {
    minHeight: 96,
    maxHeight: 168,
  },
  messagesContent: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  welcome: {
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    padding: Spacing.sm,
  },
  welcomeTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    marginBottom: 4,
  },
  contextText: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 14,
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
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  assistantBubble: {
    backgroundColor: Colors.parchment,
  },
  userBubble: {
    backgroundColor: Colors.primary,
  },
  messageText: {
    color: Colors.text,
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
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
  composer: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 76,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.45,
  },
});
