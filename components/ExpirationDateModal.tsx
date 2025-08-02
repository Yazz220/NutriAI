import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ExpirationDateModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  itemName: string;
}

export const ExpirationDateModal: React.FC<ExpirationDateModalProps> = ({
  visible,
  onClose,
  onConfirm,
  itemName,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const handleQuickSelect = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    onConfirm(date);
    onClose();
  };

  const handleCustomDate = () => {
    // For now, use 2 weeks as custom default
    const date = new Date();
    date.setDate(date.getDate() + 14);
    onConfirm(date);
    onClose();
  };

  const handleSkip = () => {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    onConfirm(date);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>
            {itemName} Added to Inventory!
          </Text>
          <Text style={styles.subtitle}>
            When does it expire? This helps us remind you to use it.
          </Text>

          <View style={styles.quickOptions}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickSelect(3)}
            >
              <Text style={styles.quickButtonText}>3 days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickSelect(7)}
            >
              <Text style={styles.quickButtonText}>1 week</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickSelect(14)}
            >
              <Text style={styles.quickButtonText}>2 weeks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickSelect(30)}
            >
              <Text style={styles.quickButtonText}>1 month</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.customButton}
            onPress={handleCustomDate}
          >
            <Text style={styles.customButtonText}>2 weeks (custom)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip (1 week default)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 300,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
  },
  quickOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  customButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  customButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerContainer: {
    marginVertical: 12,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.lightText,
    fontSize: 16,
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.text,
    fontSize: 16,
  },
});
