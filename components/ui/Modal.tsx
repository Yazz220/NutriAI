import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  hasHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  scrollable = true,
  hasHeader = true,
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
      transparent={size !== 'full'}
      animationType={size === 'full' ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle={size === 'full' ? 'fullScreen' : 'overFullScreen'}
    >
      <View style={size === 'full' ? styles.fullOverlay : styles.overlay}>
        <SafeAreaView style={modalStyle} edges={size === 'full' ? ['top', 'left', 'right'] : undefined}>
          {hasHeader && (
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
          )}

          {/* Content */}
          {content}
        </SafeAreaView>
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
  fullOverlay: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
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
    ...Platform.select({ android: { paddingTop: 0 } }),
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