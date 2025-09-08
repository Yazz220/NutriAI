import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Brain, Send, ChefHat, Package } from 'lucide-react-native';
import { useInventory } from '@/hooks/useInventoryStore';
import { InventoryStatusBar } from '@/components/inventory/InventoryStatusBar';
import { ExpiringIngredientsAlert } from '@/components/inventory/ExpiringIngredientsAlert';
import { createChatCompletion, type ChatMessage as AiChatMessage } from '@/utils/aiClient';
import { 
  buildInventoryAwareAiContext, 
  createInventoryAwareMessages, 
  parseRecipeSuggestions,
  getQuickSuggestionPrompts,
  type UserPreferences,
  type InventoryAwareAiContext 
} from '@/utils/inventoryAwareAiContext';
import { ExternalRecipe } from '@/types/external';

interface InventoryAwareRecipeChatProps {
  onRecipeSelect?: (recipe: ExternalRecipe, action: 'reserve' | 'cook') => void;
  onInventoryUpdate?: () => void;
  onViewInventory?: () => void;
  onAddIngredient?: () => void;
  userPreferences?: UserPreferences;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: RecipeSuggestion[];
  inventoryTips?: string[];
  shoppingList?: string[];
}

interface RecipeSuggestion {
  name: string;
  description: string;
  availableIngredients: string[];
  neededIngredients: string[];
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

export const InventoryAwareRecipeChatInterface: React.FC<InventoryAwareRecipeChatProps> = ({
  onRecipeSelect,
  onInventoryUpdate,
  onViewInventory,
  onAddIngredient,
  userPreferences = {
    dietaryRestrictions: [],
    cookingSkillLevel: 'intermediate',
    preferredCuisines: [],
    timeConstraints: 30,
    avoidIngredients: []
  }
}) => {
  const { inventory, getExpiringItems } = useInventory();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const messageIdRef = useRef(0);

  const expiringItems = useMemo(() => getExpiringItems(), [inventory, getExpiringItems]);
  const quickPrompts = useMemo(() => getQuickSuggestionPrompts(inventory), [inventory]);

  const aiContext = useMemo(() => 
    buildInventoryAwareAiContext(inventory, userPreferences),
    [inventory, userPreferences]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Send initial greeting with inventory context
  useEffect(() => {
    if (messages.length === 0 && inventory.length > 0) {
      const greeting = generateInitialGreeting(aiContext);
      setMessages([{
        id: `msg-${messageIdRef.current++}`,
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
    }
  }, [inventory.length, aiContext, messages.length]);

  const generateInitialGreeting = (context: InventoryAwareAiContext): string => {
    const { inventory } = context;
    let greeting = "Hello! I'm your AI Chef assistant. ";
    
    if (inventory.totalItems === 0) {
      greeting += "I see your inventory is empty. Add some ingredients and I'll help you create amazing meals!";
    } else {
      greeting += `I can see you have ${inventory.totalItems} ingredients in your kitchen. `;
      
      if (inventory.expiringItems.length > 0) {
        greeting += `I notice ${inventory.expiringItems.length} ingredient${inventory.expiringItems.length !== 1 ? 's' : ''} expiring soon. `;
        greeting += "Let me suggest some recipes to help you use them up!";
      } else {
        greeting += "What would you like to cook today?";
      }
    }
    
    return greeting;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = {
      id: `msg-${messageIdRef.current++}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const aiMessages: AiChatMessage[] = createInventoryAwareMessages(trimmed, aiContext);
      const response = await createChatCompletion(aiMessages);
      
      const parsedResponse = parseRecipeSuggestions(response);
      
      const assistantMessage: ChatMessage = {
        id: `msg-${messageIdRef.current++}`,
        role: 'assistant',
        content: parsedResponse.type === 'recipe_suggestions' 
          ? generateRecipeResponseText(parsedResponse)
          : (parsedResponse.content || response),
        timestamp: new Date(),
        suggestions: parsedResponse.suggestions,
        inventoryTips: parsedResponse.inventoryTips,
        shoppingList: parsedResponse.shoppingList
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${messageIdRef.current++}`,
        role: 'assistant',
        content: "I'm having trouble right now. Try asking about recipes using your available ingredients!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateRecipeResponseText = (response: any): string => {
    if (!response.suggestions || response.suggestions.length === 0) {
      return "I couldn't find specific recipes right now, but I'm here to help with your cooking questions!";
    }

    let text = "Here are some recipe suggestions based on your inventory:\n\n";
    
    response.suggestions.forEach((suggestion: RecipeSuggestion, index: number) => {
      text += `${index + 1}. **${suggestion.name}**\n`;
      text += `${suggestion.description}\n`;
      text += `⏱️ ${suggestion.cookingTime} minutes • 🔧 ${suggestion.difficulty}\n`;
      text += `✅ You have: ${suggestion.availableIngredients.join(', ')}\n`;
      if (suggestion.neededIngredients.length > 0) {
        text += `🛒 Need: ${suggestion.neededIngredients.join(', ')}\n`;
      }
      text += `💡 ${suggestion.reason}\n\n`;
    });

    return text;
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const handleSuggestRecipesForExpiring = (ingredients: string[]) => {
    const prompt = `What recipes can I make using ${ingredients.join(', ')}? These ingredients are expiring soon.`;
    handleQuickPrompt(prompt);
    setShowExpiringAlert(false);
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
      {/* Inventory Status */}
      <View style={styles.inventorySection}>
        <InventoryStatusBar
          inventory={inventory}
          onViewInventory={onViewInventory}
          onAddIngredient={onAddIngredient}
          compact={true}
        />
        
        {showExpiringAlert && expiringItems.length > 0 && (
          <ExpiringIngredientsAlert
            expiringItems={expiringItems}
            onSuggestRecipes={handleSuggestRecipesForExpiring}
            onDismiss={() => setShowExpiringAlert(false)}
          />
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: Spacing.lg + 120 + composerBottomOffset,
        }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.bubble,
            message.role === 'user' ? styles.bubbleUser : styles.bubbleAI
          ]}>
            <Text style={[
              styles.bubbleText,
              message.role === 'user' && styles.bubbleTextOnPrimary
            ]}>
              {message.content}
            </Text>
            
            {message.suggestions && message.suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {message.suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestionCard,
                      suggestion.urgency === 'high' && styles.urgentSuggestion
                    ]}
                  >
                    <View style={styles.suggestionHeader}>
                      <Text style={styles.suggestionName}>{suggestion.name}</Text>
                      <View style={styles.suggestionMeta}>
                        <Text style={styles.suggestionTime}>{suggestion.cookingTime}m</Text>
                        <Text style={styles.suggestionDifficulty}>{suggestion.difficulty}</Text>
                      </View>
                    </View>
                    <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                    <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                    
                    <View style={styles.ingredientStatus}>
                      <Text style={styles.availableIngredients}>
                        ✅ {suggestion.availableIngredients.length} available
                      </Text>
                      {suggestion.neededIngredients.length > 0 && (
                        <Text style={styles.neededIngredients}>
                          🛒 {suggestion.neededIngredients.length} needed
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {message.inventoryTips && message.inventoryTips.length > 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Tips:</Text>
                {message.inventoryTips.map((tip, index) => (
                  <Text key={index} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.bubbleText}>Thinking about your ingredients...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      {quickPrompts.length > 0 && (
        <View style={[styles.quickPromptsContainer, { bottom: composerBottomOffset + 60 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickPrompts}>
              {quickPrompts.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickPrompt}
                  onPress={() => handleQuickPrompt(prompt)}
                >
                  <Text style={styles.quickPromptText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Composer */}
      <View style={[styles.composer, { bottom: composerBottomOffset }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask about recipes using your ingredients..."
          placeholderTextColor={Colors.lightText}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]} 
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
        >
          <Send size={16} color={input.trim() && !isTyping ? Colors.white : Colors.lightText} />
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
  inventorySection: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    lineHeight: 20,
  },
  bubbleTextOnPrimary: {
    color: Colors.white,
  },
  suggestionsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  urgentSuggestion: {
    borderColor: Colors.error,
    borderLeftWidth: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  suggestionMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  suggestionTime: {
    fontSize: 12,
    color: Colors.lightText,
  },
  suggestionDifficulty: {
    fontSize: 12,
    color: Colors.lightText,
    textTransform: 'capitalize',
  },
  suggestionDescription: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 12,
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ingredientStatus: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  availableIngredients: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  neededIngredients: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
  },
  tipsContainer: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: Colors.lightText,
    lineHeight: 16,
  },
  quickPromptsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
  },
  quickPrompts: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  quickPrompt: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickPromptText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    backgroundColor: Colors.card,
    zIndex: 100,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.secondary,
  },
});