import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
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

export default function MyCookbooksScreen() {
  const params = useLocalSearchParams<{ captureId?: string | string[]; saveRecipe?: string | string[] }>();
  const { cookbooks, isLoading, isShelfStale, shelfError, refresh } = useCookbooks();
  const { open, setVisibleBookContext } = useNoshConversation();
  const handledRequestRef = React.useRef<string | null>(null);
  const captureId = Array.isArray(params.captureId) ? params.captureId[0] : params.captureId;
  const saveRecipe = Array.isArray(params.saveRecipe) ? params.saveRecipe[0] : params.saveRecipe;

  React.useEffect(() => {
    const requestKey = captureId ? `capture:${captureId}` : saveRecipe === '1' ? 'save-recipe' : null;
    if (!requestKey || handledRequestRef.current === requestKey) return;
    handledRequestRef.current = requestKey;
    setVisibleBookContext({ cookbook: null, pages: [], page: null });
    open(
      'share-to-nosh',
      captureId
        ? { kind: 'capture', captureId, title: 'Recipe activity' }
        : { kind: 'collection' },
    );
  }, [captureId, open, saveRecipe, setVisibleBookContext]);

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
