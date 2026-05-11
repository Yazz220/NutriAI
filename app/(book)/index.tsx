import React from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CookbookShelf } from '@/components/cookbook/CookbookShelf';
import { EmptyShelfState } from '@/components/cookbook/EmptyShelfState';
import { Colors } from '@/constants/colors';
import { useCookbooks } from '@/hooks/useCookbooks';
import type { Cookbook } from '@/types/cookbook';

export default function MyCookbooksScreen() {
  const { cookbooks, isLoading } = useCookbooks();

  function openLibrary() {
    router.push('/(book)/library');
  }

  function openCookbook(cookbook: Cookbook) {
    router.push(`/(book)/${cookbook.id}`);
  }

  function openSettings() {
    router.push('/(book)/settings');
  }

  if (isLoading && cookbooks.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (cookbooks.length === 0) {
    return <EmptyShelfState onAddCookbook={openLibrary} />;
  }

  return (
    <CookbookShelf
      cookbooks={cookbooks}
      onSelectCookbook={openCookbook}
      onAddCookbook={openLibrary}
      onOpenSettings={openSettings}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
