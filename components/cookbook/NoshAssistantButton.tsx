import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { NoshAssistantSheet } from '@/components/cookbook/NoshAssistantSheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantButtonProps {
  page: CookbookPage;
  cookbookPages: CookbookPage[];
}

export function NoshAssistantButton({ page, cookbookPages }: NoshAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.button}
        accessibilityLabel={`Ask Nosh about ${page.title}`}
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
      >
        <ChefHat size={20} color={Colors.onPrimary} />
        <Text style={styles.label}>Nosh</Text>
      </Pressable>
      <NoshAssistantSheet
        visible={isOpen}
        page={page}
        cookbookPages={cookbookPages}
        onClose={() => setIsOpen(false)}
      />
    </>
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
