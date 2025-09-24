import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { useUserProfileStore } from '@/hooks/useEnhancedUserProfile';

interface BMIModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BMIModal: React.FC<BMIModalProps> = ({ visible, onClose }) => {
  const { getCurrentWeight } = useWeightTracking();
  const currentWeight = getCurrentWeight();

  // Pull height (cm) from enhanced profile; fallback to 175cm if unavailable
  const { profile } = useUserProfileStore();
  const heightMeters = profile?.height ? Number(profile.height) / 100 : 1.75;

  const bmi = useMemo(() => {
    const w = currentWeight?.weight ?? 0;
    const h = Number(heightMeters) || 0;
    if (!w || !h) return 0;
    return w / (h * h);
  }, [currentWeight?.weight, heightMeters]);

  const bmiInfo = useMemo(() => {
    const val = bmi;
    if (val < 18.5) return { label: 'Underweight', color: Colors.info, position: 0.1 };
    if (val < 25) return { label: 'Healthy', color: Colors.success, position: 0.4 };
    if (val < 30) return { label: 'Overweight', color: Colors.warning, position: 0.7 };
    return { label: 'Obese', color: Colors.error, position: 0.95 };
  }, [bmi]);

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
          <Text style={styles.headerTitle}>Body Mass Index (BMI)</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Value and Category */}
          <View style={styles.valueBlock}>
            <Text style={styles.valueLabel}>Your weight is <Text style={[styles.tag, { color: bmiInfo.color }]}>{bmiInfo.label}</Text></Text>
            <Text style={styles.valueNumber}>{bmi > 0 ? bmi.toFixed(1) : '--'}</Text>
          </View>

          {/* Color bar with marker */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.barBlue, { flex: 1 }]} />
              <View style={[styles.barGreen, { flex: 1 }]} />
              <View style={[styles.barYellow, { flex: 1 }]} />
              <View style={[styles.barRed, { flex: 1 }]} />
            </View>
            <View style={[styles.marker, { left: `${bmiInfo.position * 100}%` }]} />
            <View style={styles.legendRow}>
              <Text style={[styles.legendItem, { color: Colors.info }]}>Underweight</Text>
              <Text style={[styles.legendItem, { color: Colors.success }]}>Healthy</Text>
              <Text style={[styles.legendItem, { color: Colors.warning }]}>Overweight</Text>
              <Text style={[styles.legendItem, { color: Colors.error }]}>Obese</Text>
            </View>
          </View>

          {/* Info content (modeled after screenshot) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Disclaimer</Text>
            <Text style={styles.paragraph}>
              As with most measures of health, BMI is not a perfect test. For example, results can be thrown off by
              pregnancy or high muscle mass, and it may not be a good measure of health for children or the elderly.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>So then, why does BMI matter?</Text>
            <Text style={styles.paragraph}>
              In general, the higher your BMI, the higher the risk of developing a range of conditions linked with excess weight,
              including:
            </Text>
            <View style={styles.bullets}>
              {['diabetes','arthritis','liver disease','several types of cancer (such as those of the breast, colon, and prostate)','high blood pressure (hypertension)','high cholesterol','sleep apnea'].map((t) => (
                <Text key={t} style={styles.bulletItem}>{`â€¢ ${t}`}</Text>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={async () => {
              const url = 'https://www.cdc.gov/bmi/about/index.html';
              try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Cannot open link', 'Your device cannot open this link.');
                }
              } catch (e) {
                // Swallow the promise rejection to avoid noisy redboxes
                Alert.alert('Cannot open link', 'Something went wrong while opening the source link.');
              }
            }}
            accessibilityRole="link"
            accessibilityLabel="Open CDC BMI information"
            style={styles.sourceLink}
          >
            <Text style={styles.sourceText}>Source: CDC â€” About Adult BMI</Text>
          </TouchableOpacity>
        </ScrollView>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 8,
    padding: 8,
    borderRadius: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  valueBlock: {
    marginTop: 8,
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  tag: {
    fontWeight: Typography.weights.semibold,
  },
  valueNumber: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  progressBarContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barBlue: { backgroundColor: Colors.info },
  barGreen: { backgroundColor: Colors.success },
  barYellow: { backgroundColor: Colors.warning },
  barRed: { backgroundColor: Colors.error },
  marker: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 14,
    backgroundColor: Colors.text,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendItem: {
    fontSize: 12,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  bullets: {
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    marginBottom: 2,
  },
  sourceLink: {
    paddingVertical: 16,
  },
  sourceText: {
    color: Colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default BMIModal;
