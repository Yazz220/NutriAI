import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BookReader } from '@/components/cookbook/BookReader';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';
import { shareCookbookPage } from '@/utils/cookbook/share';
import type { CookbookPage } from '@/types/cookbook';

export default function BookReaderScreen() {
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const {
    cookbook,
    pages,
    setSelectedPageId,
    isLoading,
  } = useCookbook(cookbookId);

  const handleShare = async (page: CookbookPage) => {
    try {
      await shareCookbookPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'This page is not ready to share yet.';
      Alert.alert('Share unavailable', message);
    }
  };

  if (isLoading && pages.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <BookReader
      cookbook={cookbook}
      pages={pages}
      onSelectPage={setSelectedPageId}
      onShare={handleShare}
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
