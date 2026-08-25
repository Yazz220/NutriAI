/**
 * UnifiedIntakeComposer — the single multimodal input for adding a recipe.
 *
 * Replaces the legacy AddPageComposer (which required a sourceHint prop
 * and had different UI per source type). This component has:
 *   - One TextInput (always same size, same placeholder)
 *   - One prominent image attach button
 *   - Auto-detection of source type on submit
 *
 * The user can paste a URL, paste text, paste a video link, attach an
 * image, or attach an image + add notes. The submit handler builds the
 * extract-recipe payload from what's present — the Edge Function handles
 * all source types in a single call.
 */

import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Link, Send, Sparkles, Video, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export type UnifiedIntakePayload =
  | { type: 'url'; input: string }
  | { type: 'text'; input: string }
  | { type: 'video'; input: string }
  | { type: 'image'; imageBase64: string; input?: string };

interface UnifiedIntakeComposerProps {
  isSubmitting?: boolean;
  input: string;
  imageBase64: string | null;
  error?: string | null;
  onInputChange: (value: string) => void;
  onImageBase64Change: (value: string | null) => void;
  onRetry?: () => Promise<void> | void;
  onSubmit: (payload: UnifiedIntakePayload) => Promise<void> | void;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function looksLikeVideoUrl(value: string) {
  const trimmed = value.trim();
  if (!looksLikeUrl(trimmed)) return false;
  return /(?:youtube\.com|youtu\.be|tiktok\.com|instagram\.com|\/reel\/|\/shorts\/|\.(?:mp4|mov|m4v|webm)(?:$|\?))/i.test(trimmed);
}

/**
 * Build the extract-recipe payload from what the user provided.
 * Auto-detects the source type:
 *   - Image attached → image extraction (text becomes optional notes)
 *   - Video URL → video extraction
 *   - HTTP(S) URL → URL extraction
 *   - Anything else → text extraction
 */
export function buildIntakePayload(
  input: string,
  imageBase64: string | null,
): UnifiedIntakePayload | null {
  const trimmed = input.trim();

  if (imageBase64) {
    return { type: 'image', imageBase64, input: trimmed || undefined };
  }

  if (!trimmed) return null;

  if (looksLikeVideoUrl(trimmed)) {
    return { type: 'video', input: trimmed };
  }

  if (looksLikeUrl(trimmed)) {
    return { type: 'url', input: trimmed };
  }

  return { type: 'text', input: trimmed };
}

export function UnifiedIntakeComposer({
  isSubmitting = false,
  input,
  imageBase64,
  error = null,
  onInputChange,
  onImageBase64Change,
  onRetry,
  onSubmit,
}: UnifiedIntakeComposerProps) {
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
    if (base64) onImageBase64Change(base64);
  }

  async function submit() {
    if (isSubmitting) return;
    const payload = buildIntakePayload(input, imageBase64);
    if (payload) await onSubmit(payload);
  }

  const canSubmit = Boolean(imageBase64 || input.trim()) && !isSubmitting;

  // Show a hint about what was detected
  const detectedType = imageBase64
    ? 'Image'
    : looksLikeVideoUrl(input)
      ? 'Video link'
      : looksLikeUrl(input)
        ? 'Recipe link'
        : input.trim()
          ? 'Recipe text'
          : null;

  const submitIcon = imageBase64 ? (
    <Camera size={18} color={Colors.onPrimary} />
  ) : looksLikeVideoUrl(input) ? (
    <Video size={18} color={Colors.onPrimary} />
  ) : looksLikeUrl(input) ? (
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
          <Text style={styles.eyebrow}>Add a recipe</Text>
          <Text style={styles.title}>Paste a link, text, or attach a photo</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Nosh reads the source, creates the complete recipe page, and places it in its cookbook automatically.
      </Text>

      {/* Image attachment preview (if attached) */}
      {imageBase64 ? (
        <View style={styles.attachmentRow}>
          <Camera size={16} color={Colors.primary} />
          <Text style={styles.attachmentText}>Image attached{input.trim() ? ' with notes' : ''}</Text>
          <Pressable
            onPress={() => onImageBase64Change(null)}
            accessibilityLabel="Remove attached image"
          >
            <X size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <TextInput
        value={input}
        onChangeText={onInputChange}
        multiline
        style={styles.input}
        placeholder="Paste a recipe link, text, or add notes for your photo"
        placeholderTextColor={Colors.textMuted}
        editable={!isSubmitting}
        textAlignVertical="top"
        maxFontSizeMultiplier={2}
        scrollEnabled
      />

      {detectedType && !isSubmitting ? (
        <Text style={styles.detectedHint}>Detected: {detectedType}</Text>
      ) : null}

      {error ? (
        <View style={styles.errorNotice} accessibilityRole="alert">
          <Text style={styles.errorTitle}>Couldn&apos;t read this recipe</Text>
          <Text style={styles.errorBody} selectable>{error}</Text>
          {onRetry ? (
            <Button
              title="Try again"
              variant="outline"
              onPress={onRetry}
              fullWidth
              accessibilityLabel="Try importing recipe again"
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryButton, isSubmitting && styles.disabled]}
          onPress={pickImage}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Attach image or screenshot"
        >
          <Camera size={19} color={Colors.text} />
          <Text style={styles.secondaryText}>
            {imageBase64 ? 'Change image' : 'Attach photo'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Create recipe page"
        >
          {submitIcon}
          <Text style={styles.primaryText}>
            {isSubmitting ? 'Starting page' : 'Create page'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
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
    backgroundColor: Colors.parchment,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  description: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  attachmentRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.md,
  },
  attachmentText: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
  input: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 24,
    height: 120,
  },
  detectedHint: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0.3,
  },
  actions: {
    gap: Spacing.md,
  },
  secondaryButton: {
    height: 48,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
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
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
  },
  errorNotice: {
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
  },
  errorTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  errorBody: {
    color: Colors.slate,
    fontSize: 13,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.45,
  },
});
