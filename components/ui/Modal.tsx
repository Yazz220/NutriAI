import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
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
  variant?: 'elevated' | 'outline';
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
  variant = 'elevated',
}) => {
  const isFull = size === 'full';
  const modalStyle = isFull
    ? [styles.fullContent]
    : [
        styles.modalContent,
        styles[size],
        variant === 'elevated' ? styles.elevated : styles.outline,
      ];

  const content = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, isFull && styles.fullContentPadding, { paddingBottom: Spacing.xl * 2 }]}
      style={{ maxHeight: '100%' }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, isFull && styles.fullContentPadding]}>{children}</View>
  );

  return (
    <RNModal
      visible={visible}
      transparent={size !== 'full'}
      animationType={size === 'full' ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent={false}
      presentationStyle={size === 'full' ? 'fullScreen' : 'overFullScreen'}
    >
      <View style={isFull ? styles.fullOverlay : styles.overlay}>
        <SafeAreaView
          style={modalStyle}
          edges={['top','bottom','left','right']}
          accessibilityLabel={title}
          accessibilityViewIsModal
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={isFull ? { flex: 1 } : undefined}>
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
          </KeyboardAvoidingView>
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
    backgroundColor: Colors.background,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    maxHeight: '95%',
  },
  fullContent: {
    flex: 1,
    backgroundColor: Colors.background,
    width: '100%',
    height: '100%',
  },
  elevated: {
    ...Shadows.lg,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.border,
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
  fullContentPadding: {
    padding: 0,
  },
});