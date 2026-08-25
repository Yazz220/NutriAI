import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Send, X } from 'lucide-react-native';
import { ComposerPrimitive, useAui, useAuiState } from '@assistant-ui/react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import type { NoshInteractionSession } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';
import { getNoshComposerMode } from './noshConversationPresentation';

export function NoshComposer({
  interaction,
  contextModelEnabled,
}: {
  interaction: NoshInteractionSession;
  contextModelEnabled: boolean;
}) {
  const isEmpty = useAuiState((state) => state.composer.isEmpty);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const aui = useAui();
  const mode = getNoshComposerMode(interaction, contextModelEnabled);
  const { pendingImageBase64, setPendingImageBase64, setPendingImageMimeType } = useNoshConversation();

  async function pickRecipePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert('Photo access is needed', 'Allow photo access to send Nosh a recipe image.');
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
    setPendingImageBase64(asset.base64);
    setPendingImageMimeType(asset.mimeType ?? 'image/jpeg');
    if (isEmpty) aui.composer.setText('Add this recipe from the attached photo');
  }

  return (
    <View style={styles.area}>
      {mode.allowsRecipePhoto && pendingImageBase64 ? (
        <View style={styles.attachment}>
          <Camera size={14} color={Colors.text} />
          <Text style={styles.attachmentText}>Recipe photo attached</Text>
          <Pressable
            onPress={() => {
              setPendingImageBase64(null);
              setPendingImageMimeType(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Remove recipe photo"
            hitSlop={8}
          >
            <X size={14} color={Colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <ComposerPrimitive.Root style={styles.composer}>
        {mode.allowsRecipePhoto ? (
          <Pressable
            onPress={() => void pickRecipePhoto()}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Attach a recipe photo"
          >
            <Camera size={18} color={Colors.text} />
          </Pressable>
        ) : null}
        <ComposerPrimitive.Input
          placeholder={mode.placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          style={styles.input}
        />
        {isRunning ? (
          <ComposerPrimitive.Cancel style={styles.cancel}>
            <Text style={styles.cancelText}>Stop</Text>
          </ComposerPrimitive.Cancel>
        ) : (
          <ComposerPrimitive.Send style={[styles.send, isEmpty && styles.sendDisabled]}>
            <Send size={17} color={Colors.onPrimary} />
          </ComposerPrimitive.Send>
        )}
      </ComposerPrimitive.Root>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { gap: Spacing.xs },
  attachment: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    borderRadius: Radii.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.ash,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.values[6],
  },
  attachmentText: { color: Colors.text, fontSize: Typography.sizes.md, fontFamily: Fonts.ui.medium },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, borderRadius: Radii.xl,
    borderWidth: 1, borderColor: Colors.charcoal, backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full },
  input: { flex: 1, minHeight: 40, maxHeight: 112, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.values[10], color: Colors.text, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, },
  send: { width: 40, height: 40, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  sendDisabled: { opacity: 0.45 },
  cancel: { height: 40, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  cancelText: { color: Colors.primary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
});
