import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Shadows } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantButtonProps {
  page: CookbookPage;
}

export function NoshAssistantButton({ page }: NoshAssistantButtonProps) {
  return (
    <TouchableOpacity style={styles.button} accessibilityLabel={`Ask Nosh about ${page.title}`}>
      <ChefHat size={26} color={Colors.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
});
