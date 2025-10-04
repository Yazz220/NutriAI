import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal, Animated, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, PaperPlaneTilt, Sparkle, DotsThree } from 'phosphor-react-native';
import NoshChefIcon from '@/assets/icons/Nosh chef (1).svg';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Recipe, RecipeWithAvailability } from '@/types';
import { useRecipeChat } from '@/hooks/useRecipeChat';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

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

  const inputBorderColor = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const inputShadowOpacity = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
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
                      <NoshChefIcon width={76} height={76} />
                    </View>
                  </View>

                  <View style={styles.headerCenter} pointerEvents="none">
                    <Text style={styles.headerTitle}>Nosh the Chef</Text>
                    <Text style={styles.headerSubtitle}>
                      {isTyping ? 'Stirring up ideas…' : 'What can I cook up for you today?'}
                    </Text>
                  </View>

                  <View style={styles.headerRight}>
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
              ref={scrollRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <View style={styles.welcomeContainer}>
                  <View style={styles.welcomeIconContainer}>
                    <NoshChefIcon width={112} height={112} />
                  </View>
                  <Text style={styles.welcomeTitle}>Recipe Assistant</Text>
                  <Text style={styles.welcomeMessage}>
                    I'm here to help with substitutions, conversions, cooking tips, and any questions about this recipe!
                  </Text>
                </View>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[styles.messageContainer, isUser && styles.userMessageContainer]}
                  >
                    {!isUser && (
                      <NoshChefIcon width={32} height={32} />
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        isUser ? styles.userBubble : styles.coachBubble,
                      ]}
                    >
                      <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                        {msg.text || ''}
                      </Text>
                      <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
                        {formatTime(new Date())}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {isTyping && (
                <View style={[styles.messageContainer]}>
                  <NoshChefIcon width={32} height={32} />
                  <View style={[styles.messageBubble, styles.coachBubble]}>
                    <View style={styles.typingContainer}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.typingText}>Thinking...</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick chips */}
            {quickChips.length > 0 && (
              <View style={styles.quickActionsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContent}>
                  {quickChips.slice(0, 4).map((chip, idx) => (
                    <TouchableOpacity
                      key={`${chip}-${idx}`}
                      onPress={() => sendMessage(chip)}
                      style={styles.quickActionButton}
                    >
                      <Text style={styles.quickActionText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input Area */}
            <View style={styles.composerContainer}>
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: inputBorderColor,
                    shadowOpacity: inputShadowOpacity,
                  },
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Ask a cooking question..."
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
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
  keyboardView: {
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
    gap: Spacing.xs,
  },
  aiIndicator: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
    paddingHorizontal: Spacing.xl,
  },
  welcomeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
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
  timestamp: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: Colors.white + '80',
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
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  quickActionsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  quickActionButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  quickActionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  composerContainer: {
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputContainer: {
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
  input: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
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

