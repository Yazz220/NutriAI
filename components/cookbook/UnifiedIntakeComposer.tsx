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
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NotebookPen, Paperclip, X } from 'lucide-react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export type UnifiedIntakePayload =
  | { type: 'url'; input: string }
  | { type: 'text'; input: string }
  | { type: 'video'; input: string }
  | {
      type: 'image';
      imageUri?: string;
      imageBase64?: string;
      mimeType?: string;
      input?: string;
    };

interface UnifiedIntakeComposerProps {
  isSubmitting?: boolean;
  input: string;
  imageBase64: string | null;
  imageUri?: string | null;
  imageMimeType?: string | null;
  error?: string | null;
  onInputChange: (value: string) => void;
  onImageBase64Change: (value: string | null) => void;
  onImageUriChange?: (uri: string | null, mimeType: string | null) => void;
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
  imageUri: string | null = null,
  imageMimeType: string | null = null,
): UnifiedIntakePayload | null {
  const trimmed = input.trim();

  if (imageUri) {
    return {
      type: 'image',
      imageUri,
      mimeType: imageMimeType ?? undefined,
      input: trimmed || undefined,
    };
  }

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
  imageUri = null,
  imageMimeType = null,
  error = null,
  onInputChange,
  onImageBase64Change,
  onImageUriChange,
  onRetry,
  onSubmit,
}: UnifiedIntakeComposerProps) {
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: false,
      quality: 0.8,
      allowsEditing: false,
    });

    const asset = result.canceled ? null : result.assets?.[0] ?? null;
    if (asset?.uri) {
      onImageBase64Change(null);
      onImageUriChange?.(asset.uri, asset.mimeType ?? null);
    }
  }

  async function submit() {
    if (isSubmitting) return;
    const payload = buildIntakePayload(input, imageBase64, imageUri, imageMimeType);
    if (payload) await onSubmit(payload);
  }

  const hasImage = Boolean(imageUri || imageBase64);
  const canSubmit = Boolean(hasImage || input.trim()) && !isSubmitting;

  const submitIcon = isSubmitting ? (
    <ActivityIndicator size="small" color={Colors.text} />
  ) : (
    <NotebookPen size={18} color={Colors.text} strokeWidth={1.8} />
  );

  return (
    <View style={styles.composer}>
      <View style={styles.inputRow}>
        <View style={styles.brandMark} accessibilityElementsHidden>
          <NoshSymbol size={24} />
        </View>
        <TextInput
          value={input}
          onChangeText={onInputChange}
          multiline
          style={styles.input}
          placeholder="Paste a link, recipe, or notes…"
          placeholderTextColor={Colors.textMuted}
          editable={!isSubmitting}
          textAlignVertical="top"
          maxFontSizeMultiplier={2}
          scrollEnabled
          accessibilityLabel="Recipe source"
        />
      </View>

      {hasImage ? (
        <View style={styles.attachmentChip}>
          <Text style={styles.attachmentText}>Photo attached{input.trim() ? ' with notes' : ''}</Text>
          <Pressable
            onPress={() => {
              onImageBase64Change(null);
              onImageUriChange?.(null, null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Remove attached image"
            style={styles.removeAttachment}
            hitSlop={Spacing.sm}
          >
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
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

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.attachButton,
            hasImage && styles.attachButtonSelected,
            isSubmitting && styles.disabled,
            pressed && !isSubmitting && styles.pressed,
          ]}
          onPress={pickImage}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={hasImage ? 'Change attached image' : 'Attach image or screenshot'}
          accessibilityState={{ disabled: isSubmitting, selected: hasImage }}
        >
          <Paperclip size={18} color={hasImage ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.attachText, hasImage && styles.attachTextSelected]}>Photo</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            !canSubmit && styles.disabled,
            pressed && canSubmit && styles.pressed,
          ]}
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Create recipe page"
          accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
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
  composer: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    boxShadow: Colors.book.cardShadow,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  brandMark: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: Colors.text,
    padding: 0,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight24,
    height: 104,
  },
  attachButton: {
    minHeight: 44,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  attachButtonSelected: {
    backgroundColor: Colors.book.accentSoft,
  },
  attachText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  attachTextSelected: {
    color: Colors.primary,
  },
  attachmentChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  attachmentText: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  footer: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  removeAttachment: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minWidth: 154,
    minHeight: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.coral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  primaryText: {
    color: Colors.text,
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
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
});
