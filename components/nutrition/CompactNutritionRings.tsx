import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { DailyProgress } from '@/hooks/useNutrition';

interface CompactNutritionRingsProps {
  dailyProgress: DailyProgress;
  onPress?: () => void;
  isLoading?: boolean;
}

interface CalorieBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  dailyProgress: DailyProgress;
}

const CalorieBreakdownModal: React.FC<CalorieBreakdownModalProps> = ({
  visible,
  onClose,
  dailyProgress,
}) => {
  const { calories, macros } = dailyProgress;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'met': return Colors.success;
      case 'over': return Colors.warning;
      default: return Colors.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'met': return <TrendingUp size={16} color={Colors.success} />;
      case 'over': return <TrendingUp size={16} color={Colors.warning} />;
      default: return <Minus size={16} color={Colors.primary} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'met': return 'Goal Met';
      case 'over': return 'Over Goal';
      default: return 'Under Goal';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nutrition Breakdown</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Status Overview */}
          <View style={styles.statusSection}>
            <View style={[styles.statusCard, { borderColor: getStatusColor(dailyProgress.status) }]}>
              <View style={styles.statusHeader}>
                {getStatusIcon(dailyProgress.status)}
                <Text style={[styles.statusText, { color: getStatusColor(dailyProgress.status) }]}>
                  {getStatusText(dailyProgress.status)}
                </Text>
              </View>
              <Text style={styles.statusDescription}>
                {dailyProgress.status === 'met' 
                  ? 'You\'re right on track with your calorie goal!'
                  : dailyProgress.status === 'over'
                  ? 'You\'ve exceeded your daily calorie goal.'
                  : `You have ${calories.remaining} calories remaining for today.`
                }
              </Text>
            </View>
          </View>

          {/* Calorie Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calorie Breakdown</Text>
            
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total Consumed</Text>
                <Text style={styles.breakdownValue}>{calories.consumed} cal</Text>
              </View>
              
              {calories.fromLogged > 0 && (
                <View style={styles.breakdownSubRow}>
                  <Text style={styles.breakdownSubLabel}>• From logged food</Text>
                  <Text style={styles.breakdownSubValue}>{calories.fromLogged} cal</Text>
                </View>
              )}
              
              {calories.fromPlanned > 0 && (
                <View style={styles.breakdownSubRow}>
                  <Text style={styles.breakdownSubLabel}>• From meal plan</Text>
                  <Text style={styles.breakdownSubValue}>{calories.fromPlanned} cal</Text>
                </View>
              )}
              
              <View style={styles.breakdownDivider} />
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Daily Goal</Text>
                <Text style={styles.breakdownValue}>{calories.goal} cal</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <Text style={[
                  styles.breakdownLabel,
                  { color: calories.remaining > 0 ? Colors.primary : Colors.warning }
                ]}>
                  {calories.remaining > 0 ? 'Remaining' : 'Over by'}
                </Text>
                <Text style={[
                  styles.breakdownValue,
                  { color: calories.remaining > 0 ? Colors.primary : Colors.warning }
                ]}>
                  {Math.abs(calories.remaining)} cal
                </Text>
              </View>
            </View>
          </View>

          {/* Macros Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Macronutrients</Text>
            
            {[
              { name: 'Protein', data: macros.protein, color: '#FF6B6B', unit: 'g' },
              { name: 'Fats', data: macros.fats, color: '#45B7D1', unit: 'g' },
              { name: 'Carbs', data: macros.carbs, color: '#4ECDC4', unit: 'g' },
            ].map((macro) => (
              <View key={macro.name} style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <View style={styles.macroTitleRow}>
                    <View style={[styles.macroColorDot, { backgroundColor: macro.color }]} />
                    <Text style={styles.macroName}>{macro.name}</Text>
                  </View>
                  <Text style={styles.macroValues}>
                    {Math.round(macro.data.consumed)}{macro.unit} / {Math.round(macro.data.goal)}{macro.unit}
                  </Text>
                </View>
                
                <View style={styles.macroProgressContainer}>
                  <View style={styles.macroProgressTrack}>
                    <View 
                      style={[
                        styles.macroProgressFill,
                        { 
                          width: `${Math.min(100, macro.data.percentage * 100)}%`,
                          backgroundColor: macro.color,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.macroPercentage}>
                    {Math.round(macro.data.percentage * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tips Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tips</Text>
            <View style={styles.tipsCard}>
              <View style={styles.tipRow}>
                <Info size={16} color={Colors.primary} />
                <Text style={styles.tipText}>
                  {dailyProgress.status === 'under' 
                    ? 'Consider adding a healthy snack to meet your calorie goal.'
                    : dailyProgress.status === 'over'
                    ? 'Try lighter options for your remaining meals today.'
                    : 'Great job staying on track with your nutrition goals!'
                  }
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export const CompactNutritionRings: React.FC<CompactNutritionRingsProps> = ({
  dailyProgress,
  onPress,
  isLoading = false,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  const { calories, macros } = dailyProgress;
  
  // Main calorie ring calculations
  const percentage = calories.goal > 0 ? calories.consumed / calories.goal : 0;
  const radius = 85; // Reduced from 100 for more compact design
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference * Math.min(1, percentage);
  
  // Determine ring color based on status
  const ringColor = useMemo(() => {
    if (percentage >= 0.95 && percentage <= 1.05) {
      return '#FDB813'; // Met goal - golden yellow like in design
    } else if (percentage > 1.05) {
      return Colors.warning; // Over goal
    } else {
      return '#FDB813'; // Under goal - keep golden
    }
  }, [percentage]);

  // Determine display values
  const isOverGoal = calories.consumed > calories.goal && calories.goal > 0;
  const displayValue = calories.goal > 0 ? (isOverGoal ? calories.consumed - calories.goal : calories.remaining) : calories.consumed;
  const displayLabel = calories.goal > 0 ? (isOverGoal ? 'kcal over' : 'kcal left') : 'kcal eaten';

  // Macro ring calculations
  const macroRings = [
    { name: 'Protein', data: macros.protein, color: '#FF6B6B', position: 'left' },
    { name: 'Fat', data: macros.fats, color: '#45B7D1', position: 'center' },
    { name: 'Carbs', data: macros.carbs, color: '#4ECDC4', position: 'right' },
  ];

  const macroRingSize = 80; // Smaller macro rings
  const macroStrokeWidth = 8;
  const macroRadius = (macroRingSize - macroStrokeWidth) / 2;
  const macroCircumference = 2 * Math.PI * macroRadius;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowBreakdown(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingRing}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Main Calorie Ring */}
        <View style={styles.mainRingContainer}>
          <Svg width={200} height={200}>
            <Defs>
              <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={ringColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={ringColor} stopOpacity="0.9" />
              </LinearGradient>
            </Defs>
            
            {/* Background circle */}
            <Circle 
              cx={100} 
              cy={100} 
              r={radius} 
              stroke={Colors.border} 
              strokeWidth={strokeWidth} 
              fill="none" 
              opacity={0.3}
            />
            
            {/* Progress circle */}
            <Circle
              cx={100}
              cy={100}
              r={radius}
              stroke="url(#ringGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDasharray}, ${circumference}`}
              strokeLinecap="round"
              fill="none"
              rotation={-90}
              origin="100, 100"
            />
          </Svg>
          
          {/* Center Content */}
          <View style={styles.centerContent}>
            <Text style={styles.calorieNumber}>{Math.abs(displayValue)}</Text>
            <Text style={styles.calorieLabel}>kcal</Text>
          </View>
        </View>

        {/* Compact Macro Rings - positioned closer to main ring */}
        <View style={styles.macroRingsContainer}>
          {macroRings.map((macro, index) => {
            const macroPercentage = Math.min(1, macro.data.percentage);
            const macroStrokeDasharray = macroCircumference * macroPercentage;
            
            return (
              <View key={macro.name} style={styles.macroRingItem}>
                <Svg width={macroRingSize} height={macroRingSize}>
                  {/* Background circle */}
                  <Circle 
                    cx={macroRingSize/2} 
                    cy={macroRingSize/2} 
                    r={macroRadius} 
                    stroke={macro.color + '20'} 
                    strokeWidth={macroStrokeWidth} 
                    fill="none" 
                  />
                  
                  {/* Progress circle */}
                  <Circle
                    cx={macroRingSize/2}
                    cy={macroRingSize/2}
                    r={macroRadius}
                    stroke={macro.color}
                    strokeWidth={macroStrokeWidth}
                    strokeDasharray={`${macroStrokeDasharray}, ${macroCircumference}`}
                    strokeLinecap="round"
                    fill="none"
                    rotation={-90}
                    origin={`${macroRingSize/2}, ${macroRingSize/2}`}
                  />
                </Svg>
                
                {/* Macro Center Content */}
                <View style={styles.macroCenterContent}>
                  <Text style={[styles.macroValue, { color: macro.color }]}>
                    {Math.round(macro.data.consumed)}
                  </Text>
                  <Text style={styles.macroUnit}>g</Text>
                </View>
                
                {/* Macro Label */}
                <Text style={styles.macroLabel}>{macro.name}</Text>
              </View>
            );
          })}
        </View>
      </TouchableOpacity>

      {/* Breakdown Modal */}
      <CalorieBreakdownModal
        visible={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        dailyProgress={dailyProgress}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mainRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // Reduced spacing between main ring and macro rings
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieNumber: {
    color: Colors.text,
    fontSize: 36, // Slightly smaller for compact design
    fontWeight: Typography.weights.bold,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  calorieLabel: {
    color: Colors.lightText,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  macroRingsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20, // Reduced gap between macro rings
  },
  macroRingItem: {
    alignItems: 'center',
    position: 'relative',
  },
  macroCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    lineHeight: 18,
  },
  macroUnit: {
    color: Colors.lightText,
    fontSize: 10,
    fontWeight: '600',
  },
  macroLabel: {
    color: Colors.lightText,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingRing: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    color: Colors.lightText,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Modal styles (reused from EnhancedCalorieRing)
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  
  // Status section
  statusSection: {
    marginVertical: Spacing.md,
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.sm,
  },
  statusDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 20,
  },
  
  // Section styles
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  
  // Breakdown styles
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  breakdownSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  breakdownLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  breakdownSubLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  breakdownValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  breakdownSubValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  
  // Macro styles
  macroCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  macroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  macroName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  macroValues: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  macroProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroPercentage: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    minWidth: 35,
    textAlign: 'right',
  },
  
  // Tips styles
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 20,
    marginLeft: Spacing.sm,
  },
});