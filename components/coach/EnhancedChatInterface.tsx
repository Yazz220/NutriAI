import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  PaperPlaneTilt,
  Sparkle,
  TrendUp,
  Target,
  Clock,
  ChatCircle,
  DotsThree,
} from 'phosphor-react-native';
import NoshIconCircle from '@/assets/images/nosh/Nosh Icon circle.svg';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { APP_NAME, NOSH_HEADER_SUBTITLE, NOSH_WELCOME_TITLE, NOSH_WELCOME_MESSAGE, CHAT_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY } from '@/constants/brand';
import { useCoachChat } from '@/hooks/useCoachChat';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EnhancedChatInterfaceProps {
  visible: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  timestamp: Date;
  isTyping?: boolean;
  meals?: Array<{ recipe: any; mealType?: string }>;
  summary?: string;
  actions?: Array<{ label: string; type: string; payload?: any }>;
  source?: 'ai' | 'heuristic' | 'builtin';
  structured?: any;
}

const STORAGE_KEY = CHAT_STORAGE_KEY;
const MAX_STORED_MESSAGES = 50;

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { messages: hookMessages, sendMessage, performInlineAction, isTyping } = useCoachChat();
  const [input, setInput] = useState('');
  const [persistedMessages, setPersistedMessages] = useState<ChatMessage[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  // Combine hook messages with persisted messages
  const allMessages = useMemo(() => {
    const combined = [...persistedMessages];
    
    // Add hook messages that aren't already persisted
    hookMessages.forEach(hookMsg => {
      const exists = combined.find(msg => msg.id === hookMsg.id);
      if (!exists) {
        combined.push({
          ...hookMsg,
          timestamp: new Date(),
        });
      }
    });

    // Sort by timestamp
    return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [persistedMessages, hookMessages]);

  // Load persisted messages on mount (with legacy key migration)
  useEffect(() => {
    loadPersistedMessages();
  }, []);

  // Save messages when they change
  useEffect(() => {
    if (allMessages.length > 0) {
      saveMessages(allMessages);
    }
  }, [allMessages]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: screenHeight,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (visible && allMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages, visible]);

  const loadPersistedMessages = async () => {
    try {
      let stored = await AsyncStorage.getItem(STORAGE_KEY);
      // Migrate from legacy key if present
      if (!stored) {
        const legacy = await AsyncStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
        if (legacy) {
          await AsyncStorage.setItem(STORAGE_KEY, legacy);
          await AsyncStorage.removeItem(LEGACY_CHAT_STORAGE_KEY);
          stored = legacy;
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setPersistedMessages(parsed);
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  };

  const saveMessages = async (messages: ChatMessage[]) => {
    try {
      const toSave = messages
        .slice(-MAX_STORED_MESSAGES)
        .map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  };

  const clearChatHistory = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setPersistedMessages([]);
    } catch (error) {
      console.warn('Failed to clear chat history:', error);
    }
  };

  const promptClearChat = () => {
    Alert.alert(
      'Clear chat',
      'This will clear your current conversation and start a new chat. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & New',
          style: 'destructive',
          onPress: async () => {
            await clearChatHistory();
          },
        },
      ]
    );
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    sendMessage(trimmed);
    setInput('');
    setShowQuickActions(false);
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
    setShowQuickActions(false);
  };

  const handleInputFocus = () => {
    Animated.spring(inputFocusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleInputBlur = () => {
    Animated.spring(inputFocusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = [
    { icon: Target, label: 'Plan my day', action: 'Plan my day' },
    { icon: TrendUp, label: 'Weekly progress', action: 'How am I doing this week?' },
    { icon: Sparkle, label: 'Meal suggestions', action: 'What should I eat next?' },
    { icon: Clock, label: 'Set reminder', action: 'Set a meal reminder' },
  ];

  const inputBorderColor = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const inputShadowOpacity = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Chat Interface */}
        <Animated.View
          style={[
            styles.chatContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={[Colors.card, Colors.surface]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerLeft}>
                    <View style={styles.aiIndicator}>
                      {/* Match FAB icon size exactly */}
                      <View style={{ overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
                        <NoshIconCircle width={106.81811712} height={106.81811712} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.headerCenter} pointerEvents="none">
                    <Text style={styles.headerTitle}>{APP_NAME}</Text>
                    <Text style={styles.headerSubtitle}>
                      {isTyping ? 'Thinking...' : NOSH_HEADER_SUBTITLE}
                    </Text>
                  </View>

                  <View style={styles.headerRight}>
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={promptClearChat}
                      accessibilityLabel="Clear chat history"
                    >
                      <DotsThree size={20} color={Colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={onClose}
                      accessibilityLabel="Close chat"
                    >
                      <X size={24} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={[
                styles.messagesContent,
                { paddingBottom: insets.bottom + 100 }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Welcome message if no messages */}
              {allMessages.length === 0 && (
                <View style={styles.welcomeContainer}>
                  <View style={styles.welcomeIcon}>
                    <NoshIconCircle width={56} height={56} />
                  </View>
                  <Text style={styles.welcomeTitle}>{NOSH_WELCOME_TITLE}</Text>
                  <Text style={styles.welcomeMessage}>
                    {NOSH_WELCOME_MESSAGE}
                  </Text>
                </View>
              )}

              {/* Message list */}
              {allMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLastMessage={index === allMessages.length - 1}
                  onActionPress={performInlineAction}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <View style={[styles.messageBubble, styles.coachBubble]}>
                  <View style={styles.typingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.typingText}>{APP_NAME} is thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick Actions */}
            {showQuickActions && allMessages.length === 0 && (
              <View style={styles.quickActionsContainer}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  {quickActions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickActionButton}
                      onPress={() => handleQuickAction(action.action)}
                    >
                      <action.icon size={20} color={Colors.primary} />
                      <Text style={styles.quickActionText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={styles.inputContainer}>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: inputBorderColor,
                      shadowOpacity: inputShadowOpacity,
                    },
                  ]}
                >
                  <TextInput
                    style={styles.textInput}
                    placeholder={`Ask ${APP_NAME} about meals, planning, or progress...`}
                    placeholderTextColor={Colors.lightText}
                    value={input}
                    onChangeText={setInput}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    multiline
                    maxLength={500}
                    editable={!isTyping}
                  />
                  <View style={styles.sendButtonWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!input.trim() || isTyping) && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSend}
                      disabled={!input.trim() || isTyping}
                      accessibilityLabel="Send message"
                    >
                      <LinearGradient
                        colors={[Colors.primary, Colors.accentPrimary || Colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.sendButtonGradient}
                      >
                        <PaperPlaneTilt
                          size={22}
                          color={input.trim() && !isTyping ? Colors.white : Colors.lightText}
                          weight="fill"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  isLastMessage: boolean;
  onActionPress: (action: any, meals?: any) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLastMessage,
  onActionPress,
}) => {
  const isUser = message.role === 'user';
  
  return (
    <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
      {/* Avatar */}
      {!isUser && (
        <View style={styles.avatar}>
          <NoshIconCircle width={20} height={20} />
        </View>
      )}
      
      {/* Message bubble */}
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.coachBubble]}>
        {message.text && (
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.text}
          </Text>
        )}
        
        {message.summary && (
          <Text style={[styles.messageSummary, isUser && styles.userMessageText]}>
            {message.summary}
          </Text>
        )}

        {/* Meal suggestions */}
        {message.meals && message.meals.length > 0 && (
          <View style={styles.mealsContainer}>
            {message.meals.map((meal, index) => (
              <View key={index} style={styles.mealCard}>
                <Text style={styles.mealName}>
                  {meal.mealType ? `${meal.mealType}: ` : ''}{meal.recipe.name}
                </Text>
                <Text style={styles.mealDetails}>
                  {meal.recipe.availability?.availabilityPercentage}% available
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {message.actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => onActionPress(action, message.meals)}
              >
                <Text style={styles.actionButtonText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  aiIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: Spacing.md,
  },
  coachBubble: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderBottomLeftRadius: 8,
    borderRadius: 18,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 8,
    borderRadius: 18,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  messageText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.white,
  },
  messageSummary: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: Colors.white + '80',
  },
  mealsContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  mealCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  mealDetails: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: Typography.weights.medium,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  quickActionsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickActionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  inputContainer: {
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: Spacing.xs,
  },
  sendButtonWrapper: {
    marginLeft: Spacing.sm,
    borderRadius: 28,
    overflow: 'visible',
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    width: '100%',
    height: '100%',
  },
});
