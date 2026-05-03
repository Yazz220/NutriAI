import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Shadows } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface PageCanvasProps {
  page: CookbookPage;
}

export function PageCanvas({ page }: PageCanvasProps) {
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width - Spacing.lg * 2, 420);

  return (
    <View style={[styles.frame, { width: pageWidth }]}>
      {page.imageUrl ? (
        <Image source={{ uri: page.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{page.title}</Text>
          <Text style={styles.emptyStateText}>This page is waiting for its generated cookbook image.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 0.72,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyStateTitle: {
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
