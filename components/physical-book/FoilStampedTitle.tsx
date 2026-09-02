import { Typography } from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Fonts } from '@/utils/fonts';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import {
  resolveCoverTitleCenterRatio,
  resolveCoverTitleTreatment,
} from '@/constants/cookbookCoverTypography';
import type { CookbookCoverTitlePlacementId } from '@/types/cookbook';
import { withAlpha } from '@/utils/cookbook/coverArt';

/**
 * Foil-stamped cover typography. RN Text (the app display serif) layered
 * three deep for a shallow stamped impression. The highlight and shadow stay
 * quiet so the cover reads as matte book cloth rather than polished metal.
 */

interface FoilStampedTitleProps {
  title: string;
  foil: CookbookBinding['foil'];
  width: number;
  spineWidth: number;
  placementId: CookbookCoverTitlePlacementId;
}

export const FoilStampedTitle = React.memo(function FoilStampedTitle({
  title,
  foil,
  width,
  spineWidth,
  placementId,
}: FoilStampedTitleProps) {
  const titleFontSize = Math.max(14, Math.min(26, Math.round(width * 0.105)));
  const centerRatio = resolveCoverTitleCenterRatio(placementId);
  const treatment = resolveCoverTitleTreatment(placementId);
  const titleBlockHeight = width * 0.72;
  const isEditorial = treatment === 'editorial';
  const isModern = treatment === 'modern';
  const isBookplate = treatment === 'bookplate';
  const isSingleFace = treatment !== 'classic';
  const displayTitle = isModern ? title.toLocaleUpperCase() : title;
  const composedFontSize = isEditorial
    ? titleFontSize * 1.16
    : isModern
      ? titleFontSize * 0.7
      : isBookplate
        ? titleFontSize * 0.78
      : titleFontSize;
  const compositionStyle = [
    isEditorial && styles.editorialTitle,
    isModern && styles.modernTitle,
    isBookplate && styles.bookplateTitle,
  ];

  return (
    <View
      style={[
        styles.wrap,
        {
          left: spineWidth + 14,
          height: titleBlockHeight,
          top: `${centerRatio * 100}%`,
          transform: [{ translateY: -titleBlockHeight / 2 }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.titleStack, (isEditorial || isModern) && styles.leftTitleStack]}>
        {isEditorial ? (
          <View style={[styles.editorialRule, { backgroundColor: withAlpha(foil[1], 0.72) }]} />
        ) : null}
        {isBookplate ? (
          <View
            testID="bookplate-title-frame"
            style={[
              styles.bookplateFrame,
              {
                height: Math.round(width * 0.25),
                borderColor: withAlpha(foil[1], 0.76),
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                styles.bookplateTitle,
                {
                  color: withAlpha(foil[1], 0.94),
                  fontSize: composedFontSize,
                  lineHeight: composedFontSize * 1.12,
                },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              allowFontScaling={false}
            >
              {displayTitle}
            </Text>
          </View>
        ) : null}
        {!isSingleFace ? (
          <>
            <Text
              style={[
                styles.title,
                styles.titleLayer,
                {
                  color: withAlpha(foil[2], 0.5),
                  fontSize: composedFontSize,
                  lineHeight: composedFontSize * 1.12,
                  transform: [{ translateY: -0.55 }],
                },
              ]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              allowFontScaling={false}
            >
              {displayTitle}
            </Text>
            <Text
              style={[
                styles.title,
                styles.titleLayer,
                {
                  color: withAlpha(foil[0], 0.64),
                  fontSize: composedFontSize,
                  lineHeight: composedFontSize * 1.12,
                  transform: [{ translateY: 0.75 }],
                },
              ]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              allowFontScaling={false}
            >
              {displayTitle}
            </Text>
          </>
        ) : null}
        {!isBookplate ? (
          <Text
            style={[
              styles.title,
              compositionStyle,
              { color: withAlpha(foil[1], 0.94), fontSize: composedFontSize, lineHeight: composedFontSize * 1.12 },
            ]}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={isEditorial ? 0.72 : 0.6}
            allowFontScaling={false}
          >
            {displayTitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleStack: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  leftTitleStack: {
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: Fonts.display.semibold,
    textAlign: 'center',
    letterSpacing: Typography.metrics.letterSpacing05,
    alignSelf: 'stretch',
  },
  titleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  editorialTitle: {
    textAlign: 'left',
    paddingLeft: 4,
    paddingRight: 12,
  },
  modernTitle: {
    fontFamily: Fonts.ui.semibold,
    textAlign: 'left',
    letterSpacing: Typography.metrics.letterSpacing10,
    paddingLeft: 5,
    paddingRight: 14,
  },
  editorialRule: {
    width: '42%',
    height: 2,
    marginLeft: 4,
    marginBottom: 12,
  },
  bookplateTitle: {
    paddingHorizontal: 18,
  },
  bookplateFrame: {
    alignSelf: 'stretch',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderRadius: 2,
  },
});
