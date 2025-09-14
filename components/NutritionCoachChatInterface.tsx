import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Typography as Type } from '@/constants/typography';
import { Brain, Send, Target, TrendingUp, AlertCircle, CheckCircle, RotateCcw, MoreVertical } from 'lucide-react-native';
import { useNutrition } from '@/hooks/useNutrition';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoggedMeal, NutritionGoals } from '@/types';
import { createChatCompletion, type ChatMessage as AiChatMessage } from '@/utils/aiClient';
import { 
  buildNutritionCoachAiContext, 
  getCoachingQuickPrompts,
  type NutritionCoachAiContext 
} from '@/utils/nutritionCoachAiContext';
import { generateCoachingInsights } from '@/utils/progressAnalysis';
import { CoachingInsight } from '@/utils/nutritionCoachAiContext';
import { 
  createConciseNutritionCoachPrompt,
  generateQuickResponse,
  parseCoachResponse,
  getFallbackResponse
} from '@/utils/conciseNutritionCoach';
import { PERSONALITY_PRESETS, CoachingPersonality } from '@/utils/coachingPersonality';

interface NutritionCoachChatProps {
  onLogMeal?: (meal: LoggedMeal) => void;
  onUpdateGoals?: (goals: Partial<NutritionGoals>) => void;
  onViewProgress?: () => void;
  onQuickLogFood?: (foodName: string, calories: number) => void;
  onSetReminder?: (reminderType: 'meal' | 'water' | 'tracking', time: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
  insights?: CoachingInsight[];
  recommendations?: string[];
  quickActions?: QuickAction[];
  mealSuggestions?: MealSuggestion[];
}

interface QuickAction {
  id: string;
  type: 'log_meal' | 'set_reminder' | 'view_progress' | 'adjust_goals' | 'quick_log';
  label: string;
  data?: any;
}

interface MealSuggestion {
  id: string;
  name: string;
  calories: number;
  protein: number;
  description: string;
  quickLog?: boolean;
}

interface ProgressSummaryProps {
  context: NutritionCoachAiContext;
  onViewDetails?: () => void;
  onOptionsPress?: () => void;
}

interface OptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onClearHistory: () => void;
}

const OptionsMenu: React.FC<OptionsMenuProps> = ({ visible, onClose, onClearHistory }) => {
  if (!visible) return null;

  return (
    <View style={styles.optionsMenuOverlay}>
      <TouchableOpacity style={styles.optionsMenuBackdrop} onPress={onClose} />
      <View style={styles.optionsMenu}>
        <TouchableOpacity 
          style={styles.optionsMenuItem} 
          onPress={onClearHistory}
        >
          <RotateCcw size={20} color={Colors.text} />
          <Text style={styles.optionsMenuText}>Clear Chat History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface ClearConfirmDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({ visible, onConfirm, onCancel }) => {
  if (!visible) return null;

  return (
    <View style={styles.confirmDialogOverlay}>
      <TouchableOpacity style={styles.confirmDialogBackdrop} onPress={onCancel} />
      <View style={styles.confirmDialog}>
        <Text style={styles.confirmDialogTitle}>Clear Chat History?</Text>
        <Text style={styles.confirmDialogMessage}>
          This will remove all messages and start a fresh conversation. This action cannot be undone.
        </Text>
        <View style={styles.confirmDialogActions}>
          <TouchableOpacity style={styles.confirmDialogButton} onPress={onCancel}>
            <Text style={styles.confirmDialogButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.confirmDialogButton, styles.confirmDialogButtonPrimary]} 
            onPress={onConfirm}
          >
            <Text style={[styles.confirmDialogButtonText, styles.confirmDialogButtonTextPrimary]}>
              Clear History
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const ProgressSummary: React.FC<ProgressSummaryProps> = ({ context, onViewDetails, onOptionsPress }) => {
  const { currentProgress, remainingTargets, userProfile } = context;
  const today = currentProgress.today;
  
  const getStatusColor = (percentage: number): string => {
    if (percentage >= 0.8 && percentage <= 1.2) return Colors.success;
    if (percentage >= 0.6 && percentage < 0.8) return Colors.warning;
    return Colors.error;
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 0.8 && percentage <= 1.2) return CheckCircle;
    if (percentage >= 0.6) return AlertCircle;
    return AlertCircle;
  };

  return (
    <View style={styles.progressSummary}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitle}>
          <Target size={20} color={Colors.text} />
          <Text style={styles.progressTitleText}>Today's Progress</Text>
        </View>
        <View style={styles.progressHeaderActions}>
          {onViewDetails && (
            <TouchableOpacity onPress={onViewDetails} style={styles.viewDetailsButton}>
              <Text style={styles.viewDetailsText}>Details</Text>
            </TouchableOpacity>
          )}
          {onOptionsPress && (
            <TouchableOpacity onPress={onOptionsPress} style={styles.optionsButton}>
              <MoreVertical size={20} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.progressGrid}>
        {/* Calories */}
        <View style={styles.progressItem}>
          <View style={styles.progressItemHeader}>
            <Text style={styles.progressItemLabel}>Calories</Text>
            {React.createElement(getStatusIcon(today.calories.percentage), {
              size: 14,
              color: getStatusColor(today.calories.percentage)
            })}
          </View>
          <Text style={styles.progressItemValue}>
            {today.calories.consumed} / {userProfile.calculatedGoals.dailyCalories}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, today.calories.percentage * 100)}%`,
                  backgroundColor: getStatusColor(today.calories.percentage)
                }
              ]} 
            />
          </View>
          {remainingTargets.calories > 0 && (
            <Text style={styles.progressRemaining}>
              {remainingTargets.calories} remaining
            </Text>
          )}
        </View>

        {/* Protein */}
        <View style={styles.progressItem}>
          <View style={styles.progressItemHeader}>
            <Text style={styles.progressItemLabel}>Protein</Text>
            {React.createElement(getStatusIcon(today.macros.protein.percentage), {
              size: 14,
              color: getStatusColor(today.macros.protein.percentage)
            })}
          </View>
          <Text style={styles.progressItemValue}>
            {today.macros.protein.consumed}g / {userProfile.calculatedGoals.protein}g
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, today.macros.protein.percentage * 100)}%`,
                  backgroundColor: getStatusColor(today.macros.protein.percentage)
                }
              ]} 
            />
          </View>
          {remainingTargets.protein > 0 && (
            <Text style={styles.progressRemaining}>
              {Math.round(remainingTargets.protein)}g remaining
            </Text>
          )}
        </View>
      </View>

      {/* Weekly Adherence */}
      <View style={styles.weeklyAdherence}>
        <View style={styles.adherenceHeader}>
          <TrendingUp size={16} color={Colors.primary} />
          <Text style={styles.adherenceLabel}>Weekly Adherence</Text>
        </View>
        <Text style={styles.adherenceValue}>
          {Math.round(currentProgress.adherenceScore * 100)}%
        </Text>
      </View>
    </View>
  );
};

interface QuickPromptsProps {
  prompts: string[];
  onPromptPress: (prompt: string) => void;
}

const QuickPrompts: React.FC<QuickPromptsProps> = ({ prompts, onPromptPress }) => {
  if (prompts.length === 0) return null;

  return (
    <View style={styles.quickPromptsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.quickPrompts}>
          {prompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickPrompt}
              onPress={() => onPromptPress(prompt)}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

interface QuickActionsProps {
  actions: QuickAction[];
  onActionPress: (action: QuickAction) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions, onActionPress }) => {
  if (actions.length === 0) return null;

  return (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionButton}
            onPress={() => onActionPress(action)}
          >
            <Text style={styles.quickActionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

interface MealSuggestionsProps {
  suggestions: MealSuggestion[];
  onSuggestionPress: (suggestion: MealSuggestion) => void;
}

const MealSuggestions: React.FC<MealSuggestionsProps> = ({ suggestions, onSuggestionPress }) => {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.mealSuggestionsContainer}>
      <Text style={styles.mealSuggestionsTitle}>Meal Suggestions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.mealSuggestions}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.mealSuggestionCard}
              onPress={() => onSuggestionPress(suggestion)}
            >
              <Text style={styles.mealSuggestionName}>{suggestion.name}</Text>
              <Text style={styles.mealSuggestionCalories}>{suggestion.calories} cal</Text>
              <Text style={styles.mealSuggestionProtein}>{suggestion.protein}g protein</Text>
              <Text style={styles.mealSuggestionDescription} numberOfLines={2}>
                {suggestion.description}
              </Text>
              {suggestion.quickLog && (
                <View style={styles.quickLogBadge}>
                  <Text style={styles.quickLogText}>Quick Log</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

interface InsightCardProps {
  insight: CoachingInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const getInsightIcon = () => {
    switch (insight.type) {
      case 'celebration': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'suggestion': return Target;
      default: return Brain;
    }
  };

  const getInsightColor = () => {
    switch (insight.type) {
      case 'celebration': return Colors.success;
      case 'warning': return Colors.error;
      case 'suggestion': return Colors.primary;
      default: return Colors.text;
    }
  };

  const Icon = getInsightIcon();
  const color = getInsightColor();

  return (
    <View style={[styles.insightCard, { borderLeftColor: color }]}>
      <View style={styles.insightHeader}>
        <Icon size={16} color={color} />
        <Text style={[styles.insightType, { color }]}>
          {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
        </Text>
        {insight.priority === 'high' && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>!</Text>
          </View>
        )}
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      {insight.timeframe && (
        <Text style={styles.insightTimeframe}>Timeframe: {insight.timeframe}</Text>
      )}
    </View>
  );
};

export const NutritionCoachChatInterface: React.FC<NutritionCoachChatProps> = ({
  onLogMeal,
  onUpdateGoals,
  onViewProgress,
  onQuickLogFood,
  onSetReminder
}) => {
  const { getDailyProgress, weeklyTrends, loggedMeals, goals } = useNutrition();
  const { profile } = useUserProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [personalityPreferences, setPersonalityPreferences] = useState<CoachingPersonality>(PERSONALITY_PRESETS.beginner);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const messageIdRef = useRef(0);

  // Build AI context
  const aiContext = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayProgress = getDailyProgress(today);
    const recentMeals = loggedMeals.slice(-21); // Last 3 weeks
    
    return buildNutritionCoachAiContext(
      profile,
      todayProgress,
      weeklyTrends,
      recentMeals,
      goals
    );
  }, [profile, getDailyProgress, weeklyTrends, loggedMeals, goals]);

  const quickPrompts = useMemo(() => {
    const { remainingTargets } = aiContext;
    const prompts: string[] = [];
    
    if (remainingTargets.calories > 300) {
      prompts.push("What should I eat for dinner?");
    }
    
    if (remainingTargets.protein > 15) {
      prompts.push("I need more protein");
    }
    
    if (remainingTargets.timeOfDay === 'morning') {
      prompts.push("Breakfast ideas?");
    } else if (remainingTargets.timeOfDay === 'afternoon') {
      prompts.push("Healthy lunch options?");
    }
    
    prompts.push("How am I doing today?");
    prompts.push("Quick snack ideas");
    
    return prompts.slice(0, 4); // Max 4 prompts
  }, [aiContext]);
  const currentInsights = useMemo(() => generateCoachingInsights(aiContext), [aiContext]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Send initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = generateInitialGreeting(aiContext);
      setMessages([{
        id: `msg-${messageIdRef.current++}`,
        role: 'coach',
        content: greeting,
        timestamp: new Date(),
        insights: currentInsights.slice(0, 2) // Show top 2 insights
      }]);
    }
  }, [aiContext, messages.length, currentInsights]);

  const generateInitialGreeting = (context: NutritionCoachAiContext): string => {
    const { remainingTargets, currentProgress } = context;
    const adherence = Math.round((currentProgress.adherenceScore || 0) * 100);
    
    // Concise, coach-like greeting based on current status
    if (adherence > 85) {
      return `Hi! You're crushing it with ${adherence}% adherence. You have ${remainingTargets.calories} calories left today.`;
    } else if (remainingTargets.calories > 500) {
      return `Hey there! You have ${remainingTargets.calories} calories and ${Math.round(remainingTargets.protein)}g protein left today. Let's plan your meals.`;
    } else if (remainingTargets.calories < 100) {
      return `Good job today! You're almost at your calorie goal. Just ${remainingTargets.calories} calories remaining.`;
    } else {
      return `Hi! You need ${remainingTargets.calories} calories and ${Math.round(remainingTargets.protein)}g protein today. How can I help?`;
    }
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
      // Use concise coaching system optimized for open-source models
      const aiMessages: AiChatMessage[] = createConciseNutritionCoachPrompt(trimmed, aiContext);
      const response = await createChatCompletion(aiMessages);
      
      // Parse and validate the response
      const parsedResponse = parseCoachResponse(response);
      let finalResponse = parsedResponse.message;
      
      // Fallback to quick response if AI response is too long or unclear
      if (finalResponse.length > 150 || !finalResponse.includes('calorie') && !finalResponse.includes('protein')) {
        finalResponse = generateQuickResponse(aiContext);
      }
      
      // Generate contextual quick actions and meal suggestions
      const quickActions = generateQuickActionsForMessage(trimmed, aiContext);
      const mealSuggestions = generateMealSuggestionsForContext(aiContext);
      
      // Get relevant insights (max 1 for conciseness)
      const responseInsights = currentInsights.filter(insight => 
        insight.priority === 'high'
      ).slice(0, 1);
      
      const coachMessage: ChatMessage = {
        id: `msg-${messageIdRef.current++}`,
        role: 'coach',
        content: finalResponse,
        timestamp: new Date(),
        insights: responseInsights.length > 0 ? responseInsights : undefined,
        quickActions: quickActions.length > 0 ? quickActions.slice(0, 2) : undefined, // Max 2 actions
        mealSuggestions: mealSuggestions.length > 0 ? mealSuggestions.slice(0, 2) : undefined // Max 2 suggestions
      };

      setMessages(prev => [...prev, coachMessage]);
      
    } catch (error) {
      console.error('Nutrition coach AI error:', error);
      // Use fallback response instead of generic error
      const fallbackResponse = getFallbackResponse();
      const errorMessage: ChatMessage = {
        id: `msg-${messageIdRef.current++}`,
        role: 'coach',
        content: fallbackResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const handleQuickAction = (action: QuickAction) => {
    switch (action.type) {
      case 'log_meal':
        if (onLogMeal && action.data) {
          onLogMeal(action.data);
          sendMessage(`I logged ${action.data.name} for you.`);
        }
        break;
      case 'quick_log':
        if (onQuickLogFood && action.data) {
          onQuickLogFood(action.data.name, action.data.calories);
          sendMessage(`I quickly logged ${action.data.name} (${action.data.calories} calories) for you.`);
        }
        break;
      case 'set_reminder':
        if (onSetReminder && action.data) {
          onSetReminder(action.data.type, action.data.time);
          sendMessage(`I set a ${action.data.type} reminder for ${action.data.time}.`);
        }
        break;
      case 'view_progress':
        if (onViewProgress) {
          onViewProgress();
        }
        break;
      case 'adjust_goals':
        if (onUpdateGoals && action.data) {
          onUpdateGoals(action.data);
          sendMessage('I updated your goals based on your progress.');
        }
        break;
    }
  };

  const handleMealSuggestion = (suggestion: MealSuggestion) => {
    if (suggestion.quickLog && onQuickLogFood) {
      onQuickLogFood(suggestion.name, suggestion.calories);
      sendMessage(`I logged ${suggestion.name} for you. Great choice!`);
    } else {
      sendMessage(`Tell me more about ${suggestion.name}. Should I help you log it?`);
    }
  };

  const showClearHistoryConfirm = () => {
    setShowOptionsMenu(false);
    setShowClearConfirm(true);
  };

  const confirmClearHistory = () => {
    setMessages([]);
    setShowClearConfirm(false);
    
    // Send a fresh greeting after clearing
    setTimeout(() => {
      const greeting = generateInitialGreeting(aiContext);
      setMessages([{
        id: `msg-${messageIdRef.current++}`,
        role: 'coach',
        content: greeting,
        timestamp: new Date(),
        insights: currentInsights.slice(0, 1)
      }]);
    }, 100);
  };

  const cancelClearHistory = () => {
    setShowClearConfirm(false);
  };

  const handleOptionsMenuPress = () => {
    setShowOptionsMenu(!showOptionsMenu);
  };

  const generateQuickActionsForMessage = (message: string, context: NutritionCoachAiContext): QuickAction[] => {
    const actions: QuickAction[] = [];
    const lowerMessage = message.toLowerCase();

    // Add context-aware quick actions
    if (lowerMessage.includes('log') || lowerMessage.includes('ate') || lowerMessage.includes('had')) {
      actions.push({
        id: 'quick-log-meal',
        type: 'log_meal',
        label: 'Log Full Meal',
        data: null
      });
    }

    if (context.remainingTargets.calories > 200) {
      actions.push({
        id: 'meal-suggestions',
        type: 'quick_log',
        label: 'Get Meal Ideas',
        data: null
      });
    }

    if (lowerMessage.includes('remind') || lowerMessage.includes('forget')) {
      actions.push({
        id: 'set-reminder',
        type: 'set_reminder',
        label: 'Set Reminder',
        data: { type: 'meal', time: '12:00' }
      });
    }

    return actions;
  };

  const generateMealSuggestionsForContext = (context: NutritionCoachAiContext): MealSuggestion[] => {
    const suggestions: MealSuggestion[] = [];
    const { remainingTargets } = context;

    // Generate suggestions based on remaining targets
    if (remainingTargets.calories > 300 && remainingTargets.protein > 15) {
      suggestions.push({
        id: 'protein-meal',
        name: 'Chicken & Rice Bowl',
        calories: 450,
        protein: 35,
        description: 'Balanced meal with lean protein and complex carbs',
        quickLog: true
      });
    }

    if (remainingTargets.calories < 200 && remainingTargets.calories > 50) {
      suggestions.push({
        id: 'light-snack',
        name: 'Greek Yogurt with Berries',
        calories: 150,
        protein: 15,
        description: 'Light, protein-rich snack',
        quickLog: true
      });
    }

    if (remainingTargets.protein > 20) {
      suggestions.push({
        id: 'protein-shake',
        name: 'Protein Smoothie',
        calories: 250,
        protein: 25,
        description: 'Quick protein boost with fruits',
        quickLog: true
      });
    }

    return suggestions;
  };

  const TAB_BAR_HEIGHT = 56;
  const composerBottomOffset = TAB_BAR_HEIGHT + Math.max(insets.bottom, 0) + 12;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Progress Summary */}
      <ProgressSummary 
        context={aiContext} 
        onViewDetails={onViewProgress}
        onOptionsPress={handleOptionsMenuPress}
      />

      {/* Options Menu */}
      {/* Options and confirm dialogs hidden for a cleaner UI */}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.lg + 120 + composerBottomOffset,
        }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.bubble,
            message.role === 'user' ? styles.bubbleUser : styles.bubbleCoach
          ]}>
            <Text style={[
              styles.bubbleText,
              message.role === 'user' && styles.bubbleTextOnPrimary
            ]}>
              {message.content}
            </Text>
            
            {/* Inline insights/actions/suggestions hidden to reduce clutter */}

            <Text style={[
              styles.messageTime,
              message.role === 'user' && styles.messageTimeOnPrimary
            ]}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubble, styles.bubbleCoach]}>
            <Text style={styles.bubbleText}>Analyzing your nutrition data...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      {/* Quick prompts hidden for a minimal chat surface */}

      {/* Composer */}
      <View style={[styles.composer, { bottom: composerBottomOffset }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your nutrition goals, progress, or what to eat..."
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
  progressSummary: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  progressHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTitleText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  viewDetailsButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
  },
  viewDetailsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressItemLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  progressItemValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressRemaining: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
  },
  weeklyAdherence: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adherenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  adherenceLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  adherenceValue: {
    fontSize: Typography.sizes.lg,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
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
  bubbleCoach: {
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
    marginBottom: 4,
  },
  bubbleTextOnPrimary: {
    color: Colors.white,
  },
  messageTime: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: 4,
  },
  messageTimeOnPrimary: {
    color: Colors.white + '80',
  },
  insightsContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  insightCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderLeftWidth: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  insightType: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    flex: 1,
  },
  priorityBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  insightMessage: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  insightTimeframe: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: 4,
    fontStyle: 'italic',
  },
  quickPromptsWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
  },
  quickPromptsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickPrompts: {
    flexDirection: 'row',
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
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.tabBackground,
    zIndex: 100,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    ...Type.body,
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
  quickActionsContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  quickActionsTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  quickActionButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  quickActionText: {
    ...Type.caption,
    color: Colors.primary,
  },
  mealSuggestionsContainer: {
    marginTop: Spacing.sm,
  },
  mealSuggestionsTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  mealSuggestions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  mealSuggestionCard: {
    width: 180,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  mealSuggestionName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  mealSuggestionCalories: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  mealSuggestionProtein: {
    fontSize: Typography.sizes.sm,
    color: Colors.success,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  mealSuggestionDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    lineHeight: 16,
  },
  quickLogBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quickLogText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  optionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  optionsMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  optionsMenu: {
    position: 'absolute',
    top: 120,
    right: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 180,
    zIndex: 1001,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  optionsMenuText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  confirmDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDialogBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  confirmDialog: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  confirmDialogTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  confirmDialogMessage: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  confirmDialogActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  confirmDialogButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
  },
  confirmDialogButtonPrimary: {
    backgroundColor: Colors.error,
  },
  confirmDialogButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  confirmDialogButtonTextPrimary: {
    color: Colors.white,
  },
});
