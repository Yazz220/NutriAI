import React from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Inbox, Plus } from 'lucide-react-native';
import { ShelfScene } from '@/components/shelf/ShelfScene';
import { NoshShelfChatButton } from '@/components/cookbook/NoshAssistantChat';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { useCookbooks } from '@/hooks/useCookbooks';
import type { Cookbook } from '@/types/cookbook';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';

export default function MyCookbooksScreen() {
  const { cookbooks, isLoading, isShelfStale, shelfError, refresh } = useCookbooks();
  const { open, setVisibleBookContext } = useNoshConversation();
  const { captures } = useRecipeCaptures();
  const attentionCount = captures.filter((capture) =>
    capture.status === 'needs_destination' || capture.status === 'needs_attention'
  ).length;

  function openLibrary() {
    router.push('/(book)/library');
  }

  function openSettings() {
    router.push('/(book)/settings');
  }

  function openCookbook(cookbook: Cookbook) {
    router.push(`/(book)/${cookbook.id}`);
  }

  if (isLoading && cookbooks.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (shelfError && cookbooks.length === 0) {
    return (
      <LoadErrorState
        title="Could not open your cookbooks"
        message="Your cookbooks are still safe. Check your connection and try again."
        onRetry={() => {
          void refresh();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ShelfScene
        cookbooks={cookbooks}
        onSelectCookbook={openCookbook}
        onAddCookbook={openLibrary}
        onOpenSettings={openSettings}
        isStale={isShelfStale}
        onRefresh={() => {
          void refresh();
        }}
      />
      <NoshShelfChatButton />
      <Pressable
        style={styles.captureButton}
        onPress={() => {
          setVisibleBookContext({ cookbook: null, pages: [], page: null });
          open('share-to-nosh', { kind: 'collection' });
        }}
        accessibilityRole="button"
        accessibilityLabel="Save a recipe with Nosh"
      >
        <Plus size={17} color={Colors.text} />
        <Text style={styles.importsText}>Save a recipe</Text>
      </Pressable>
      {attentionCount ? (
        <Pressable
          style={styles.importsButton}
          onPress={() => router.push('/(book)/imports')}
          accessibilityRole="button"
          accessibilityLabel={`${attentionCount} recipe imports need attention`}
        >
          <Inbox size={17} color={Colors.text} />
          <Text style={styles.importsText}>{attentionCount === 1 ? '1 recipe needs you' : `${attentionCount} recipes need you`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  importsButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 248,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    boxShadow: Colors.book.cardShadow,
  },
  importsText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 12 },
  captureButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 198,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.md,
    boxShadow: Colors.book.cardShadow,
  },
});
