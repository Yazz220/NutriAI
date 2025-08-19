import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  CheckCircle, 
  Sparkles, 
  ArrowRight,
  FileText,
  Scan,
  MessageCircle,
  Clock
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
import { OnboardingCompletionLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { COMPLETION_ACTIONS, ONBOARDING_STEPS } from '@/constants/onboarding';

const { width: screenWidth } = Dimensions.get('window');

interface ActionCardProps {
  action: (typeof COMPLETION_ACTIONS)[number];
  onPress: (actionId: string) => void;
  delay: number;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onPress, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const getIcon = () => {
    switch (action.id) {
      case 'add_recipe':
        return <FileText size={24} color={Colors.primary} />;
      case 'scan_pantry':
        return <Scan size={24} color={Colors.success} />;
      case 'ask_ai':
        return <MessageCircle size={24} color={Colors.info} />;
      default:
        return <Sparkles size={24} color={Colors.primary} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.actionCard,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.actionCardContent}
        onPress={() => onPress(action.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.actionIcon}>
          {getIcon()}
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionDescription}>{action.description}</Text>
        </View>
        <ArrowRight size={20} color={Colors.lightText} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const CompletionScreen: React.FC = () => {
  const [autoNavigateTimer, setAutoNavigateTimer] = useState(10);
  const [showTimer, setShowTimer] = useState(true);
  
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const { state } = useOnboarding();
  const { finishOnboarding } = useOnboardingNavigation();
  const { trackOnboardingCompleted, trackUserChoice } = useOnboardingAnalytics();

  // Celebration animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [celebrationAnim]);

  // Auto-navigation timer
  useEffect(() => {
    if (!showTimer) return;

    const interval = setInterval(() => {
      setAutoNavigateTimer(prev => {
        if (prev <= 1) {
          handleAutoNavigate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  // Track completion on mount
  useEffect(() => {
    const totalTimeSpent = Date.now() - state.startTime.getTime();
    
    trackOnboardingCompleted({
      totalTimeSpent,
      completedSteps: Array.from(state.completedSteps),
      skippedSteps: Array.from(state.skippedSteps),
    });
  }, [state, trackOnboardingCompleted]);

  const handleActionPress = async (actionId: string) => {
    setShowTimer(false);
    
    trackUserChoice({
      step: 6, // OnboardingStep.COMPLETION
      choiceType: 'first_action',
      choiceValue: actionId,
    });

    await finishOnboarding(actionId);
  };

  const handleAutoNavigate = async () => {
    trackUserChoice({
      step: 6, // OnboardingStep.COMPLETION
      choiceType: 'first_action',
      choiceValue: 'auto_navigate',
    });

    await finishOnboarding();
  };

  const handleStayLonger = () => {
    setShowTimer(false);
    setAutoNavigateTimer(0);
  };

  const getSetupSummary = () => {
    const summary = [];
    
    if (state.userData.authMethod) {
      summary.push(`Signed in with ${state.userData.authMethod}`);
    }
    
    if (state.userData.dietaryPreferences?.length) {
      summary.push(`${state.userData.dietaryPreferences.length} dietary preference${state.userData.dietaryPreferences.length !== 1 ? 's' : ''}`);
    }
    
    if (state.userData.allergies?.length) {
      summary.push(`${state.userData.allergies.length} allergy avoidance${state.userData.allergies.length !== 1 ? 's' : ''}`);
    }
    
    if (state.userData.cookingSkill) {
      summary.push(`${state.userData.cookingSkill} cooking level`);
    }
    
    if (state.userData.initialInventory?.length) {
      summary.push(`${state.userData.initialInventory.length} inventory item${state.userData.initialInventory.length !== 1 ? 's' : ''}`);
    }

    return summary;
  };

  const setupSummary = getSetupSummary();

  return (
    <OnboardingCompletionLayout
      title={ONBOARDING_STEPS.COMPLETION.title}
      subtitle={ONBOARDING_STEPS.COMPLETION.subtitle}
    >
      <View style={styles.container}>
        {/* Celebration Section */}
        <Animated.View 
          style={[
            styles.celebrationSection,
            { transform: [{ scale: celebrationAnim }] }
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.success]}
            style={styles.celebrationIcon}
          >
            <CheckCircle size={48} color={Colors.white} />
          </LinearGradient>
          
          <Text style={styles.celebrationTitle}>
            🎉 Welcome to NutriAI!
          </Text>
          
          <Text style={styles.celebrationSubtitle}>
            Your personalized cooking assistant is ready to help you create amazing meals
          </Text>
        </Animated.View>

        {/* Setup Summary */}
        {setupSummary.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Your Setup:</Text>
            {setupSummary.map((item, index) => (
              <View key={index} style={styles.summaryItem}>
                <CheckCircle size={16} color={Colors.success} />
                <Text style={styles.summaryText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggested Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>Choose your first action:</Text>
          
          {COMPLETION_ACTIONS.map((action, index) => (
            <ActionCard
              key={action.id}
              action={action}
              onPress={handleActionPress}
              delay={200 + index * 150}
            />
          ))}
        </View>

        {/* Auto-navigation Timer */}
        {showTimer && autoNavigateTimer > 0 && (
          <View style={styles.timerSection}>
            <View style={styles.timerContainer}>
              <Clock size={16} color={Colors.lightText} />
              <Text style={styles.timerText}>
                Auto-continuing in {autoNavigateTimer}s
              </Text>
            </View>
            <TouchableOpacity
              style={styles.stayButton}
              onPress={handleStayLonger}
            >
              <Text style={styles.stayButtonText}>Stay here</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Continue */}
        {!showTimer && (
          <View style={styles.manualContinue}>
            <Button
              title="Continue to App"
              onPress={() => finishOnboarding()}
              variant="outline"
              size="lg"
              fullWidth={true}
            />
          </View>
        )}

        {/* Motivational Message */}
        <View style={styles.motivationSection}>
          <Text style={styles.motivationText}>
            🚀 You're all set to start your personalized cooking journey! 
            I'll help you reduce food waste, discover new recipes, and make cooking more enjoyable.
          </Text>
        </View>
      </View>
    </OnboardingCompletionLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: Spacing.lg,
  },

  // Celebration
  celebrationSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  celebrationIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.lg,
  },
  celebrationTitle: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: Typography.sizes.xxxl * 1.2,
  },
  celebrationSubtitle: {
    fontSize: Typography.sizes.lg,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: Typography.sizes.lg * 1.4,
    paddingHorizontal: Spacing.md,
  },

  // Summary
  summarySection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  summaryText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },

  // Actions
  actionsSection: {
    marginBottom: Spacing.xl,
  },
  actionsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  actionCard: {
    marginBottom: Spacing.md,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  actionDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: Typography.sizes.sm * 1.3,
  },

  // Timer
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.warning,
    fontWeight: Typography.weights.medium,
  },
  stayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stayButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.warning,
    fontWeight: Typography.weights.semibold,
  },

  // Manual Continue
  manualContinue: {
    marginBottom: Spacing.lg,
  },

  // Motivation
  motivationSection: {
    backgroundColor: Colors.info + '20',
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.info + '40',
  },
  motivationText: {
    fontSize: Typography.sizes.md,
    color: Colors.info,
    lineHeight: Typography.sizes.md * 1.4,
    textAlign: 'center',
  },
});