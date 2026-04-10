import React, { useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useNoshChat } from '@/hooks/useNoshChat';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { NoshChatMessage } from '@/types';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function ChatScreen() {
  const { messages, sendMessage, isTyping } = useNoshChat();
  const flatListRef = useRef<FlatList<NoshChatMessage>>(null);
  const insets = useSafeAreaInsets();

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const renderItem = useCallback(({ item }: { item: NoshChatMessage }) => (
    <ChatMessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: NoshChatMessage) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Nosh" showDivider={true} />
      
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />
        <ChatInput onSend={sendMessage} disabled={isTyping} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
