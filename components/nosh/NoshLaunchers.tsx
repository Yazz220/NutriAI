import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import { Fonts } from '@/utils/fonts';

export function NoshAssistantChatButton({ page, cookbook, cookbookPages, onOpen, compact = false }: {
  page: CookbookPage;
  cookbook: Cookbook;
  cookbookPages: CookbookPage[];
  onOpen?: () => void;
  compact?: boolean;
}) {
  const { open, setVisibleBookContext } = useNoshConversation();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.recipeButton,
        compact && styles.recipeButtonCompact,
        pressed && styles.recipeButtonPressed,
      ]}
      accessibilityLabel={`Ask Nosh about ${page.title}`}
      accessibilityRole="button"
      onPress={() => {
        onOpen?.();
        setVisibleBookContext({ cookbook, pages: cookbookPages, page });
        open('recipe-ask', { kind: 'recipe', cookbookId: cookbook.id, pageId: page.id, title: page.title });
      }}
    >
      <NoshSymbol size={24} />
      {compact ? null : <Text style={styles.recipeLabel}>Ask Nosh</Text>}
    </Pressable>
  );
}

export function NoshShelfChatButton() {
  const { open, setVisibleBookContext } = useNoshConversation();
  return (
    <Pressable
      style={({ pressed }) => [styles.shelfButton, pressed && styles.shelfButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel="Ask Nosh about your cookbooks"
      onPress={() => {
        setVisibleBookContext({ cookbook: null, pages: [], page: null });
        open('shelf-nosh', { kind: 'collection' });
      }}
    >
      <NoshSymbol size={30} tone="ivory" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recipeButton: { minWidth: 126, height: 44, borderRadius: Radii.full, paddingHorizontal: Spacing.values[18], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.values[7], backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primary, boxShadow: Colors.book.cardShadow },
  recipeButtonCompact: { minWidth: 44, width: 44, paddingHorizontal: 0 },
  recipeButtonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  recipeLabel: { color: Colors.primary, fontFamily: Fonts.ui.medium },
  shelfButton: { position: 'absolute', right: Spacing.md, top: 132, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.numeric[27], borderWidth: 1, borderColor: Colors.primaryDark, backgroundColor: Colors.primary, boxShadow: Colors.book.liftedShadow },
  shelfButtonPressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
});
