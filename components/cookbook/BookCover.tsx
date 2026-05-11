import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Citrus, CookingPot, Heart, Leaf, NotebookPen, Soup } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/utils/fonts';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import type { CookbookStyleId } from '@/types/cookbook';

interface BookCoverProps {
  title: string;
  coverStyle: CookbookStyleId;
  pageCount?: number;
  imageAsset?: ImageSourcePropType;
  width?: number;
  showPageCount?: boolean;
  style?: ViewStyle;
}

const DEFAULT_WIDTH = 220;
const ASPECT = 1.38;

export function BookCover({
  title,
  coverStyle,
  pageCount,
  imageAsset,
  width = DEFAULT_WIDTH,
  showPageCount = true,
  style,
}: BookCoverProps) {
  const preset = getCookbookStyle(coverStyle);
  const height = width * ASPECT;
  const titleFontSize = Math.max(16, Math.min(30, Math.round(width * 0.115)));
  const spineWidth = Math.max(18, Math.round(width * 0.12));

  if (imageAsset) {
    return (
      <View style={[styles.wrapper, { width, height }, style]}>
        <Image source={imageAsset} style={styles.generatedCover} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { width, height }, style]}>
      <View style={styles.pageBlock}>
        <View style={styles.pageLine} />
        <View style={[styles.pageLine, styles.pageLineShort]} />
        <View style={styles.pageLine} />
      </View>

      <LinearGradient
        colors={[lighten(preset.palette.paper, 8), preset.palette.paper, shade(preset.palette.paper, -12)]}
        style={[styles.face, { borderColor: shade(preset.palette.spine, -18) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <LinearGradient
          colors={[lighten(preset.palette.spine, 10), preset.palette.spine, shade(preset.palette.spine, -18)]}
          style={[styles.spine, { width: spineWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.spineHighlight} />
          <View style={styles.spineGroove} />
        </LinearGradient>

        <View style={styles.coverShine} />
        <View style={styles.crossHatch}>
          {Array.from({ length: 8 }).map((_, index) => (
            <View
              key={`hatch-a-${index}`}
              style={[
                styles.hatchLine,
                { backgroundColor: preset.palette.accent, left: index * (width / 7) - width * 0.2 },
              ]}
            />
          ))}
          {Array.from({ length: 8 }).map((_, index) => (
            <View
              key={`hatch-b-${index}`}
              style={[
                styles.hatchLineAlt,
                { backgroundColor: preset.palette.accent, left: index * (width / 7) - width * 0.16 },
              ]}
            />
          ))}
        </View>

        <View style={[styles.innerBorder, { borderColor: preset.palette.accent, left: spineWidth + 12 }]} />
        <View style={[styles.cornerMark, styles.cornerTopLeft, { borderColor: preset.palette.accent, left: spineWidth + 20 }]} />
        <View style={[styles.cornerMark, styles.cornerTopRight, { borderColor: preset.palette.accent }]} />
        <View style={[styles.cornerMark, styles.cornerBottomLeft, { borderColor: preset.palette.accent, left: spineWidth + 20 }]} />
        <View style={[styles.cornerMark, styles.cornerBottomRight, { borderColor: preset.palette.accent }]} />

        <CoverDecoration coverStyle={coverStyle} accent={preset.palette.accent} width={width} />

        <View style={[styles.titleBlock, { paddingLeft: spineWidth + 10 }]}>
          <Text
            style={[
              styles.title,
              {
                color: preset.palette.ink,
                fontSize: titleFontSize,
                lineHeight: titleFontSize * 1.08,
              },
            ]}
            numberOfLines={3}
            adjustsFontSizeToFit
          >
            {title || 'Untitled'}
          </Text>
          <Text style={[styles.cookbookText, { color: preset.palette.ink }]}>COOKBOOK</Text>
          <View style={[styles.titleRule, { backgroundColor: preset.palette.accent }]} />
        </View>

        {showPageCount && typeof pageCount === 'number' ? (
          <Text style={[styles.pageCount, { color: preset.palette.ink, paddingLeft: spineWidth + 10 }]}>
            {pageCount === 1 ? '1 page' : `${pageCount} pages`}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function CoverDecoration({
  coverStyle,
  accent,
  width,
}: {
  coverStyle: CookbookStyleId;
  accent: string;
  width: number;
}) {
  const iconColor = accent === Colors.blush ? Colors.inkBlack : accent;
  const iconSize = Math.max(38, Math.min(62, Math.round(width * 0.28)));
  const iconProps = { size: iconSize, color: iconColor, strokeWidth: 1.25 };
  const wrapStyle = [
    styles.coverIconWrap,
    { right: Math.round(width * 0.13), bottom: Math.round(width * 0.16) },
  ];

  switch (coverStyle) {
    case 'vintage-garden':
      return (
        <View style={wrapStyle}>
          <Soup {...iconProps} />
          <View style={[styles.smallSprig, { borderColor: accent }]} />
        </View>
      );
    case 'editorial':
      return (
        <View style={wrapStyle}>
          <CookingPot {...iconProps} />
          <Heart size={18} color={iconColor} strokeWidth={1.25} />
        </View>
      );
    case 'watercolor':
      return (
        <View style={wrapStyle}>
          <Soup {...iconProps} />
          <Heart size={18} color={iconColor} strokeWidth={1.25} />
        </View>
      );
    case 'rustic':
      return (
        <View style={wrapStyle}>
          <NotebookPen {...iconProps} />
        </View>
      );
    case 'minimal':
      return (
        <View style={wrapStyle}>
          <Citrus {...iconProps} />
        </View>
      );
    case 'handwritten':
    default:
      return (
        <View style={wrapStyle}>
          <Leaf {...iconProps} />
        </View>
      );
  }
}

function shade(hex: string, percent: number): string {
  return shift(hex, percent);
}

function lighten(hex: string, percent: number): string {
  return shift(hex, percent);
}

function shift(hex: string, percent: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const num = parseInt(m, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'visible',
    boxShadow: '0 14px 24px rgba(17, 17, 17, 0.16)',
  },
  generatedCover: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: Colors.book.page,
  },
  pageBlock: {
    position: 'absolute',
    top: 12,
    right: -8,
    bottom: 10,
    width: 18,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: Colors.book.pageWarm,
    borderWidth: 1,
    borderColor: Colors.book.edge,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 3,
  },
  pageLine: {
    height: 1,
    backgroundColor: Colors.book.edgeStrong,
  },
  pageLineShort: {
    width: '72%',
    alignSelf: 'flex-end',
  },
  face: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingRight: 16,
    paddingVertical: 22,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  spineHighlight: {
    position: 'absolute',
    left: 4,
    top: 9,
    bottom: 9,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(254, 248, 242, 0.44)',
  },
  spineGroove: {
    position: 'absolute',
    right: 4,
    top: 11,
    bottom: 11,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.12)',
  },
  coverShine: {
    position: 'absolute',
    top: -16,
    left: 22,
    right: -18,
    height: '45%',
    backgroundColor: 'rgba(254, 248, 242, 0.18)',
    transform: [{ skewY: '-10deg' }],
  },
  crossHatch: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
    overflow: 'hidden',
  },
  hatchLine: {
    position: 'absolute',
    top: -40,
    width: 1,
    height: '145%',
    transform: [{ rotate: '42deg' }],
  },
  hatchLineAlt: {
    position: 'absolute',
    top: -40,
    width: 1,
    height: '145%',
    transform: [{ rotate: '-42deg' }],
  },
  innerBorder: {
    position: 'absolute',
    top: 14,
    right: 12,
    bottom: 14,
    borderWidth: 1,
    borderRadius: 12,
    opacity: 0.55,
  },
  cornerMark: {
    position: 'absolute',
    width: 28,
    height: 28,
    opacity: 0.48,
  },
  cornerTopLeft: {
    top: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerTopRight: {
    top: 18,
    right: 18,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cornerBottomLeft: {
    bottom: 18,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBottomRight: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  decorTop: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  botanicalCluster: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 82,
    height: 100,
  },
  stem: {
    position: 'absolute',
    left: 38,
    top: 10,
    width: 2,
    height: 82,
    borderRadius: 1,
    opacity: 0.48,
  },
  leaf: {
    position: 'absolute',
    left: 20,
    top: 30,
    width: 20,
    height: 42,
    borderRadius: 12,
    opacity: 0.45,
  },
  leafSmall: {
    left: 42,
    top: 18,
    width: 16,
    height: 32,
  },
  flower: {
    position: 'absolute',
    right: 4,
    bottom: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    opacity: 0.32,
  },
  foodPlate: {
    position: 'absolute',
    right: 22,
    bottom: 34,
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateRing: {
    width: 82,
    height: 56,
    borderRadius: 41,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  foodOval: {
    width: 38,
    height: 24,
    borderRadius: 19,
    opacity: 0.6,
  },
  foodDot: {
    position: 'absolute',
    right: 20,
    top: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.book.accentSoft,
  },
  watercolorGroup: {
    position: 'absolute',
    right: 22,
    bottom: 38,
    width: 92,
    height: 72,
  },
  blob: {
    width: 82,
    height: 42,
    borderRadius: 41,
  },
  blobSmall: {
    position: 'absolute',
    right: 4,
    top: 26,
    width: 42,
    height: 28,
    borderRadius: 21,
  },
  dashed: {
    width: 64,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  thinLine: {
    width: 36,
    height: 1,
  },
  scribble: {
    width: 36,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
  scribbleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleBlock: {
    alignSelf: 'stretch',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  coverIconWrap: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    opacity: 0.9,
  },
  smallSprig: {
    width: 38,
    height: 18,
    borderTopWidth: 1,
    borderRadius: 19,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.8,
  },
  title: {
    fontFamily: Fonts.display.bold,
    textAlign: 'center',
    letterSpacing: 0,
  },
  cookbookText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  titleRule: {
    width: 46,
    height: 1,
    opacity: 0.55,
  },
  pageCount: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
