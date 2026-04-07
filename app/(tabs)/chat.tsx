import React, { useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNoshChat } from '@/hooks/useNoshChat';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { NoshChatMessage } from '@/types';
import { Colors } from '@/constants/colors';

export default function ChatScreen() {
  const { messages, sendMessage, isTyping } = useNoshChat();
  const flatListRef = useRef<FlatList<NoshChatMessage>>(null);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const renderItem = useCallback(({ item }: { item: NoshChatMessage }) => (
    <ChatMessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: NoshChatMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />
      <ChatInput onSend={sendMessage} disabled={isTyping} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
