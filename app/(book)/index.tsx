import React from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ShelfScene } from '@/components/shelf/ShelfScene';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Colors } from '@/constants/colors';
import { useCookbooks } from '@/hooks/useCookbooks';
import type { Cookbook } from '@/types/cookbook';

export default function MyCookbooksScreen() {
  const { cookbooks, isLoading, isShelfStale, shelfError, refresh } = useCookbooks();

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
});
