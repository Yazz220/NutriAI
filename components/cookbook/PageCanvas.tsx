import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookPage } from '@/types/cookbook';

interface PageCanvasProps {
  page: CookbookPage;
  bookMode?: boolean;
}

function PageSkeleton({ page }: { page: CookbookPage }) {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonInner}>
        <Text style={styles.skeletonEyebrow}>Cookbook page</Text>
        <Text style={styles.skeletonTitle} numberOfLines={2} adjustsFontSizeToFit>
          {page.title}
        </Text>
        <View style={styles.skeletonRule} />
        <Text style={styles.skeletonHint}>Page artwork is being prepared.</Text>
      </View>
    </View>
  );
}

export function PageCanvas({ page, bookMode = false }: PageCanvasProps) {
  const { width, height } = useWindowDimensions();
  const horizontalInset = width < 390 ? Spacing.md : Spacing.xl;
  const pageWidth = bookMode ? '100%' : Math.min(width - horizontalInset * 2, 430);
  const maxHeight = bookMode ? undefined : Math.max(500, height - 220);
  const imageSource = page.imageAsset ?? (page.imageUrl ? { uri: page.imageUrl } : null);

  return (
    <View style={[styles.frame, bookMode && styles.bookFrame, { width: pageWidth, maxHeight }]}>
      {imageSource ? (
        <Image source={imageSource} style={styles.image} resizeMode="contain" />
      ) : (
        <PageSkeleton page={page} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 2 / 3,
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.ash,
    overflow: 'hidden',
    boxShadow: Colors.book.paperShadow,
  },
  bookFrame: {
    height: '100%',
    aspectRatio: undefined,
    borderRadius: 0,
    borderWidth: 0,
    boxShadow: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skeleton: {
    flex: 1,
    backgroundColor: Colors.alabaster,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonInner: {
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 320,
  },
  skeletonEyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 1,
  },
  skeletonTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  skeletonRule: {
    width: 64,
    height: 1,
    backgroundColor: Colors.ash,
  },
  skeletonHint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
