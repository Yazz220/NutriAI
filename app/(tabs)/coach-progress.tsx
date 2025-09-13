import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Brain } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { WeightCard } from '@/components/progress/WeightCard';
import { WeightModal } from '@/components/progress/WeightModal';
import { MeasurementCard } from '@/components/progress/MeasurementCard';
import { MeasurementModal } from '@/components/progress/MeasurementModal';
import { GlassSurface } from '@/components/common/GlassSurface';
import { TotalCaloriesCard } from '@/components/progress/TotalCaloriesCard';
import TotalCaloriesModal from '@/components/progress/TotalCaloriesModal';

export default function CoachProgressScreen() {
  const insets = useSafeAreaInsets();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showTotalCaloriesModal, setShowTotalCaloriesModal] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Progress" icon={<Brain size={28} color={Colors.text} weight="bold" />} glassy />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ 
          paddingBottom: (insets?.bottom ?? 0) + 56 + 24,
          paddingTop: 16 
        }}
        showsVerticalScrollIndicator={false}
      >
        <TotalCaloriesCard onPress={() => setShowTotalCaloriesModal(true)} />
        <WeightCard onPress={() => setShowWeightModal(true)} />

        <MeasurementCard onPress={() => setShowMeasurementModal(true)} />
        
        {/* Placeholder for future progress cards */}
        <GlassSurface style={styles.placeholderSection}>
          <Text style={styles.placeholderTitle}>More Progress Features</Text>
          <Text style={styles.placeholderSubtitle}>
            Additional progress tracking features will be added here
          </Text>
        </GlassSurface>
      </ScrollView>

      <WeightModal 
        visible={showWeightModal} 
        onClose={() => setShowWeightModal(false)} 
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
  placeholderSection: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
  },
  placeholderTitle: { 
    color: Colors.text, 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  placeholderSubtitle: { 
    color: Colors.lightText, 
    textAlign: 'center',
    lineHeight: 20,
  },
});
