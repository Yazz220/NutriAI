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
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import BreakfastIcon from '@/assets/icons/Breakfast.svg';
import LunchIcon from '@/assets/icons/Lunch.svg';
import DinnerIcon from '@/assets/icons/Dinner.svg';
import SnackIcon from '@/assets/icons/Snack.svg';
import CalenderIcon from '@/assets/icons/Calender.svg';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { MealType } from '@/types';

interface MealTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (mealType: MealType, selectedDate: string) => void;
  recipeName: string;
  servings: number;
  calories?: number;
  defaultDate?: string; // Optional default date (defaults to today)
}

const MEAL_TYPE_OPTIONS: { type: MealType; label: string; icon: any }[] = [
  {
    type: 'breakfast',
    label: 'Breakfast',
    icon: <BreakfastIcon width={48} height={48} />,
  },
  {
    type: 'lunch',
    label: 'Lunch',
    icon: <LunchIcon width={48} height={48} />,
  },
  {
    type: 'dinner',
    label: 'Dinner',
    icon: <DinnerIcon width={48} height={48} />,
  },
  {
    type: 'snack',
    label: 'Snack',
    icon: <SnackIcon width={48} height={48} />,
  },
];

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  visible,
  onClose,
  onConfirm,
  recipeName,
  servings,
  calories,
  defaultDate,
}) => {
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    defaultDate || new Date().toISOString().split('T')[0]
  );
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(selectedDate);
    d.setDate(1);
    return d;
  });

  const getCurrentMealSuggestion = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
  };

  React.useEffect(() => {
    if (visible) {
      setSelectedMealType(getCurrentMealSuggestion());
    }
  }, [visible]);

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Log Recipe</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Recipe Info */}
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{recipeName}</Text>
          <View style={styles.recipeDetails}>
            <Text style={styles.recipeDetailText}>
              {servings} serving{servings !== 1 ? 's' : ''}
            </Text>
            {typeof calories === 'number' && (
              <Text style={styles.recipeDetailText}> • {Math.round(calories)} calories</Text>
            )}
          </View>
        </View>

        {/* Enhanced Date Selection */}
        <View style={styles.dateSection}>
          <View style={styles.dateSectionHeader}>
            <Text style={styles.dateLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => setShowFullCalendar(true)}
            >
              <CalenderIcon width={20} height={20} color={Colors.primary} />
              <Text style={styles.calendarButtonText}>Calendar</Text>
            </TouchableOpacity>
          </View>
          {/* Quick Date Options */}
          <View style={styles.quickDateOptions}>
            {[0, 1].map((daysAgo) => {
              const date = new Date();
              date.setDate(date.getDate() - daysAgo);
              const dateISO = date.toISOString().split('T')[0];
              const isSelected = selectedDate === dateISO;

              const label =
                daysAgo === 0
                  ? 'Today'
                  : daysAgo === 1
                  ? 'Yesterday'
                  : date.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });

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

          {/* Selected Date Display */}
          <View style={styles.selectedDateDisplay}>
            <Text style={styles.selectedDateText}>
              Selected: {new Date(selectedDate).toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        {/* Meal Type Selection */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>What meal is this for?</Text>
          {/* Subtitle intentionally omitted */}

          <View style={styles.mealTypeGrid}>
            {MEAL_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.mealTypeCard,
                  selectedMealType === option.type && styles.mealTypeCardSelected,
                ]}
                onPress={() => {
                  setSelectedMealType(option.type);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedMealType === option.type }}
                accessibilityLabel={`${option.label}`}
              >
                <View style={styles.mealTypeHeader}>
                  <View style={styles.mealTypeIconWrap}>{option.icon}</View>
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
                {/* Description removed per request */}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="outline"
            size="sm"
            shape="rect"
            onPress={onClose}
            style={styles.cancelButton}
          />
          <Button
            title="Log Meal"
            size="sm"
            shape="rect"
            onPress={handleConfirm}
            style={styles.confirmButton}
          />
        </View>
      </SafeAreaView>

      {/* Full Calendar Modal */}
      <Modal
        visible={showFullCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullCalendar(false)}
      >
        <View style={styles.calendarBackdrop}>
          <View style={styles.calendarSheet}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarMonth(d);
                }}
              >
                <ChevronLeft size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarMonth(d);
                }}
              >
                <ChevronRight size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.calendarWeekdaysRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.calendarWeekdayText}>{day}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <ScrollView style={styles.calendarScrollView}>
              <View style={styles.calendarGrid}>
                {(() => {
                  const items: React.ReactNode[] = [];
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date().toISOString().split('T')[0];
                  
                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < firstDay; i++) {
                    items.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
                  }
                  
                  // Add cells for each day of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dateISO = date.toISOString().split('T')[0];
                    const isSelected = selectedDate === dateISO;
                    const isToday = dateISO === today;
                    const isPast = date < new Date(today);
                    const isFuture = date > new Date(today);
                    
                    items.push(
                      <TouchableOpacity
                        key={dateISO}
                        style={[
                          styles.calendarCell,
                          styles.calendarDayCell,
                          isSelected && styles.calendarDayCellSelected,
                          isToday && styles.calendarDayCellToday,
                          isFuture && styles.calendarDayCellFuture,
                        ]}
                        onPress={() => {
                          setSelectedDate(dateISO);
                          setShowFullCalendar(false);
                        }}
                        disabled={false} // Allow selecting any date
                      >
                        <Text style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                          isToday && styles.calendarDayTextToday,
                          isFuture && styles.calendarDayTextFuture,
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  
                  return items;
                })()}
              </View>
            </ScrollView>

            {/* Calendar Footer */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity 
                onPress={() => setShowFullCalendar(false)} 
                style={styles.calendarCancelButton}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setShowFullCalendar(false);
                }}
                style={styles.calendarTodayButton}
              >
                <Text style={styles.calendarTodayText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
  },
  recipeName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  recipeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  recipeDetailText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
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
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
    gap: Spacing.xs,
  },
  calendarButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  quickDateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
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
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
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
  mealTypeIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
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
  selectedDateDisplay: {
    padding: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedDateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  // Calendar Modal Styles
  calendarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  calendarSheet: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarNavButton: {
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarMonthLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  calendarWeekdayText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    textAlign: 'center',
    width: 40,
  },
  calendarScrollView: {
    maxHeight: 300,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarCell: {
    width: 40,
    height: 40,
    margin: 2,
  },
  calendarDayCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.card,
  },
  calendarDayCellSelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayCellToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  calendarDayCellFuture: {
    opacity: 0.6,
  },
  calendarDayText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  calendarDayTextSelected: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  calendarDayTextToday: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  calendarDayTextFuture: {
    color: Colors.lightText,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  calendarCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  quickDateOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    minWidth: 72,
    textAlign: 'center',
  },
  calendarCancelText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  calendarTodayButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  calendarTodayText: {
    fontSize: Typography.sizes.md,
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
});