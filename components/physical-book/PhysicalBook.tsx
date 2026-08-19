import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, ViewStyle } from 'react-native';
import { BookCover } from '@/components/cookbook/BookCover';
import { ContactShadow } from '@/components/physical-book/ContactShadow';
import { FoilStampedTitle } from '@/components/physical-book/FoilStampedTitle';
import { PageBlockEdges } from '@/components/physical-book/PageBlockEdges';
import { SkiaBookCover } from '@/components/physical-book/SkiaBookCover';
import { getCookbookBinding } from '@/constants/cookbookBindings';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import type { CookbookStyleId } from '@/types/cookbook';

/**
 * A physically bound cookbook volume: page block on the fore-edge, a Skia
 * cloth/leather cover with curved spine and foil stamping, and a contact
 * shadow. Shared by the 3D shelf, the creation studio, and (in Phase 3) the
 * reader's closed cover so the shelf-to-reader handoff is pixel-continuous.
 *
 * Static in Phase 1: `rotateYDeg` poses the book with a perspective
 * transform. The shelf (Phase 2) drives the same pose from shared values.
 *
 * Legacy styles without a binding archetype render the classic `BookCover`
 * artwork so existing cookbooks stay intact on the new shelf.
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

export const PHYSICAL_BOOK_ASPECT = 1.38;
const DEFAULT_WIDTH = 220;

interface PhysicalBookProps {
  title: string;
  coverStyle: CookbookStyleId;
  pageCount?: number;
  imageAsset?: ImageSourcePropType;
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
  pageCount,
  imageAsset,
  width = DEFAULT_WIDTH,
  rotateYDeg = 0,
  showShadow = true,
  style,
}: PhysicalBookProps) {
  const preset = getCookbookStyle(coverStyle);
  const binding = preset.binding ? getCookbookBinding(preset.binding) : undefined;
  const height = width * PHYSICAL_BOOK_ASPECT;
  const spineWidth = resolveSpineWidth(width, pageCount ?? 12);
  const blockWidth = Math.max(6, Math.min(width * 0.09, 6 + (pageCount ?? 8) * 0.25));

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

      {imageAsset ? (
        <Image source={imageAsset} style={styles.generatedCover} resizeMode="cover" />
      ) : binding ? (
        <>
          <PageBlockEdges height={height} blockWidth={blockWidth} />
          <SkiaBookCover binding={binding} width={width} height={height} spineWidth={spineWidth} />
          <FoilStampedTitle title={title || 'Untitled'} foil={binding.foil} width={width} spineWidth={spineWidth} />
        </>
      ) : (
        <BookCover
          title={title}
          coverStyle={coverStyle}
          pageCount={pageCount}
          width={width}
          showPageCount={false}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  generatedCover: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
