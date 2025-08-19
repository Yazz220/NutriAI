import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Keyboard
} from 'react-native';
import { Bot, Send, Sparkles, MessageCircle, Lightbulb } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { AI_DEMO_PROMPTS, ONBOARDING_STEPS } from '@/constants/onboarding';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface TypingIndicatorProps {
  visible: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ visible }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          if (visible) animateDots();
        });
      };
      animateDots();
    }
  }, [visible, dot1, dot2, dot3]);

  if (!visible) return null;

  return (
    <View style={styles.typingIndicator}>
      <Bot size={16} color={Colors.primary} />
      <View style={styles.typingDots}>
        <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
      </View>
    </View>
  );
};

export const AICoachIntroScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [interactionStartTime, setInteractionStartTime] = useState<Date | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const { navigateNext, navigateSkip } = useOnboardingNavigation();
  const { trackAICoachDemoViewed, trackUserChoice } = useOnboardingAnalytics();

  // Initial welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      text: "Hi! I'm your AI cooking assistant. I can help you with recipes, meal planning, ingredient substitutions, and cooking tips. Try asking me something!",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple response logic based on keywords
    if (lowerMessage.includes('low-carb') || lowerMessage.includes('low carb')) {
      return "Great choice! For a low-carb dinner, I'd suggest grilled salmon with roasted vegetables, or a chicken and avocado salad. Based on your inventory, I can suggest specific recipes that fit your preferences. Would you like me to check what you have available?";
    }
    
    if (lowerMessage.includes('breakfast')) {
      return "For a quick breakfast, try scrambled eggs with spinach, Greek yogurt with berries, or overnight oats if you prefer something you can prep ahead. What's your preferred cooking time in the morning?";
    }
    
    if (lowerMessage.includes('leftover')) {
      return "Leftovers are perfect for creative cooking! Leftover chicken can become chicken salad, quesadillas, or soup. Tell me what leftovers you have, and I'll suggest some delicious ways to transform them.";
    }
    
    if (lowerMessage.includes('meal prep') || lowerMessage.includes('week')) {
      return "Meal prep is a game-changer! I can help you plan a week of meals based on your dietary preferences and cooking schedule. We can focus on recipes that store well and ingredients that work across multiple dishes. Want to start with your favorite proteins?";
    }
    
    if (lowerMessage.includes('substitute') || lowerMessage.includes('replace')) {
      return "I love helping with substitutions! Whether you're missing an ingredient or have dietary restrictions, there's usually a great alternative. What ingredient are you looking to substitute?";
    }
    
    // Default responses
    const defaultResponses = [
      "That's a great question! I can help you with recipes, meal planning, ingredient substitutions, and cooking techniques. What specific area would you like to explore?",
      "I'd be happy to help with that! Once you complete the setup, I'll have access to your dietary preferences and inventory to give you personalized suggestions.",
      "Interesting! I can provide detailed cooking guidance, recipe modifications, and meal planning based on your preferences. What would you like to cook?",
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Track first interaction
    if (!hasInteracted) {
      setHasInteracted(true);
      setInteractionStartTime(new Date());
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(messageText),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
  };

  const handlePromptChip = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleContinue = async () => {
    // Track analytics
    const interactionTime = interactionStartTime 
      ? Date.now() - interactionStartTime.getTime()
      : 0;

    trackAICoachDemoViewed({
      promptUsed: messages.find(m => m.isUser)?.text,
      responseReceived: messages.some(m => !m.isUser && m.id !== '1'),
      interactionTime,
    });

    trackUserChoice({
      step: 5, // OnboardingStep.AI_COACH_INTRO
      choiceType: 'ai_demo',
      choiceValue: 'continue',
      context: {
        messageCount: messages.length,
        hasInteracted,
        interactionTime,
      },
    });

    await navigateNext();
  };

  const handleSkip = async () => {
    trackUserChoice({
      step: 5, // OnboardingStep.AI_COACH_INTRO
      choiceType: 'ai_demo',
      choiceValue: 'skip',
      context: {
        messageCount: messages.length,
        hasInteracted,
      },
    });

    await navigateSkip();
  };

  const renderMessage = (message: ChatMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      {!message.isUser && (
        <View style={styles.aiAvatar}>
          <Bot size={16} color={Colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          message.isUser ? styles.userMessageBubble : styles.aiMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isUser ? styles.userMessageText : styles.aiMessageText,
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );

  return (
    <OnboardingLayout
      title={ONBOARDING_STEPS.AI_COACH_INTRO.title}
      subtitle={ONBOARDING_STEPS.AI_COACH_INTRO.subtitle}
      showProgress={true}
      showSkip={true}
      onSkip={handleSkip}
      skipWarning="You'll miss the chance to see how powerful your AI cooking assistant can be, but you can always access it later."
    >
      <View style={styles.container}>
        {/* Demo Header */}
        <View style={styles.demoHeader}>
          <View style={styles.demoHeaderIcon}>
            <Sparkles size={24} color={Colors.primary} />
          </View>
          <Text style={styles.demoHeaderTitle}>Try Your AI Coach</Text>
          <Text style={styles.demoHeaderSubtitle}>
            Ask me anything about cooking, recipes, or meal planning!
          </Text>
        </View>

        {/* Chat Interface */}
        <View style={styles.chatContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
            <TypingIndicator visible={isTyping} />
          </ScrollView>

          {/* Prompt Chips */}
          {!hasInteracted && (
            <View style={styles.promptChips}>
              <Text style={styles.promptChipsTitle}>Try these examples:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promptChipsContainer}
              >
                {AI_DEMO_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt.id}
                    style={styles.promptChip}
                    onPress={() => handlePromptChip(prompt.value)}
                  >
                    <Text style={styles.promptChipIcon}>{prompt.icon}</Text>
                    <Text style={styles.promptChipText}>{prompt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me about cooking..."
              placeholderTextColor={Colors.lightText}
              multiline
              maxLength={200}
              onSubmitEditing={() => handleSendMessage()}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
            >
              {isTyping ? (
                <LoadingSpinner size="small" color={Colors.lightText} />
              ) : (
                <Send size={20} color={inputText.trim() ? Colors.primary : Colors.lightText} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresPreview}>
          <Text style={styles.featuresTitle}>What I can help you with:</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MessageCircle size={16} color={Colors.primary} />
              <Text style={styles.featureText}>Recipe suggestions based on your inventory</Text>
            </View>
            <View style={styles.featureItem}>
              <Lightbulb size={16} color={Colors.primary} />
              <Text style={styles.featureText}>Ingredient substitutions and cooking tips</Text>
            </View>
            <View style={styles.featureItem}>
              <Bot size={16} color={Colors.primary} />
              <Text style={styles.featureText}>Personalized meal planning and nutrition advice</Text>
            </View>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title={hasInteracted ? "Continue to Complete Setup" : "Skip Demo"}
            onPress={hasInteracted ? handleContinue : handleSkip}
            variant="primary"
            size="lg"
            fullWidth={true}
            testID="ai-coach-continue-button"
          />
          
          {hasInteracted && (
            <Button
              title="Skip This Step"
              onPress={handleSkip}
              variant="ghost"
              size="md"
              fullWidth={true}
              style={styles.skipButton}
            />
          )}
        </View>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Demo Header
  demoHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  demoHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  demoHeaderTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  demoHeaderSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: Typography.sizes.md * 1.4,
  },

  // Chat Interface
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messagesContainer: {
    flex: 1,
    maxHeight: 300,
  },
  messagesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Messages
  messageContainer: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: Spacing.xs,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.4,
  },
  userMessageText: {
    color: Colors.white,
  },
  aiMessageText: {
    color: Colors.text,
  },

  // Typing Indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  typingDots: {
    flexDirection: 'row',
    marginLeft: Spacing.sm,
    gap: Spacing.xs,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  // Prompt Chips
  promptChips: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  promptChipsTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    marginBottom: Spacing.sm,
  },
  promptChipsContainer: {
    gap: Spacing.sm,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  promptChipIcon: {
    fontSize: 14,
  },
  promptChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Features Preview
  featuresPreview: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featuresTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  featuresList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    flex: 1,
    lineHeight: Typography.sizes.sm * 1.3,
  },

  // Bottom Actions
  bottomActions: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipButton: {
    marginTop: Spacing.md,
  },
});