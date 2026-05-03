import React from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TableOfContents } from '@/components/cookbook/TableOfContents';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';
import { SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/samplePages';

export default function TableOfContentsScreen() {
  const insets = useSafeAreaInsets();
  const { pages, setSelectedPageId, isLoading } = useCookbook();
  const displayPages = pages.length > 0 ? pages : SAMPLE_COOKBOOK_PAGES;

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TableOfContents pages={displayPages} onSelectPage={handleSelectPage} />
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
