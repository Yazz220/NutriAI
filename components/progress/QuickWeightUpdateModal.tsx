import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Minus, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { WeightTrackingHandle } from '@/hooks/useWeightTracking';

interface QuickWeightUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  tracking: WeightTrackingHandle;
}

export const QuickWeightUpdateModal: React.FC<QuickWeightUpdateModalProps> = ({ visible, onClose, tracking }) => {
  const { getCurrentWeight, addWeightEntry } = tracking;
  const insets = useSafeAreaInsets();
  const current = getCurrentWeight();

  const fallbackWeight = useMemo(() => {
    if (typeof current?.weight === 'number' && current.weight > 0) {
      return Number(current.weight.toFixed(1));
    }
    return 70;
  }, [current?.weight]);

  const [weight, setWeight] = useState(fallbackWeight);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeight(fallbackWeight);
    }
  }, [visible, fallbackWeight]);

  const adjustWeight = (delta: number) => {
    setWeight((prev) => {
      const next = Number((prev + delta).toFixed(1));
      if (Number.isNaN(next)) {
        return prev;
      }
      return Math.min(500, Math.max(1, next));
    });
  };

  const handleSave = async () => {
    if (saving) return;
    const safeWeight = Number(weight.toFixed(1));
    if (Number.isNaN(safeWeight) || safeWeight <= 0 || safeWeight > 500) {
      Alert.alert('Invalid weight', 'Please choose a weight between 1 and 500 kg.');
      return;
    }

    setSaving(true);
    try {
      await addWeightEntry(safeWeight);
      onClose();
    } catch (error) {
      Alert.alert('Could not update weight', 'Please try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modal, { paddingBottom: Math.max(Spacing.lg, insets.bottom + Spacing.md) }]}> 
          <View style={styles.header}>
            <Text style={styles.title}>Update your weight</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
              <X size={20} color={Colors.lightText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Adjust by tapping the plus or minus buttons.</Text>

          <View style={styles.weightRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => adjustWeight(-0.5)}
              accessibilityLabel="Decrease weight"
            >
              <Minus size={28} color={Colors.successDark} />
            </TouchableOpacity>

            <View style={styles.weightValueContainer}>
              <Text style={styles.weightValue}>{weight.toFixed(1)}</Text>
              <Text style={styles.weightUnit}>kg</Text>
            </View>

            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => adjustWeight(0.5)}
              accessibilityLabel="Increase weight"
            >
              <Plus size={28} color={Colors.successDark} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay.medium,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  stepButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  weightValueContainer: {
    alignItems: 'center',
  },
  weightValue: {
    fontSize: 56,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    lineHeight: 64,
  },
  weightUnit: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    marginTop: 4,
  },
  saveButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.interactive.buttonPrimaryDisabled,
  },
  saveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.onPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
