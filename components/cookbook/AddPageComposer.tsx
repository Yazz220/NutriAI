import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Link, Send } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';

export type AddPageSubmitPayload =
  | { type: 'url'; input: string }
  | { type: 'text'; input: string }
  | { type: 'image'; imageBase64: string; input?: string };

interface AddPageComposerProps {
  isSubmitting?: boolean;
  onSubmit: (payload: AddPageSubmitPayload) => Promise<void> | void;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function AddPageComposer({ isSubmitting = false, onSubmit }: AddPageComposerProps) {
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
      allowsEditing: false,
    });

    const base64 = result.canceled ? null : result.assets?.[0]?.base64 ?? null;
    if (base64) setImageBase64(base64);
  }

  async function submit() {
    if (isSubmitting) return;

    const trimmed = input.trim();
    if (imageBase64) {
      await onSubmit({ type: 'image', imageBase64, input: trimmed || undefined });
      return;
    }

    if (!trimmed) return;
    await onSubmit({ type: looksLikeUrl(trimmed) ? 'url' : 'text', input: trimmed });
  }

  const canSubmit = Boolean(imageBase64 || input.trim()) && !isSubmitting;
  const submitIcon = looksLikeUrl(input) && !imageBase64 ? (
    <Link size={18} color={Colors.onPrimary} />
  ) : (
    <Send size={18} color={Colors.onPrimary} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a recipe page</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        multiline
        style={styles.input}
        placeholder="Paste a recipe link or recipe text"
        placeholderTextColor={Colors.textMuted}
        editable={!isSubmitting}
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} disabled={isSubmitting}>
          <ImagePlus size={20} color={Colors.text} />
          <Text style={styles.secondaryText}>{imageBase64 ? 'Image attached' : 'Add image'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {submitIcon}
          <Text style={styles.primaryText}>{isSubmitting ? 'Reading' : 'Review recipe'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  input: {
    minHeight: 220,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  secondaryButton: {
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryText: {
    color: Colors.text,
    fontWeight: '600',
  },
  primaryButton: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});
