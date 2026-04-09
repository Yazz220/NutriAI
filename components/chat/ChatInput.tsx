import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Send, ImagePlus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Radii, Shadows } from '@/constants/spacing';

interface ChatInputProps {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | undefined>(undefined);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, pendingImage);
    setText('');
    setPendingImage(undefined);
  }, [text, pendingImage, disabled, onSend]);

  const handleAttach = useCallback(async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      setPendingImage(result.assets[0].base64);
    }
  }, [disabled]);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      {/* Attach button */}
      <TouchableOpacity
        onPress={handleAttach}
        disabled={disabled}
        style={[styles.iconButton, pendingImage ? styles.iconButtonActive : undefined]}
        accessibilityLabel="Attach image"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ImagePlus
          size={22}
          color={pendingImage ? Colors.primary : disabled ? Colors.textMuted : Colors.textTertiary}
        />
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Paste a recipe link, or ask me anything..."
        placeholderTextColor={Colors.textMuted}
        multiline
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
        maxLength={2000}
        accessibilityLabel="Chat input"
      />

      {/* Send button */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonInactive]}
        accessibilityLabel="Send message"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Send size={18} color={canSend ? Colors.white : Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

export default ChatInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
  iconButtonActive: {
    backgroundColor: Colors.tints.brandTintSoft,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    maxHeight: 120,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.surfaceMuted,
  },
});
