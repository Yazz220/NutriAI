import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

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
      <ChevronLeft size={22} color={Colors.text} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.5,
  },
});
