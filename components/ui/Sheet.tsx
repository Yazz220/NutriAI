import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
      <View
        testID="sheet-accessibility-modal"
        style={styles.backdrop}
        accessibilityViewIsModal
        importantForAccessibility="yes"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            behavior="padding"
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
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    backgroundColor: Tokens.component.sheet.bg,
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Tokens.component.sheet.border,
    boxShadow: Tokens.component.sheet.shadow,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: Radii.numeric[999],
    backgroundColor: Tokens.component.sheet.handle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
