import { Typography , Spacing} from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Fonts } from '@/utils/fonts';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { withAlpha } from '@/utils/cookbook/coverArt';

/**
 * Foil-stamped cover typography. RN Text (the app display serif) layered
 * three deep for a letterpress emboss: a highlight copy riding 0.75px up,
 * a shadow copy 1px down, and the foil-base copy on top. Reads as stamped
 * metal under the shelf's top-down light and updates live while the user
 * types in the creation studio.
 */

interface FoilStampedTitleProps {
  title: string;
  foil: CookbookBinding['foil'];
  width: number;
  spineWidth: number;
}

export const FoilStampedTitle = React.memo(function FoilStampedTitle({
  title,
  foil,
  width,
  spineWidth,
}: FoilStampedTitleProps) {
  const titleFontSize = Math.max(14, Math.min(26, Math.round(width * 0.105)));
  const captionSize = Math.max(7, Math.round(width * 0.042));

  return (
    <View style={[styles.wrap, { left: spineWidth + 14 }]} pointerEvents="none">
      <View style={styles.titleStack}>
        <Text
          style={[
            styles.title,
            styles.titleLayer,
            { color: foil[2], fontSize: titleFontSize, lineHeight: titleFontSize * 1.12, transform: [{ translateY: -0.75 }] },
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
            { color: foil[0], fontSize: titleFontSize, lineHeight: titleFontSize * 1.12, transform: [{ translateY: 1 }] },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {title}
        </Text>
        <Text
          style={[styles.title, { color: foil[1], fontSize: titleFontSize, lineHeight: titleFontSize * 1.12 }]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {title}
        </Text>
      </View>

      <View style={[styles.rule, { backgroundColor: withAlpha(foil[1], 0.75) }]} />
      <Text
        style={[styles.caption, { color: withAlpha(foil[1], 0.85), fontSize: captionSize }]}
        allowFontScaling={false}
      >
        COOKBOOK
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    right: 10,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[10],
    paddingTop: Spacing.values[26], // clears the emblem zone drawn by the Skia cover
  },
  titleStack: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: Fonts.display.bold,
    textAlign: 'center',
    letterSpacing: Typography.metrics.letterSpacing05,
    alignSelf: 'stretch',
  },
  titleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  rule: {
    width: 44,
    height: 1,
  },
  caption: {
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing30,
    textAlign: 'center',
  },
});
