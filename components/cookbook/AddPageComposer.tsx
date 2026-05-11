import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Link, Send, Sparkles, Video } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeSourceType } from '@/types/cookbook';

export type AddPageSubmitPayload =
  | { type: 'url'; input: string }
  | { type: 'text'; input: string }
  | { type: 'video'; input: string }
  | { type: 'image'; imageBase64: string; input?: string };

interface AddPageComposerProps {
  isSubmitting?: boolean;
  sourceHint?: RecipeSourceType;
  onSubmit: (payload: AddPageSubmitPayload) => Promise<void> | void;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function looksLikeVideoUrl(value: string) {
  const trimmed = value.trim();
  if (!looksLikeUrl(trimmed)) return false;
  return /(?:youtube\.com|youtu\.be|tiktok\.com|instagram\.com|\/reel\/|\/shorts\/|\.(?:mp4|mov|m4v|webm)(?:$|\?))/i.test(trimmed);
}

function sourceTitle(sourceHint?: RecipeSourceType) {
  if (sourceHint === 'url') return 'From URL or link';
  if (sourceHint === 'text') return 'Paste text';
  if (sourceHint === 'image') return 'Upload image or screenshot';
  if (sourceHint === 'video') return 'From video link';
  return 'Choose a recipe source';
}

function sourcePlaceholder(sourceHint?: RecipeSourceType) {
  if (sourceHint === 'url') return 'Paste a recipe URL';
  if (sourceHint === 'text') return 'Paste the recipe text';
  if (sourceHint === 'image') return 'Attach an image, then add optional notes here';
  if (sourceHint === 'video') return 'Paste a YouTube, TikTok, Instagram, or video link';
  return 'Paste a recipe link, video link, or recipe text';
}

export function AddPageComposer({
  isSubmitting = false,
  sourceHint,
  onSubmit,
}: AddPageComposerProps) {
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
    if (sourceHint === 'url') {
      await onSubmit({ type: 'url', input: trimmed });
      return;
    }
    if (sourceHint === 'text') {
      await onSubmit({ type: 'text', input: trimmed });
      return;
    }
    if (sourceHint === 'video') {
      await onSubmit({ type: 'video', input: trimmed });
      return;
    }
    await onSubmit({
      type: looksLikeVideoUrl(trimmed) ? 'video' : looksLikeUrl(trimmed) ? 'url' : 'text',
      input: trimmed,
    });
  }

  const canSubmit = Boolean(imageBase64 || input.trim()) && !isSubmitting;
  const submitIcon = looksLikeVideoUrl(input) && !imageBase64 ? (
    <Video size={18} color={Colors.onPrimary} />
  ) : looksLikeUrl(input) && !imageBase64 ? (
    <Link size={18} color={Colors.onPrimary} />
  ) : (
    <Send size={18} color={Colors.onPrimary} />
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Sparkles size={18} color={Colors.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Add page</Text>
          <Text style={styles.title}>{sourceTitle(sourceHint)}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Give Nosh the source for this page. It will extract the recipe, let you review it, then generate a cookbook page for this book.
      </Text>

      <TextInput
        value={input}
        onChangeText={setInput}
        multiline
        style={styles.input}
        placeholder={sourcePlaceholder(sourceHint)}
        placeholderTextColor={Colors.textMuted}
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
          <ImagePlus size={19} color={Colors.text} />
          <Text style={styles.secondaryText}>Upload image / screenshot</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {submitIcon}
          <Text style={styles.primaryText}>{isSubmitting ? 'Reading page' : 'Review page'}</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
    boxShadow: Colors.book.cardShadow,
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
    backgroundColor: Colors.skyMist,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  description: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 180,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 24,
  },
  attachment: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.skyMist,
    paddingHorizontal: Spacing.md,
  },
  attachmentText: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
  removeText: {
    color: Colors.error,
    fontFamily: Fonts.ui.medium,
  },
  actions: {
    gap: Spacing.md,
  },
  secondaryButton: {
    height: 48,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.duskGrey,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
  primaryButton: {
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.butterscotch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
  },
  disabled: {
    opacity: 0.45,
  },
});
