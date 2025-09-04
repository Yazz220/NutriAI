import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calculator, Info, Target, Activity, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { NutritionGoals } from '@/types';
import { UserBasics, UserGoals, GoalType, ActivityLevel } from '@/hooks/useUserProfile';
import { 
  calculateNutritionGoals, 
  validateNutritionGoals, 
  getGoalExplanation,
  canCalculateGoals,
  ValidationResult 
} from '@/utils/goalCalculations';

interface GoalSettingsModalProps {
  visible: boolean;
  currentGoals?: NutritionGoals;
  userProfile?: {
    basics: UserBasics;
    goals: UserGoals;
  };
  onSave: (goals: NutritionGoals) => Promise<ValidationResult>;
  onClose: () => void;
}

type GoalMode = 'calculated' | 'manual';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'light', label: 'Light', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Heavy exercise 6-7 days/week' },
  { value: 'athlete', label: 'Athlete', description: 'Very heavy physical work or 2x/day training' },
];

const GOAL_TYPES: { value: GoalType; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose Weight', description: '500 cal deficit per day' },
  { value: 'maintain', label: 'Maintain Weight', description: 'No calorie adjustment' },
  { value: 'gain', label: 'Gain Weight', description: '300 cal surplus per day' },
];

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  visible,
  currentGoals,
  userProfile,
  onSave,
  onClose,
}) => {
  const [goalMode, setGoalMode] = useState<GoalMode>('calculated');
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Manual goal inputs
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFats, setManualFats] = useState('');
  
  // Calculated goal inputs
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('light');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  
  // Calculated goals display
  const [calculatedGoals, setCalculatedGoals] = useState<NutritionGoals | null>(null);
  const [calculationExplanation, setCalculationExplanation] = useState<string>('');

  // Initialize form when modal opens
  useEffect(() => {
    if (visible) {
      // Set initial values from current goals or user profile
      if (currentGoals) {
        setManualCalories(currentGoals.dailyCalories.toString());
        setManualProtein(currentGoals.protein.toString());
        setManualCarbs(currentGoals.carbs.toString());
        setManualFats(currentGoals.fats.toString());
      }
      
      if (userProfile?.goals) {
        setActivityLevel(userProfile.goals.activityLevel || 'light');
        setGoalType(userProfile.goals.goalType || 'maintain');
      }
      
      // Determine initial mode
      const canCalculate = userProfile ? canCalculateGoals(userProfile.basics) : false;
      setGoalMode(canCalculate ? 'calculated' : 'manual');
      
      // Calculate goals if possible
      if (canCalculate) {
        calculateGoals();
      }
    }
  }, [visible, currentGoals, userProfile]);

  // Recalculate when activity level or goal type changes
  useEffect(() => {
    if (goalMode === 'calculated' && userProfile) {
      calculateGoals();
    }
  }, [activityLevel, goalType, goalMode, userProfile]);

  const calculateGoals = () => {
    if (!userProfile || !canCalculateGoals(userProfile.basics)) return;
    
    const goals = { ...userProfile.goals, activityLevel, goalType };
    const calculated = calculateNutritionGoals(userProfile.basics, goals);
    
    if (calculated) {
      setCalculatedGoals(calculated);
      setCalculationExplanation(getGoalExplanation(userProfile.basics, goals, calculated));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      let goalsToSave: NutritionGoals;
      
      if (goalMode === 'calculated' && calculatedGoals) {
        goalsToSave = calculatedGoals;
      } else {
        // Validate manual inputs
        const calories = Number(manualCalories);
        const protein = Number(manualProtein);
        const carbs = Number(manualCarbs);
        const fats = Number(manualFats);
        
        if (isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fats)) {
          Alert.alert('Invalid Input', 'Please enter valid numbers for all fields');
          return;
        }
        
        goalsToSave = {
          dailyCalories: calories,
          protein,
          carbs,
          fats,
        };
      }
      
      const validation = await onSave(goalsToSave);
      
      if (validation.isValid) {
        if (validation.warnings.length > 0) {
          Alert.alert(
            'Goals Saved',
            `Your goals have been saved with the following notes:\n\n${validation.warnings.join('\n')}`,
            [{ text: 'OK', onPress: onClose }]
          );
        } else {
          onClose();
        }
      } else {
        Alert.alert('Validation Error', validation.errors.join('\n'));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderModeSelector = () => {
    const canCalculate = userProfile ? canCalculateGoals(userProfile.basics) : false;
    
    return (
      <View style={styles.modeSelector}>
        <Text style={styles.sectionTitle}>Goal Setting Method</Text>
        
        <TouchableOpacity
          style={[
            styles.modeOption,
            goalMode === 'calculated' && styles.selectedModeOption,
            !canCalculate && styles.disabledModeOption,
          ]}
          onPress={() => canCalculate && setGoalMode('calculated')}
          disabled={!canCalculate}
        >
          <View style={styles.modeOptionHeader}>
            <Calculator size={20} color={canCalculate ? Colors.primary : Colors.lightText} />
            <Text style={[
              styles.modeOptionTitle,
              !canCalculate && styles.disabledText,
            ]}>
              Calculate from Profile
            </Text>
          </View>
          <Text style={[
            styles.modeOptionDescription,
            !canCalculate && styles.disabledText,
          ]}>
            {canCalculate 
              ? 'Automatically calculate goals based on your age, weight, height, and activity level'
              : 'Complete your profile (age, weight, height) to use automatic calculation'
            }
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeOption,
            goalMode === 'manual' && styles.selectedModeOption,
          ]}
          onPress={() => setGoalMode('manual')}
        >
          <View style={styles.modeOptionHeader}>
            <Target size={20} color={Colors.primary} />
            <Text style={styles.modeOptionTitle}>Set Manually</Text>
          </View>
          <Text style={styles.modeOptionDescription}>
            Enter your own calorie and macro targets
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCalculatedGoals = () => {
    if (goalMode !== 'calculated') return null;
    
    return (
      <View style={styles.calculatedSection}>
        <Text style={styles.sectionTitle}>Goal Parameters</Text>
        
        {/* Activity Level */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Activity Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.optionButton,
                  activityLevel === level.value && styles.selectedOptionButton,
                ]}
                onPress={() => setActivityLevel(level.value)}
              >
                <Text style={[
                  styles.optionButtonText,
                  activityLevel === level.value && styles.selectedOptionButtonText,
                ]}>
                  {level.label}
                </Text>
                <Text style={[
                  styles.optionButtonDescription,
                  activityLevel === level.value && styles.selectedOptionButtonDescription,
                ]}>
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Goal Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Goal Type</Text>
          <View style={styles.goalTypeContainer}>
            {GOAL_TYPES.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                style={[
                  styles.goalTypeButton,
                  goalType === goal.value && styles.selectedGoalTypeButton,
                ]}
                onPress={() => setGoalType(goal.value)}
              >
                <Text style={[
                  styles.goalTypeButtonText,
                  goalType === goal.value && styles.selectedGoalTypeButtonText,
                ]}>
                  {goal.label}
                </Text>
                <Text style={[
                  styles.goalTypeButtonDescription,
                  goalType === goal.value && styles.selectedGoalTypeButtonDescription,
                ]}>
                  {goal.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Calculated Results */}
        {calculatedGoals && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Calculated Goals</Text>
              <TouchableOpacity
                style={styles.explanationButton}
                onPress={() => setShowExplanation(!showExplanation)}
              >
                <Info size={16} color={Colors.primary} />
                <Text style={styles.explanationButtonText}>How?</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.resultsGrid}>
              <View style={styles.resultCard}>
                <Text style={styles.resultValue}>{calculatedGoals.dailyCalories}</Text>
                <Text style={styles.resultLabel}>Calories</Text>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultValue}>{calculatedGoals.protein}g</Text>
                <Text style={styles.resultLabel}>Protein</Text>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultValue}>{calculatedGoals.carbs}g</Text>
                <Text style={styles.resultLabel}>Carbs</Text>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultValue}>{calculatedGoals.fats}g</Text>
                <Text style={styles.resultLabel}>Fats</Text>
              </View>
            </View>
            
            {showExplanation && (
              <View style={styles.explanationCard}>
                <Text style={styles.explanationText}>{calculationExplanation}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderManualGoals = () => {
    if (goalMode !== 'manual') return null;
    
    return (
      <View style={styles.manualSection}>
        <Text style={styles.sectionTitle}>Manual Goal Entry</Text>
        
        <View style={styles.inputGrid}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Daily Calories</Text>
            <TextInput
              style={styles.input}
              value={manualCalories}
              onChangeText={setManualCalories}
              keyboardType="numeric"
              placeholder="2000"
              placeholderTextColor={Colors.lightText}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={manualProtein}
              onChangeText={setManualProtein}
              keyboardType="numeric"
              placeholder="125"
              placeholderTextColor={Colors.lightText}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={manualCarbs}
              onChangeText={setManualCarbs}
              keyboardType="numeric"
              placeholder="250"
              placeholderTextColor={Colors.lightText}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Fats (g)</Text>
            <TextInput
              style={styles.input}
              value={manualFats}
              onChangeText={setManualFats}
              keyboardType="numeric"
              placeholder="56"
              placeholderTextColor={Colors.lightText}
            />
          </View>
        </View>
        
        <View style={styles.tipCard}>
          <Info size={16} color={Colors.primary} />
          <Text style={styles.tipText}>
            Tip: A balanced macro split is typically 25% protein, 50% carbs, and 25% fats.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Nutrition Goals</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderModeSelector()}
            {renderCalculatedGoals()}
            {renderManualGoals()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.cancelButton}
            />
            <Button
              title="Save Goals"
              onPress={handleSave}
              style={styles.saveButton}
              loading={isLoading}
              disabled={
                goalMode === 'calculated' 
                  ? !calculatedGoals 
                  : !manualCalories || !manualProtein || !manualCarbs || !manualFats
              }
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  
  // Mode selector
  modeSelector: {
    marginBottom: Spacing.md,
  },
  modeOption: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedModeOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  disabledModeOption: {
    opacity: 0.6,
  },
  modeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modeOptionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  modeOptionDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 20,
  },
  disabledText: {
    color: Colors.lightText,
  },
  
  // Calculated goals
  calculatedSection: {
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  optionScroll: {
    flexDirection: 'row',
  },
  optionButton: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    minWidth: 120,
  },
  selectedOptionButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  optionButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedOptionButtonText: {
    color: Colors.primary,
  },
  optionButtonDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    textAlign: 'center',
  },
  selectedOptionButtonDescription: {
    color: Colors.primary,
  },
  goalTypeContainer: {
    gap: Spacing.sm,
  },
  goalTypeButton: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  selectedGoalTypeButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  goalTypeButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  selectedGoalTypeButtonText: {
    color: Colors.primary,
  },
  goalTypeButtonDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
  },
  selectedGoalTypeButtonDescription: {
    color: Colors.primary,
  },
  
  // Results
  resultsSection: {
    marginTop: Spacing.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  explanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  explanationButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  resultsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  resultCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  resultValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: 2,
  },
  resultLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
  },
  explanationCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  explanationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  
  // Manual goals
  manualSection: {
    marginBottom: Spacing.md,
  },
  inputGrid: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 20,
    marginLeft: Spacing.sm,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});