import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, TextInput, SafeAreaView, Dimensions } from 'react-native';
import { Brain } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { StructuredMessage } from '@/components/StructuredMessage';
import { useCoachChat } from '@/hooks/useCoachChat';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  meals?: Array<{ recipe: any; mealType?: string }>;
  summary?: string;
  actions?: Array<{ label: string; type: string; payload?: any }>;
  source?: 'ai' | 'heuristic' | 'builtin';
  structured?: any;
}

const ChatModal: React.FC<ChatModalProps> = ({ visible, onClose }) => {
  const { messages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    const text = inputText.trim();
    if (text) {
      sendMessage(text);
      setInputText('');
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const renderMessage = (message: ChatMessage) => (
    <View key={message.id} style={[styles.msg, message.role === 'user' ? styles.msgUser : styles.msgCoach]}>
      {message.role !== 'user' && message.structured ? (
        <StructuredMessage data={message.structured} />
      ) : (
        <>
          {!!message.text && <Text style={styles.msgText}>{message.text}</Text>}
          {!!message.summary && <Text style={styles.msgSummary}>{message.summary}</Text>}
        </>
      )}
      {message.role === 'coach' && !!message.source && (
        <Text style={styles.msgSource}>
          {message.source === 'ai' ? 'AI' : message.source === 'heuristic' ? 'Suggestion' : 'Built-in'}
        </Text>
      )}
      {!!message.meals && message.meals.length > 0 && (
        <View style={{ marginTop: Spacing.sm }}>
          {message.meals.map(({ recipe, mealType }, idx) => (
            <View key={`${message.id}-${idx}`} style={styles.inlineCard}>
              <Text style={styles.inlineTitle}>{mealType ? `${mealType}: ` : ''}{recipe.name}</Text>
              <Text style={styles.inlineSub}>
                {recipe.availability.availabilityPercentage}% available • Missing {recipe.availability.missingIngredients.length}
              </Text>
            </View>
          ))}
        </View>
      )}
      {!!message.actions && (
        <View style={styles.inlineActions}>
          {message.actions.map((a, idx) => (
            <TouchableOpacity
              key={`${message.id}-act-${idx}`}
              style={styles.actionBtn}
              onPress={() => performInlineAction(a as any, message.meals as any)}
            >
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: Spacing.sm }]}>
          <Text style={styles.modalTitle}>Coach Chat</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chipsRow}>
            {['Plan my day', 'Plan my week', 'Generate shopping list'].map((chip) => (
              <TouchableOpacity key={chip} style={styles.chip} onPress={() => handleQuickAction(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.messages}>
            {messages.map(renderMessage)}
            {isTyping && (
              <View style={[styles.msg, styles.msgCoach]}>
                <Text style={styles.typingText}>AI is typing…</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composerRow, { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }]}>
            <TextInput
              placeholder="Ask me to plan your day or week…"
              placeholderTextColor={Colors.lightText}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSendMessage}
            >
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  chipText: {
    color: Colors.text,
    fontSize: 14,
  },
  messages: {
    marginTop: Spacing.md,
  },
  msg: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  msgUser: {
    backgroundColor: Colors.card,
  },
  msgCoach: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  msgText: {
    color: Colors.text,
  },
  msgSummary: {
    color: Colors.lightText,
    marginTop: 4,
  },
  msgSource: {
    color: Colors.lightText,
    marginTop: 4,
    fontSize: 12,
  },
  typingText: {
    color: Colors.lightText,
    fontStyle: 'italic' as const,
  },
  inlineCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  inlineTitle: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  inlineSub: {
    color: Colors.lightText,
    marginTop: 2,
  },
  inlineActions: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  composerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.card,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.text,
  },
  sendBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sendText: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
};

export default ChatModal;