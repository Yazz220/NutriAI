import React from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantButtonProps {
  page: CookbookPage;
}

export function NoshAssistantButton({ page }: NoshAssistantButtonProps) {
  return (
    <Pressable
      style={styles.button}
      accessibilityLabel={`Ask Nosh about ${page.title}`}
      accessibilityRole="button"
      onPress={() => {
        Alert.alert('Nosh is getting ready', `Soon you can ask Nosh about ${page.title}.`);
      }}
    >
      <ChefHat size={20} color={Colors.onPrimary} />
      <Text style={styles.label}>Nosh</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    bottom: 88,
    minWidth: 86,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 239, 0.48)',
    boxShadow: '0 10px 20px rgba(34, 21, 10, 0.26)',
  },
  label: {
    color: Colors.onPrimary,
    fontWeight: '800',
  },
});
