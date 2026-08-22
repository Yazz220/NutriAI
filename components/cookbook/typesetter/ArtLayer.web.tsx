import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { TypesetterStyleConfig } from '@/constants/typesetterStyles';
import type { TypesetterLayoutConfig } from '@/constants/typesetterLayouts';

export interface ArtLayerProps {
  width: number;
  height: number;
  artUrl?: string | null;
  styleConfig: TypesetterStyleConfig;
  layoutConfig: TypesetterLayoutConfig;
  onImageReady?: () => void;
}

function computeArtRect(
  width: number,
  height: number,
  styleConfig: TypesetterStyleConfig,
  layoutConfig: TypesetterLayoutConfig,
) {
  const margin = width * styleConfig.marginRatio;
  const contentWidth = width - margin * 2;
  const artHeight = height * styleConfig.artHeightRatio;
  const artWidth = contentWidth * layoutConfig.artWidthRatio;
  const x = layoutConfig.artCentered
    ? margin + (contentWidth - artWidth) / 2
    : margin;

  return { x, y: margin * 0.6, width: artWidth, height: artHeight };
}

/**
 * DOM-backed artwork layer for Expo web. Skia's web image loader depends on a
 * CanvasKit bootstrap that is not present in the Expo bundle, while the page's
 * artwork and decorations only need ordinary positioned elements here.
 */
export const ArtLayer = memo(function ArtLayer({
  width,
  height,
  artUrl,
  styleConfig,
  layoutConfig,
  onImageReady,
}: ArtLayerProps) {
  const artRect = useMemo(
    () => computeArtRect(width, height, styleConfig, layoutConfig),
    [height, layoutConfig, styleConfig, width],
  );
  const margin = width * styleConfig.marginRatio;
  const borderInset = width * styleConfig.borderInsetRatio;
  const titleRuleY = artRect.y + artRect.height + height * layoutConfig.artTextGapRatio;

  return (
    <View
      pointerEvents="none"
      style={[styles.layer, { width, height, backgroundColor: styleConfig.paperColor }]}
    >
      {artUrl ? (
        <Image
          source={{ uri: artUrl }}
          resizeMode="contain"
          onLoad={onImageReady}
          style={[styles.art, artRect]}
        />
      ) : null}

      <View
        style={{
          position: 'absolute',
          left: margin,
          top: titleRuleY,
          width: width - margin * 2,
          height: 1,
          backgroundColor: styleConfig.accentColor,
          opacity: styleConfig.accentRuleOpacity,
        }}
      />

      {styleConfig.showBorder ? (
        <View
          style={{
            position: 'absolute',
            left: borderInset,
            top: borderInset,
            width: width - borderInset * 2,
            height: height - borderInset * 2,
            borderWidth: 1,
            borderColor: styleConfig.inkColor,
            opacity: 0.12,
          }}
        />
      ) : null}

      {styleConfig.showArtOrnament && artUrl ? (
        <View
          style={{
            position: 'absolute',
            left: width / 2 - 2,
            top: titleRuleY + 6,
            width: 4,
            height: 4,
            backgroundColor: styleConfig.accentColor,
            opacity: styleConfig.accentRuleOpacity * 0.8,
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
  },
});
