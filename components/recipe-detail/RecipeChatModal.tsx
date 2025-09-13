import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Send } from 'lucide-react-native';
import { Recipe, RecipeWithAvailability } from '@/types';
import { useRecipeChat } from '@/hooks/useRecipeChat';

interface RecipeChatModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe;
  availability?: RecipeWithAvailability['availability'];
}

export const RecipeChatModal: React.FC<RecipeChatModalProps> = ({ visible, onClose, recipe, availability }) => {
  const { messages, isTyping, sendMessage, quickChips } = useRecipeChat(recipe, availability);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <Text style={{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.text }}>Recipe Assistant</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl }} showsVerticalScrollIndicator={false}>
          {messages.map((m) => (
            <View key={m.id} style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm }}>
              <Text style={{ color: Colors.text }}>{m.text || ''}</Text>
            </View>
          ))}
          {isTyping && (
            <View style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: Spacing.md }}>
              <Text style={{ color: Colors.lightText }}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Quick chips */}
        {quickChips.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.lg }}>
            {quickChips.slice(0, 4).map((chip) => (
              <TouchableOpacity key={chip} onPress={() => sendMessage(chip)} style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: Colors.text, fontSize: 12 }}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Composer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, marginBottom: Spacing.lg, marginHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, borderRadius: 999, backgroundColor: Colors.card, paddingHorizontal: Spacing.md }}>
          <TextInput
            style={{ flex: 1, paddingVertical: Spacing.md, color: Colors.text }}
            placeholder="Ask about this recipe — substitutions, conversions, steps"
            placeholderTextColor={Colors.lightText}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => { if (input.trim()) { sendMessage(input.trim()); setInput(''); } }}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={() => { if (input.trim()) { sendMessage(input.trim()); setInput(''); } }} disabled={!input.trim() || isTyping} style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
            <Send size={16} color={!input.trim() || isTyping ? Colors.lightText : Colors.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

