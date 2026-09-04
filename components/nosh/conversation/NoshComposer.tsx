import React from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Paperclip, Send, Square, X } from 'lucide-react-native';
import { ComposerPrimitive, useAui, useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { getNoshComposerMode } from './noshConversationPresentation';

const PHOTO_PROMPT = 'Add this recipe from the attached photo';
const INPUT_MIN_HEIGHT = 44;
const INPUT_MAX_HEIGHT = 120;

export function clampNoshComposerHeight(height: number) {
  return Math.min(INPUT_MAX_HEIGHT, Math.max(INPUT_MIN_HEIGHT, Math.ceil(height)));
}

export function NoshComposer({
  interaction,
  sendDisabled = false,
}: {
  interaction: NoshInteractionSession;
  sendDisabled?: boolean;
}) {
  const isEmpty = useAuiState((state) => state.composer.isEmpty);
  const composerText = useAuiState((state) => state.composer.text);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const aui = useAui();
  const mode = getNoshComposerMode(interaction);
  const {
    pendingImageBase64,
    pendingImageMimeType,
    setPendingImageBase64,
    setPendingImageMimeType,
  } = useNoshConversation();
  const [inputHeight, setInputHeight] = React.useState(INPUT_MIN_HEIGHT);
  const ownsPhotoPromptRef = React.useRef(false);
  const sendIsDisabled = sendDisabled || isEmpty;

  const handleContentSizeChange = React.useCallback((
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    if (Platform.OS === 'web') return;
    setInputHeight(clampNoshComposerHeight(event.nativeEvent.contentSize.height));
  }, []);

  async function pickRecipePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert('Photo access is needed', 'Allow photo access to send Folio a recipe image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
      allowsEditing: false,
    });
    const asset = result.canceled ? null : result.assets?.[0] ?? null;
    if (!asset?.base64) return;
    const mimeType = asset.mimeType ?? 'image/jpeg';
    try {
      await aui.composer.clearAttachments();
      await aui.composer.addAttachment({
        type: 'image',
        name: asset.fileName ?? 'Recipe photo',
        contentType: mimeType,
        content: [{
          type: 'image',
          // The extraction payload stays in conversation context. Persist only
          // a lightweight transcript marker, not a large base64 image copy.
          image: 'nosh://recipe-photo',
          filename: asset.fileName ?? 'Recipe photo',
        }],
      });
      setPendingImageBase64(asset.base64);
      setPendingImageMimeType(mimeType);
      const shouldOwnPrompt = isEmpty
        || (ownsPhotoPromptRef.current && composerText === PHOTO_PROMPT);
      if (shouldOwnPrompt) aui.composer.setText(PHOTO_PROMPT);
      ownsPhotoPromptRef.current = shouldOwnPrompt;
    } catch {
      Alert.alert('Could not attach photo', 'Please choose the photo again.');
    }
  }

  async function removeRecipePhoto() {
    await aui.composer.clearAttachments();
    setPendingImageBase64(null);
    setPendingImageMimeType(null);
    if (ownsPhotoPromptRef.current && composerText === PHOTO_PROMPT) {
      aui.composer.setText('');
    }
    ownsPhotoPromptRef.current = false;
  }

  return (
    <View style={styles.area}>
      <ComposerPrimitive.Root style={styles.composer}>
        {mode.allowsRecipePhoto && pendingImageBase64 ? (
          <View style={styles.attachment}>
            <Image
              source={{
                uri: `data:${pendingImageMimeType ?? 'image/jpeg'};base64,${pendingImageBase64}`,
              }}
              style={styles.attachmentImage}
              accessible
              accessibilityLabel="Attached recipe photo"
            />
            <Text style={styles.attachmentText} numberOfLines={1}>Recipe photo</Text>
            <Pressable
              onPress={() => void removeRecipePhoto()}
              disabled={isRunning}
              accessibilityRole="button"
              accessibilityLabel="Remove recipe photo"
              accessibilityState={{ disabled: isRunning }}
              hitSlop={4}
              style={({ pressed }) => [
                styles.attachmentRemove,
                isRunning && styles.controlDisabled,
                pressed && !isRunning && styles.controlPressed,
              ]}
            >
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          {mode.allowsRecipePhoto ? (
            <Pressable
              onPress={() => void pickRecipePhoto()}
              disabled={isRunning || sendDisabled}
              style={({ pressed }) => [
                styles.iconButton,
                (isRunning || sendDisabled) && styles.controlDisabled,
                pressed && !isRunning && !sendDisabled && styles.controlPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={pendingImageBase64 ? 'Change attached image' : 'Attach image or screenshot'}
              accessibilityState={{ disabled: isRunning || sendDisabled, selected: Boolean(pendingImageBase64) }}
            >
              <Paperclip size={18} color={pendingImageBase64 ? Colors.primary : Colors.textSecondary} />
            </Pressable>
          ) : null}
          <ComposerPrimitive.Input
            placeholder={mode.placeholder}
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="Message Folio"
            accessibilityHint={Platform.OS === 'web'
              ? 'Press Enter to send. Press Shift and Enter for a new line.'
              : undefined}
            multiline
            numberOfLines={1}
            scrollEnabled
            maxFontSizeMultiplier={2}
            textAlignVertical="top"
            submitMode={sendDisabled ? 'none' : 'enter'}
            onContentSizeChange={handleContentSizeChange}
            style={[
              styles.input,
              Platform.OS === 'web' ? undefined : { height: inputHeight },
            ]}
          />
          {isRunning ? (
            <ComposerPrimitive.Cancel
              accessibilityLabel="Stop response"
              accessibilityHint="Stops Folio's current response"
              style={({ pressed }) => [styles.actionButton, pressed && styles.controlPressed]}
            >
              <Square size={12} color={Colors.onPrimary} fill={Colors.onPrimary} />
            </ComposerPrimitive.Cancel>
          ) : (
            <ComposerPrimitive.Send
              disabled={sendIsDisabled}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: sendIsDisabled }}
              style={({ pressed }) => [
                styles.actionButton,
                sendIsDisabled && styles.sendDisabled,
                pressed && !sendIsDisabled && styles.controlPressed,
              ]}
            >
              <Send size={17} color={Colors.onPrimary} />
            </ComposerPrimitive.Send>
          )}
        </View>
      </ComposerPrimitive.Root>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  composer: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.xs,
  },
  attachment: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.values[4],
    marginBottom: Spacing.xs,
  },
  attachmentImage: {
    width: 44,
    height: 44,
    borderRadius: Radii.sm,
    backgroundColor: Colors.backgroundSecondary,
  },
  attachmentText: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes.smPlus,
    fontFamily: Fonts.ui.medium,
  },
  attachmentRemove: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  input: {
    flex: 1,
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.values[10],
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    outlineWidth: 0,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  sendDisabled: { opacity: Colors.state.disabledOpacity },
  controlDisabled: { opacity: Colors.state.disabledOpacity },
  controlPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
});
