/**
 * UnifiedIntakeComposer — the single multimodal input for adding a recipe.
 *
 * Replaces the legacy AddPageComposer (which required a sourceHint prop
 * and had different UI per source type). This component has:
 *   - One TextInput (always same size, same placeholder)
 *   - One composer-native image attachment control
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
import { Camera, Link, Paperclip, Send, Sparkles, Video, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
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
          <Text style={styles.title}>Paste a link, text, or attach a photo</Text>
        </View>
      </View>

      <View style={styles.inputShell}>
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

        <View style={styles.inputToolbar}>
          <Pressable
            style={[styles.attachButton, isSubmitting && styles.disabled]}
            onPress={pickImage}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={imageBase64 ? 'Change attached image' : 'Attach image or screenshot'}
            accessibilityState={{ disabled: isSubmitting, selected: Boolean(imageBase64) }}
            hitSlop={Spacing.sm}
          >
            <Paperclip size={19} color={imageBase64 ? Colors.primary : Colors.textMuted} />
          </Pressable>

          {imageBase64 ? (
            <View style={styles.attachmentChip}>
              <Text style={styles.attachmentText}>Photo attached{input.trim() ? ' with notes' : ''}</Text>
              <Pressable
                onPress={() => onImageBase64Change(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove attached image"
                hitSlop={Spacing.sm}
              >
                <X size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

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
    borderRadius: Radii.numeric[22],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight28,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  inputShell: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    overflow: 'hidden',
  },
  input: {
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight24,
    height: 88,
  },
  inputToolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentChip: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.md,
  },
  attachmentText: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  actions: {
    gap: Spacing.md,
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
    fontSize: Typography.sizes.md,
  },
  errorBody: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
  },
  disabled: {
    opacity: 0.45,
  },
});
