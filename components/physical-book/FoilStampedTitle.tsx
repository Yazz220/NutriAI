import { Typography } from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Fonts } from '@/utils/fonts';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { resolveCoverTitleCenterRatio } from '@/constants/cookbookCoverTypography';
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
  const titleBlockHeight = width * 0.72;

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
      <View style={styles.titleStack}>
        <Text
          style={[
            styles.title,
            styles.titleLayer,
            {
              color: withAlpha(foil[2], 0.5),
              fontSize: titleFontSize,
              lineHeight: titleFontSize * 1.12,
              transform: [{ translateY: -0.55 }],
            },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.title,
            styles.titleLayer,
            {
              color: withAlpha(foil[0], 0.64),
              fontSize: titleFontSize,
              lineHeight: titleFontSize * 1.12,
              transform: [{ translateY: 0.75 }],
            },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.title,
            { color: withAlpha(foil[1], 0.94), fontSize: titleFontSize, lineHeight: titleFontSize * 1.12 },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {title}
        </Text>
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
});
