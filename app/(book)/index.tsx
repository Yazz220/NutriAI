import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyBookState } from '@/components/cookbook/EmptyBookState';
import { Colors } from '@/constants/colors';
import { useCookbook } from '@/hooks/useCookbook';

export default function BookReaderScreen() {
  const insets = useSafeAreaInsets();
  const { pages, isLoading } = useCookbook();

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

  return <View style={[styles.container, { paddingTop: insets.top }]} />;
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
