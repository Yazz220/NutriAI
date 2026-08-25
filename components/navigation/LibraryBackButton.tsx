import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export function LibraryBackButton() {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(book)');
      }}
      accessibilityRole="button"
      accessibilityLabel="Back to cookbook library"
    >
      <ChevronLeft size={18} color={Colors.text} />
      <Text style={styles.label}>Library</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[4],
    backgroundColor: Colors.legacySurface.v81,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  buttonPressed: {
    backgroundColor: Colors.parchment,
  },
  label: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
});
