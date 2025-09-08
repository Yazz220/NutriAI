import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { MealType } from '@/types';

interface PlanMealModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (mealType: MealType, selectedDate: string) => void;
  recipeName: string;
  servings: number;
  defaultDate?: string;
}

const MEAL_TYPE_OPTIONS: { type: MealType; label: string; icon: string; description: string }[] = [
  {
    type: 'breakfast',
    label: 'Breakfast',
    icon: '🌅',
    description: 'Start your day right',
  },
  {
    type: 'lunch',
    label: 'Lunch',
    icon: '☀️',
    description: 'Midday fuel',
  },
  {
    type: 'dinner',
    label: 'Dinner',
    icon: '🌙',
    description: 'Evening meal',
  },
  {
    type: 'snack',
    label: 'Snack',
    icon: '🍎',
    description: 'Quick bite',
  },
];

export const PlanMealModal: React.FC<PlanMealModalProps> = ({
  visible,
  onClose,
  onConfirm,
  recipeName,
  servings,
  defaultDate,
}) => {
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    defaultDate || new Date().toISOString().split('T')[0]
  );

  const handleConfirm = () => {
    onConfirm(selectedMealType, selectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Plan Meal</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{recipeName}</Text>
          <View style={styles.recipeDetails}>
            <Text style={styles.recipeDetailText}>
              {servings} serving{servings !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <View style={styles.dateSectionHeader}>
            <Text style={styles.dateLabel}>Plan for which date?</Text>
          </View>
          <View style={styles.quickDateOptions}>
            {[0, 1, 2, 3, 4, 5, 6].map((daysAgo) => {
              const date = new Date();
              date.setDate(date.getDate() - daysAgo);
              const dateISO = date.toISOString().split('T')[0];
              const isSelected = selectedDate === dateISO;
              
              let label: string;
              if (daysAgo === 0) label = 'Today';
              else if (daysAgo === 1) label = 'Yesterday';
              else label = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              
              return (
                <TouchableOpacity
                  key={dateISO}
                  style={[styles.quickDateOption, isSelected && styles.quickDateOptionSelected]}
                  onPress={() => setSelectedDate(dateISO)}
                >
                  <Text style={[styles.quickDateOptionText, isSelected && styles.quickDateOptionTextSelected]}>
                    {label}
                  </Text>
                  {daysAgo <= 1 && (
                    <Text style={[styles.quickDateSubtext, isSelected && styles.quickDateSubtextSelected]}>
                      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>What meal is this for?</Text>
          <View style={styles.mealTypeGrid}>
            {MEAL_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.mealTypeCard,
                  selectedMealType === option.type && styles.mealTypeCardSelected,
                ]}
                onPress={() => setSelectedMealType(option.type)}
              >
                <View style={styles.mealTypeHeader}>
                  <Text style={styles.mealTypeIcon}>{option.icon}</Text>
                  {selectedMealType === option.type && (
                    <View style={styles.checkIcon}>
                      <Check size={16} color={Colors.white} />
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.mealTypeLabel,
                  selectedMealType === option.type && styles.mealTypeLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.mealTypeDescription,
                  selectedMealType === option.type && styles.mealTypeDescriptionSelected,
                ]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.cancelButton}
          />
          <Button
            title="Plan Meal"
            onPress={handleConfirm}
            style={styles.confirmButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  recipeInfo: {
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recipeName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  recipeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeDetailText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  mealTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 120,
  },
  mealTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  mealTypeHeader: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mealTypeIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  checkIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  mealTypeLabelSelected: {
    color: Colors.primary,
  },
  mealTypeDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  mealTypeDescriptionSelected: {
    color: Colors.primary,
  },
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
  confirmButton: {
    flex: 2,
  },
  dateSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dateLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  quickDateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  quickDateOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    minWidth: 80,
  },
  quickDateOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  quickDateOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  quickDateOptionTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  quickDateSubtext: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: 2,
  },
  quickDateSubtextSelected: {
    color: Colors.primary,
  },
});