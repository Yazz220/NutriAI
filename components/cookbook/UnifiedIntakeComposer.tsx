/**
 * UnifiedIntakeComposer — the single multimodal input for adding a recipe.
 *
 * Replaces the legacy AddPageComposer (which required a sourceHint prop
 * and had different UI per source type). This component has:
 *   - One TextInput (always same size, same placeholder)
 *   - Composer-native photo, video, and audio-file attachment controls
 *   - Auto-detection of source type on submit
 *
 * The user can paste a URL, paste text, paste a video link, attach an
 * image, attach an existing video or audio recording, or add notes. The submit handler builds the
 * canonical capture source from what's present. Every source then enters
 * the same durable capture-recipe pipeline.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FileAudio, NotebookPen, Paperclip, X } from 'lucide-react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeCaptureAudioAsset } from '@/utils/cookbook/recipeCaptureAudio';
import type { RecipeCaptureVideoAsset } from '@/utils/cookbook/recipeCaptureVideo';
import {
  classifyVideoSourceUrl,
  isRecognizedVideoSourceUrl,
  socialVideoPlatformSupportsExternalAcquisition,
  socialVideoPlatformLabel,
} from '@/supabase/functions/_shared/videoSource';
import {
  MAX_RECIPE_TEXT_CHARACTERS,
  recipeTextSourceIsTooLarge,
} from '@/supabase/functions/_shared/recipeEvidence';

export type UnifiedIntakePayload =
  | { type: 'url'; input: string }
  | { type: 'text'; input: string }
  | { type: 'video'; input: string; rightsConfirmed: boolean }
  | {
      type: 'video';
      video: RecipeCaptureVideoAsset;
      input?: string;
      rightsConfirmed: boolean;
    }
  | {
      type: 'audio';
      audio: RecipeCaptureAudioAsset;
      input?: string;
    }
  | {
      type: 'image';
      imageUri?: string;
      imageBase64?: string;
      mimeType?: string;
      additionalImages?: RecipeIntakeImage[];
      input?: string;
    };

export interface RecipeIntakeImage {
  uri: string;
  mimeType?: string | null;
}

interface UnifiedIntakeComposerProps {
  isSubmitting?: boolean;
  input: string;
  imageBase64: string | null;
  imageUri?: string | null;
  imageMimeType?: string | null;
  additionalImages?: RecipeIntakeImage[];
  audioAttachment?: RecipeCaptureAudioAsset | null;
  videoAttachment?: RecipeCaptureVideoAsset | null;
  error?: string | null;
  onInputChange: (value: string) => void;
  onImageBase64Change: (value: string | null) => void;
  onImageUriChange?: (uri: string | null, mimeType: string | null) => void;
  onAdditionalImagesChange?: (images: RecipeIntakeImage[]) => void;
  onAudioAttachmentChange?: (audio: RecipeCaptureAudioAsset | null) => void;
  onSourceChange?: () => void;
  onVideoAttachmentChange?: (video: RecipeCaptureVideoAsset | null) => void;
  onRetry?: () => Promise<void> | void;
  onSubmit: (payload: UnifiedIntakePayload) => Promise<void> | void;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function looksLikeVideoUrl(value: string) {
  return isRecognizedVideoSourceUrl(value.trim());
}

/**
 * Build the extract-recipe payload from what the user provided.
 * Auto-detects the source type:
 *   - Audio attached → audio transcription (text becomes optional notes)
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
  audioAttachment: RecipeCaptureAudioAsset | null = null,
  videoAttachment: RecipeCaptureVideoAsset | null = null,
  additionalImages: RecipeIntakeImage[] = [],
): UnifiedIntakePayload | null {
  const trimmed = input.trim();

  if (audioAttachment) {
    return {
      type: 'audio',
      audio: audioAttachment,
      input: trimmed || undefined,
    };
  }

  if (videoAttachment) {
    return {
      type: 'video',
      video: videoAttachment,
      input: trimmed || undefined,
      rightsConfirmed: false,
    };
  }

  if (imageUri) {
    return {
      type: 'image',
      imageUri,
      mimeType: imageMimeType ?? undefined,
      additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
      input: trimmed || undefined,
    };
  }

  if (imageBase64) {
    return { type: 'image', imageBase64, input: trimmed || undefined };
  }

  if (!trimmed) return null;

  if (looksLikeVideoUrl(trimmed)) {
    return { type: 'video', input: trimmed, rightsConfirmed: false };
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
  additionalImages = [],
  audioAttachment = null,
  videoAttachment = null,
  error = null,
  onInputChange,
  onImageBase64Change,
  onImageUriChange,
  onAdditionalImagesChange,
  onAudioAttachmentChange,
  onSourceChange,
  onVideoAttachmentChange,
  onRetry,
  onSubmit,
}: UnifiedIntakeComposerProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  async function pickMedia() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: false,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });

    const assets = result.canceled ? [] : result.assets?.slice(0, 4) ?? [];
    const asset = assets[0] ?? null;
    if (asset?.uri) {
      const containsVideo = assets.some(
        (candidate) => candidate.type === 'video' || candidate.mimeType?.startsWith('video/'),
      );
      if (containsVideo && assets.length > 1) {
        setValidationError('Choose one video, or up to four recipe photos.');
        return;
      }

      onSourceChange?.();
      onAudioAttachmentChange?.(null);
      onImageBase64Change(null);
      if (asset.type === 'video' || asset.mimeType?.startsWith('video/')) {
        onImageUriChange?.(null, null);
        onAdditionalImagesChange?.([]);
        onVideoAttachmentChange?.({
          uri: asset.uri,
          name: asset.fileName ?? 'recipe-video.mp4',
          mimeType: asset.mimeType,
          size: asset.fileSize,
          duration: asset.duration ?? null,
        });
      } else {
        onVideoAttachmentChange?.(null);
        onImageUriChange?.(asset.uri, asset.mimeType ?? null);
        onAdditionalImagesChange?.(assets.slice(1).map((candidate) => ({
          uri: candidate.uri,
          mimeType: candidate.mimeType ?? null,
        })));
      }
    }
  }

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? null : result.assets[0] ?? null;
    if (!asset) return;
    onSourceChange?.();
    onImageBase64Change(null);
    onImageUriChange?.(null, null);
    onAdditionalImagesChange?.([]);
    onVideoAttachmentChange?.(null);
    onAudioAttachmentChange?.({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    });
  }

  async function submit() {
    if (isSubmitting) return;
    if (recipeTextSourceIsTooLarge(input)) {
      setValidationError('Paste one recipe at a time, then try again.');
      return;
    }
    setValidationError(null);
    const payload = buildIntakePayload(
      input,
      imageBase64,
      imageUri,
      imageMimeType,
      audioAttachment,
      videoAttachment,
      additionalImages,
    );
    if (!payload) return;
    if (payload.type !== 'video') {
      await onSubmit(payload);
      return;
    }
    if (!('video' in payload)) {
      const classification = classifyVideoSourceUrl(payload.input);
      if (classification?.kind === 'platform_link') {
        if (socialVideoPlatformSupportsExternalAcquisition(classification.platform)) {
          await onSubmit(payload);
          return;
        }
        const platformLabel = socialVideoPlatformLabel(classification.platform);
        Alert.alert(
          `${platformLabel} videos need one more step`,
          `Nosh cannot download ${platformLabel} videos. To save this recipe, open the original, save or share the video file, then attach it here — or paste the caption text or a screenshot.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open original', onPress: () => { void Linking.openURL(payload.input); } },
            { text: 'Save link anyway', onPress: () => { void onSubmit(payload); } },
          ],
        );
        return;
      }
    }
    Alert.alert(
      'Use a video you can process',
      'Only add a video you made or have permission to use. Folio keeps it private and uses it to create your recipe page.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I have permission',
          onPress: () => { void onSubmit({ ...payload, rightsConfirmed: true }); },
        },
      ],
    );
  }

  const imageCount = (imageUri || imageBase64 ? 1 : 0) + additionalImages.length;
  const hasImage = imageCount > 0;
  const hasAudio = Boolean(audioAttachment);
  const hasVideo = Boolean(videoAttachment);
  const pastedVideoSource = hasImage || hasAudio || hasVideo
    ? null
    : classifyVideoSourceUrl(input.trim());
  const pastedPlatformLabel = pastedVideoSource?.kind === 'platform_link'
    && !socialVideoPlatformSupportsExternalAcquisition(pastedVideoSource.platform)
    ? socialVideoPlatformLabel(pastedVideoSource.platform)
    : null;
  const canSubmit = Boolean(hasImage || hasAudio || hasVideo || input.trim()) && !isSubmitting;

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
          onChangeText={(value) => {
            setValidationError(null);
            onInputChange(value);
          }}
          multiline
          style={styles.input}
          placeholder="Paste a link, recipe, or notes…"
          placeholderTextColor={Colors.textMuted}
          editable={!isSubmitting}
          textAlignVertical="top"
          maxLength={MAX_RECIPE_TEXT_CHARACTERS}
          maxFontSizeMultiplier={2}
          scrollEnabled
          accessibilityLabel="Recipe source"
        />
      </View>

      {pastedPlatformLabel ? (
        <View style={styles.sourceGuidance} accessibilityLiveRegion="polite">
          <Text style={styles.sourceGuidanceTitle}>{pastedPlatformLabel} video recipe</Text>
          <Text style={styles.sourceGuidanceBody}>
            Save or share the video file, then attach it here — or paste the caption or a screenshot.
          </Text>
        </View>
      ) : null}

      {hasImage || hasAudio || hasVideo ? (
        <View style={styles.attachmentChip}>
          <Text style={styles.attachmentText} numberOfLines={1}>
            {hasAudio
              ? `${audioAttachment?.name ?? 'Audio'} attached${input.trim() ? ' with notes' : ''}`
              : hasVideo
                ? `${videoAttachment?.name ?? 'Video'} attached${input.trim() ? ' with notes' : ''}`
                : `${imageCount === 1 ? 'Photo' : `${imageCount} photos`} attached${input.trim() ? ' with notes' : ''}`}
          </Text>
          <Pressable
            onPress={() => {
              onSourceChange?.();
              onImageBase64Change(null);
              onImageUriChange?.(null, null);
              onAdditionalImagesChange?.([]);
              onAudioAttachmentChange?.(null);
              onVideoAttachmentChange?.(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={hasAudio ? 'Remove attached audio' : hasVideo ? 'Remove attached video' : imageCount > 1 ? 'Remove attached images' : 'Remove attached image'}
            style={styles.removeAttachment}
            hitSlop={Spacing.sm}
          >
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {validationError || error ? (
        <View style={styles.errorNotice} accessibilityRole="alert">
          <Text style={styles.errorTitle}>
            {validationError ? 'Recipe text is too long' : 'Couldn\'t read this recipe'}
          </Text>
          <Text style={styles.errorBody} selectable>{validationError ?? error}</Text>
          {onRetry && !validationError ? (
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
            (hasImage || hasVideo) && styles.attachButtonSelected,
            isSubmitting && styles.disabled,
            pressed && !isSubmitting && styles.pressed,
          ]}
          onPress={pickMedia}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={hasImage || hasVideo ? 'Change attached photo or video' : 'Attach photo or video'}
          accessibilityState={{ disabled: isSubmitting, selected: hasImage || hasVideo }}
        >
          <Paperclip size={18} color={hasImage || hasVideo ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.attachText, (hasImage || hasVideo) && styles.attachTextSelected]}>Media</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.attachButton,
            hasAudio && styles.attachButtonSelected,
            isSubmitting && styles.disabled,
            pressed && !isSubmitting && styles.pressed,
          ]}
          onPress={pickAudio}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={hasAudio ? 'Change attached audio file' : 'Attach audio file'}
          accessibilityState={{ disabled: isSubmitting, selected: hasAudio }}
        >
          <FileAudio size={18} color={hasAudio ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.attachText, hasAudio && styles.attachTextSelected]}>Audio</Text>
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
    paddingHorizontal: Spacing.sm,
  },
  attachButtonSelected: {
    backgroundColor: Colors.book.accentSoft,
  },
  attachText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
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
  sourceGuidance: {
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sourceGuidanceTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  sourceGuidanceBody: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
  },
  footer: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
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
    minWidth: 128,
    minHeight: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.coral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  primaryText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
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
