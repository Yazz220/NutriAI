import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Brain } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { WeightCard } from '@/components/progress/WeightCard';
import { WeightProgressChartCard } from '@/components/progress/WeightProgressChartCard';
import { QuickWeightUpdateModal } from '@/components/progress/QuickWeightUpdateModal';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { MeasurementCard } from '@/components/progress/MeasurementCard';
import { MeasurementModal } from '@/components/progress/MeasurementModal';
import { TotalCaloriesCard } from '@/components/progress/TotalCaloriesCard';
import TotalCaloriesModal from '@/components/progress/TotalCaloriesModal';

export default function CoachProgressScreen() {
  const insets = useSafeAreaInsets();
  const weightTracking = useWeightTracking();
  const [showQuickWeightModal, setShowQuickWeightModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showTotalCaloriesModal, setShowTotalCaloriesModal] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Progress" icon={<Brain size={28} color={Colors.text} weight="bold" />} glassy />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: (insets?.bottom ?? 0) + 56 + 24,
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TotalCaloriesCard onPress={() => setShowTotalCaloriesModal(true)} />
        <WeightCard tracking={weightTracking} onUpdateWeight={() => setShowQuickWeightModal(true)} />
        <WeightProgressChartCard tracking={weightTracking} />
        <MeasurementCard onPress={() => setShowMeasurementModal(true)} />
      </ScrollView>

      <QuickWeightUpdateModal
        tracking={weightTracking}
        visible={showQuickWeightModal}
        onClose={() => setShowQuickWeightModal(false)}
      />

      <MeasurementModal
        visible={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
      />

      <TotalCaloriesModal
        visible={showTotalCaloriesModal}
        onClose={() => setShowTotalCaloriesModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
});
