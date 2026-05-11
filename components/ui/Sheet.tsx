import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Tokens } from '@/constants/tokens';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
  keyboardAvoiding?: boolean;
  maxHeight?: ViewStyle['maxHeight'];
  contentStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;
  closeButtonStyle?: StyleProp<ViewStyle>;
  closeAccessibilityLabel?: string;
}

export function Sheet({
  visible,
  onClose,
  children,
  header,
  keyboardAvoiding = false,
  maxHeight,
  contentStyle,
  handleStyle,
  closeButtonStyle,
  closeAccessibilityLabel = 'Close sheet',
}: SheetProps) {
  const sheet = (
    <View style={[styles.sheet, maxHeight ? { maxHeight } : null, contentStyle]}>
      <View style={[styles.handle, handleStyle]} />

      {header ? (
        <View style={styles.header}>
          {header}
          <Pressable
            style={[styles.closeButton, closeButtonStyle]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={closeAccessibilityLabel}
          >
            <X size={20} color={Colors.text} />
          </Pressable>
        </View>
      ) : null}

      {children}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboard}
          >
            {sheet}
          </KeyboardAvoidingView>
        ) : (
          sheet
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay.medium,
  },
  keyboard: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    backgroundColor: Tokens.component.sheet.bg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Tokens.component.sheet.border,
    boxShadow: Tokens.component.sheet.shadow,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: Tokens.component.sheet.handle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
