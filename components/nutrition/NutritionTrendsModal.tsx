import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, BarChart3 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { NutritionTrends } from '@/components/nutrition/NutritionTrends';
import { WeeklyTrend, DailyProgress } from '@/hooks/useNutrition';

type TrendPeriod = '7d' | '30d' | '90d';

interface NutritionTrendsModalProps {
  visible: boolean;
  onClose: () => void;
  weeklyTrends: WeeklyTrend[];
  getDailyProgress: (date: string) => DailyProgress;
  selectedDate?: string;
  initialPeriod?: TrendPeriod;
}

export const NutritionTrendsModal: React.FC<NutritionTrendsModalProps> = ({
  visible,
  onClose,
  weeklyTrends,
  getDailyProgress,
  selectedDate,
  initialPeriod,
}) => {
  const [dateISO, setDateISO] = React.useState<string>(
    selectedDate || new Date().toISOString().split('T')[0]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Nutrition Trends</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <NutritionTrends
            weeklyTrends={weeklyTrends}
            getDailyProgress={getDailyProgress}
            selectedDate={dateISO}
            onDateChange={setDateISO}
            fullScreen
            initialPeriod={initialPeriod}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: { padding: Spacing.xs },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.text },
  body: { flex: 1 },
});
