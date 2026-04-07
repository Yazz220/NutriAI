import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Radii } from '@/constants/spacing';
import { NoshChatMessage, Meal } from '@/types';
import RecipeCardInline from './RecipeCardInline';

interface ChatMessageBubbleProps {
  message: NoshChatMessage;
  onRecipePress?: (meal: Meal) => void;
}

const ChatMessageBubble = React.memo(({ message, onRecipePress }: ChatMessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text
          style={[
            styles.text,
            isUser ? styles.textUser : styles.textAssistant,
            message.isProcessing && styles.textProcessing,
          ]}
        >
          {message.content}
        </Text>

        {message.recipeCard && (
          <RecipeCardInline
            meal={message.recipeCard}
            onPress={onRecipePress ? () => onRecipePress(message.recipeCard!) : undefined}
          />
        )}
      </View>
    </View>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';

export default ChatMessageBubble;

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleUser: {
    backgroundColor: Colors.secondary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  text: {
    ...Typography.body,
  },
  textUser: {
    color: Colors.white,
  },
  textAssistant: {
    color: Colors.text,
  },
  textProcessing: {
    fontStyle: 'italic',
    color: Colors.textMuted,
  },
});
