import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Link, Send, Sparkles } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

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
    <Link size={18} color="#FFF9EF" />
  ) : (
    <Send size={18} color="#FFF9EF" />
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Sparkles size={18} color="#6A4527" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>New cookbook page</Text>
          <Text style={styles.title}>Import a recipe</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Paste a recipe link, drop in copied recipe text, or attach a screenshot. Nosh will turn it into a reviewed recipe before page generation.
      </Text>

      <TextInput
        value={input}
        onChangeText={setInput}
        multiline
        style={styles.input}
        placeholder="Paste a recipe link or recipe text"
        placeholderTextColor="#9B835A"
        editable={!isSubmitting}
        textAlignVertical="top"
      />

      {imageBase64 ? (
        <View style={styles.attachment}>
          <ImagePlus size={16} color={Colors.primary} />
          <Text style={styles.attachmentText}>Recipe image attached</Text>
          <Pressable onPress={() => setImageBase64(null)}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={pickImage} disabled={isSubmitting}>
          <ImagePlus size={19} color="#3E2C1B" />
          <Text style={styles.secondaryText}>Attach image</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {submitIcon}
          <Text style={styles.primaryText}>{isSubmitting ? 'Reading recipe' : 'Review recipe'}</Text>
        </Pressable>
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          Testing without image generation? Use the sample pages already inside the book, then come back here when you want to try a real import.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D8BE8E',
    backgroundColor: '#FFF9EF',
    padding: Spacing.lg,
    gap: Spacing.md,
    boxShadow: '0 16px 34px rgba(54, 36, 18, 0.16)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5D8A6',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#806A46',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#3E2C1B',
    fontFamily: Fonts.display.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  description: {
    color: '#6D5738',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 180,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#D8BE8E',
    backgroundColor: '#FFF3DB',
    color: '#3E2C1B',
    padding: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
  },
  attachment: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: '#EEF4DE',
    paddingHorizontal: Spacing.md,
  },
  attachmentText: {
    flex: 1,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  removeText: {
    color: '#9A5148',
    fontWeight: '800',
  },
  actions: {
    gap: Spacing.md,
  },
  secondaryButton: {
    height: 48,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#D8BE8E',
    backgroundColor: '#F7E6C8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryText: {
    color: '#3E2C1B',
    fontWeight: '800',
  },
  primaryButton: {
    height: 54,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    boxShadow: '0 8px 16px rgba(63, 109, 42, 0.22)',
  },
  primaryText: {
    color: '#FFF9EF',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  tip: {
    borderRadius: Radii.md,
    backgroundColor: '#F4E1BE',
    padding: Spacing.md,
  },
  tipText: {
    color: '#806A46',
    fontSize: 12,
    lineHeight: 17,
  },
});
