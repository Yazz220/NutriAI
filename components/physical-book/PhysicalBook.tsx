import { Colors } from '@/constants/colors';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, ViewStyle } from 'react-native';
import { ContactShadow } from '@/components/physical-book/ContactShadow';
import { FoilStampedTitle } from '@/components/physical-book/FoilStampedTitle';
import { PageBlockEdges } from '@/components/physical-book/PageBlockEdges';
import { SkiaBookCover } from '@/components/physical-book/SkiaBookCover';
import { resolveCookbookBinding } from '@/constants/cookbookBindings';
import { COOKBOOK_GEOMETRY } from '@/constants/cookbookGeometry';
import { resolveNoshBookMaterialGeometry } from '@/constants/cookbookMaterial';
import type {
  CookbookCoverColorId,
  CookbookCoverFinishId,
  CookbookStyleId,
} from '@/types/cookbook';

/**
 * A physically bound cookbook volume: page block on the fore-edge, a Skia
 * clothbound cover with a curved spine, restrained title stamp, and contact
 * shadow. Shared by the 3D shelf, creation studio, and reader so the
 * shelf-to-reader handoff stays physically continuous.
 *
 * Static in Phase 1: `rotateYDeg` poses the book with a perspective
 * transform. The shelf (Phase 2) drives the same pose from shared values.
 *
 * Legacy cover ids and optional artwork are normalized onto this same shell.
 * Artwork is a cloth print layer, never a replacement physical book.
 *
 * ## Decal coordinate convention (future sticker customization)
 *
 * When sticker decals / emblem overlays are added, they MUST use
 * cover-relative 0–1 coordinates (origin top-left of the cover canvas,
 * x right, y down). This keeps a placed sticker pixel-identical across
 * shelf size, inspector size, and the reader's closed cover. The decal
 * layer will be an absolutely-positioned RN `Image` / Skia picture
 * rendered above `SkiaBookCover` and below `FoilStampedTitle`, scaled
 * by `width` / `height`. Do NOT introduce pixel-space coordinates.
 */

export const PHYSICAL_BOOK_ASPECT = COOKBOOK_GEOMETRY.page.heightRatio;
const DEFAULT_WIDTH = 220;

interface PhysicalBookProps {
  title: string;
  coverStyle: CookbookStyleId;
  coverFinishId?: CookbookCoverFinishId;
  coverColorId?: CookbookCoverColorId;
  pageCount?: number;
  imageAsset?: ImageSourcePropType;
  face?: 'front' | 'back';
  width?: number;
  /** Static Y-axis rotation in degrees; negative tilts the spine toward the viewer. */
  rotateYDeg?: number;
  showShadow?: boolean;
  style?: ViewStyle;
}

/** Spine thickness grows with the page count, like a real bound volume. */
export function resolveSpineWidth(width: number, pageCount: number): number {
  const target = width * 0.075 + pageCount * 0.3;
  return Math.max(width * 0.09, Math.min(width * 0.17, target));
}

export const PhysicalBook = React.memo(function PhysicalBook({
  title,
  coverStyle,
  coverFinishId,
  coverColorId,
  pageCount,
  imageAsset,
  face = 'front',
  width = DEFAULT_WIDTH,
  rotateYDeg = 0,
  showShadow = true,
  style,
}: PhysicalBookProps) {
  const binding = resolveCookbookBinding({
    finishId: coverFinishId,
    colorId: coverColorId,
    legacyStyleId: coverStyle,
  });
  const height = width * PHYSICAL_BOOK_ASPECT;
  const materialGeometry = resolveNoshBookMaterialGeometry(width, pageCount);
  const hingeWidth = materialGeometry.hingeWidth;
  const blockWidth = materialGeometry.pageBlockDepth;
  const boardRadius = materialGeometry.boardCornerRadius;

  return (
    <View
      style={[
        styles.wrapper,
        { width, height },
        rotateYDeg !== 0 && {
          transform: [{ perspective: 900 }, { rotateY: `${rotateYDeg}deg` }],
        },
        style,
      ]}
    >
      {showShadow ? <ContactShadow width={width} /> : null}

      <View style={[styles.face, face === 'back' && styles.backFace]}>
        <PageBlockEdges
          width={width}
          height={height}
          blockWidth={blockWidth}
          inset={materialGeometry.pageBlockInset}
          cornerRadius={materialGeometry.pageCornerRadius}
          rotateYDeg={rotateYDeg}
        />
        <SkiaBookCover binding={binding} width={width} height={height} spineWidth={hingeWidth} />
        {imageAsset ? (
          <Image source={imageAsset} style={[styles.coverArtwork, { borderRadius: boardRadius }]} resizeMode="cover" />
        ) : null}
        {face === 'back' ? (
          <View pointerEvents="none" style={[styles.backWash, { borderRadius: boardRadius }]} />
        ) : (
          <FoilStampedTitle title={title || 'Untitled'} foil={binding.foil} width={width} spineWidth={hingeWidth} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  backFace: {
    transform: [{ scaleX: -1 }],
  },
  coverArtwork: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.34,
  },
  backWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.legacySurface.v55,
  },
});
