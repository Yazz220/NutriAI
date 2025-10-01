import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal, Animated, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, PaperPlaneTilt, Sparkle } from 'phosphor-react-native';
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
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
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
            {/* Header with gradient */}
            <LinearGradient
              colors={[Colors.primary, Colors.accentPrimary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <NoshChefIcon width={32} height={32} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Recipe Chef</Text>
                    <Text style={styles.headerSubtitle}>Ask me anything about this recipe</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={Colors.white} weight="bold" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && (
                <View style={styles.welcomeContainer}>
                  <View style={styles.welcomeIconContainer}>
                    <Sparkle size={48} color={Colors.primary} weight="duotone" />
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
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.coachBubble,
                    ]}
                  >
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                      {msg.text || ''}
                    </Text>
                  </View>
                );
              })}

              {isTyping && (
                <View style={[styles.messageBubble, styles.coachBubble]}>
                  <View style={styles.typingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.typingText}>Thinking...</Text>
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

            {/* Input composer */}
            <Animated.View
              style={[
                styles.composerContainer,
                {
                  transform: [
                    {
                      scale: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask about substitutions, conversions, steps..."
                  placeholderTextColor={Colors.lightText}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleSend}
                  onFocus={() => {
                    Animated.spring(inputFocusAnim, {
                      toValue: 1,
                      useNativeDriver: true,
                      tension: 100,
                      friction: 7,
                    }).start();
                  }}
                  onBlur={() => {
                    Animated.spring(inputFocusAnim, {
                      toValue: 0,
                      useNativeDriver: true,
                      tension: 100,
                      friction: 7,
                    }).start();
                  }}
                  returnKeyType="send"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!input.trim() || isTyping}
                  style={[
                    styles.sendButton,
                    (!input.trim() || isTyping) && styles.sendButtonDisabled,
                  ]}
                >
                  <PaperPlaneTilt
                    size={20}
                    color={!input.trim() || isTyping ? Colors.lightText : Colors.white}
                    weight="fill"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.92,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
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
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: Typography.sizes.xxl,
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
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.white,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typingText: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickActionsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  quickActionButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  quickActionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  composerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.secondary,
  },
});

