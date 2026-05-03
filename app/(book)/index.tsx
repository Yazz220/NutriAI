import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookReader } from '@/components/cookbook/BookReader';
import { EmptyBookState } from '@/components/cookbook/EmptyBookState';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';
import type { CookbookPage } from '@/types/cookbook';

export default function BookReaderScreen() {
  const insets = useSafeAreaInsets();
  const { pages, selectedPageId, setSelectedPageId, isLoading } = useCookbook();

  const handleShare = (_page: CookbookPage) => {
    router.push('/(book)/settings');
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (pages.length === 0) {
    return <EmptyBookState onAddPage={() => router.push('/(book)/add')} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BookReader
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onShare={handleShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
