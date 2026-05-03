import React from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyBookState } from '@/components/cookbook/EmptyBookState';
import { TableOfContents } from '@/components/cookbook/TableOfContents';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';

export default function TableOfContentsScreen() {
  const insets = useSafeAreaInsets();
  const { pages, setSelectedPageId, isLoading } = useCookbook();

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    router.replace('/(book)');
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (pages.length === 0) {
    return <EmptyBookState onAddPage={() => router.replace('/(book)/add')} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TableOfContents pages={pages} onSelectPage={handleSelectPage} />
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
