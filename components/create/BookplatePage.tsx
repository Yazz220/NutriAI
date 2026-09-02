import { Radii, Typography , Spacing} from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/utils/fonts';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { withAlpha } from '@/utils/cookbook/coverArt';

/**
 * The left page of the open inspector spread: the bookplate. "From the
 * kitchen of ___" stamped inside a double foil rule, updating live as the
 * future owner types their cookbook's name.
 */

interface BookplatePageProps {
  title: string;
  binding: CookbookBinding;
  width: number;
  height: number;
}

export const BookplatePage = React.memo(function BookplatePage({
  title,
  binding,
  width,
  height,
}: BookplatePageProps) {
  const foil = binding.foil[1];
  const ink = Colors.book.ink;
  const titleSize = Math.max(15, Math.round(width * 0.105));
  const eyebrowSize = Math.max(7, Math.round(width * 0.042));

  return (
    <View style={[styles.page, { width, height }]}>
      <View style={[styles.frameOuter, { borderColor: withAlpha(foil, 0.55) }]}>
        <View style={[styles.frameInner, { borderColor: withAlpha(foil, 0.35) }]}>
          {/* Bookplate ornament */}
          <View style={styles.ornamentRow}>
            <View style={[styles.ornamentRule, { backgroundColor: withAlpha(foil, 0.6) }]} />
            <View style={[styles.ornamentDiamond, { borderColor: withAlpha(foil, 0.8) }]} />
            <View style={[styles.ornamentRule, { backgroundColor: withAlpha(foil, 0.6) }]} />
          </View>

          <Text style={[styles.eyebrow, { color: Colors.book.caption, fontSize: eyebrowSize }]}>
            FROM THE KITCHEN OF
          </Text>

          <Text
            style={[styles.title, { color: title.trim() ? ink : Colors.textMuted, fontSize: titleSize }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {title.trim() || 'Your cookbook'}
          </Text>

          <View style={[styles.titleRule, { backgroundColor: withAlpha(foil, 0.7) }]} />

          <Text style={[styles.foot, { color: Colors.book.caption, fontSize: eyebrowSize }]}>FOLIO BINDERY</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: Colors.book.page,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    padding: Spacing.values[10],
  },
  frameOuter: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.numeric[4],
    padding: Spacing.values[4],
  },
  frameInner: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.numeric[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[10],
    paddingHorizontal: Spacing.values[8],
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[8],
  },
  ornamentRule: {
    width: 26,
    height: 1,
  },
  ornamentDiamond: {
    width: 7,
    height: 7,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  eyebrow: {
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing20,
    textAlign: 'center',
  },
  title: {
    fontFamily: Fonts.display.semibold,
    textAlign: 'center',
    letterSpacing: Typography.metrics.letterSpacing03,
  },
  titleRule: {
    width: 40,
    height: 1,
  },
  foot: {
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing24,
    textAlign: 'center',
    marginTop: Spacing.values[4],
  },
});
