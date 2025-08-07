import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  scrollable?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  scrollable = true,
}) => {
  const modalStyle = [styles.modalContent, styles[size]];

  const content = scrollable ? (
    <ScrollView 
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={modalStyle}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {content}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  sm: {
    width: '80%',
    maxWidth: 400,
  },
  md: {
    width: '90%',
    maxWidth: 500,
  },
  lg: {
    width: '95%',
    maxWidth: 600,
  },
  full: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
  },
});