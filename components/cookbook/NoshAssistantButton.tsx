import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { NoshAssistantSheet } from '@/components/cookbook/NoshAssistantSheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/utils/fonts';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantButtonProps {
  page: CookbookPage;
  cookbookPages: CookbookPage[];
  cookbookTitle?: string;
  pageNumber?: number;
}

export function NoshAssistantButton({
  page,
  cookbookPages,
  cookbookTitle,
  pageNumber,
}: NoshAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.button}
        accessibilityLabel={`Ask Nosh about ${page.title}`}
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
      >
        <ChefHat size={20} color={Colors.text} />
        <Text style={styles.label}>Ask Nosh</Text>
      </Pressable>
      <NoshAssistantSheet
        visible={isOpen}
        page={page}
        cookbookPages={cookbookPages}
        cookbookTitle={cookbookTitle}
        pageNumber={pageNumber}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 22,
    bottom: 34,
    minWidth: 126,
    height: 44,
    borderRadius: 9999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.butterscotch,
    boxShadow: Colors.book.cardShadow,
  },
  label: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
});
