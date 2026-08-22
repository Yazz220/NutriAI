import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import type { NoshFocus } from '@/types/noshInteraction';
import { Fonts } from '@/utils/fonts';

export function NoshFocusChangePrompt({
  requestedFocus,
  currentLabel,
  onAccept,
  onStartNew,
}: {
  requestedFocus: NoshFocus;
  currentLabel: string;
  onAccept: () => void;
  onStartNew: () => void;
}) {
  const requestedLabel = requestedFocus.kind === 'recipe' ? requestedFocus.title : 'this item';
  return (
    <View style={styles.container} accessibilityRole="summary" accessibilityLiveRegion="polite">
      <Text style={styles.title}>Talk about {requestedLabel}?</Text>
      <Text style={styles.copy}>This conversation is still focused on {currentLabel}.</Text>
      <Pressable
        style={styles.primary}
        accessibilityRole="button"
        accessibilityLabel={`Focus this conversation on ${requestedLabel}`}
        onPress={onAccept}
      >
        <Text style={styles.primaryText}>Focus this conversation here</Text>
      </Pressable>
      <Pressable
        style={styles.secondary}
        accessibilityRole="button"
        accessibilityLabel={`Start a new conversation about ${requestedLabel}`}
        onPress={onStartNew}
      >
        <Text style={styles.secondaryText}>Start a new conversation</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.ash, backgroundColor: Colors.white, padding: Spacing.md },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 16 },
  copy: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: 13 },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.charcoal, paddingHorizontal: Spacing.md },
  secondaryText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 13 },
});
