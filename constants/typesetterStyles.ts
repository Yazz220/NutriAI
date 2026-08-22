/**
 * Typesetter style configuration.
 *
 * Maps each of the 12 CookbookStyleId presets to the parameters the
 * TypesetterPage component needs to render a cookbook page:
 *   - Colors (paper, ink, accent, muted) — from the style preset's palette
 *   - Layout (margins, art zone ratio, border)
 *   - Typography (font families, sizes)
 *   - Decorative elements (accent rule opacity, border, ornament)
 *
 * The style preset controls the VISUAL appearance.
 * The recipe template (see typesetterLayouts.ts) controls the SPATIAL arrangement.
 * They compose: any template can be used with any style.
 */

import { Colors } from '@/constants/colors';
import { Fonts } from '@/utils/fonts';
import type { CookbookStyleId } from '@/types/cookbook';

export interface TypesetterStyleConfig {
  /** Page background color (from palette.paper). */
  paperColor: string;
  /** Primary text color (from palette.ink). */
  inkColor: string;
  /** Accent color for rules, section labels, meta (from palette.accent). */
  accentColor: string;
  /** Muted text color for captions, notes, page numbers. */
  mutedColor: string;

  /** Page margin as a fraction of page width (0.06–0.10). */
  marginRatio: number;
  /** Art zone height as a fraction of page height (0.32–0.42). */
  artHeightRatio: number;
  /** Whether to draw a decorative border around the page. */
  showBorder: boolean;
  /** Border inset from page edge as a fraction of page width. */
  borderInsetRatio: number;

  /** Title font family (serif for editorial styles, sans for minimal). */
  titleFontFamily: string;
  /** Body text font family. */
  bodyFontFamily: string;
  /** Section label font family. */
  labelFontFamily: string;

  /** Title font size (relative to a 430px-wide page). */
  titleSize: number;
  /** Body text font size. */
  bodySize: number;
  /** Meta row font size. */
  metaSize: number;
  /** Section label font size. */
  labelSize: number;

  /** Accent rule opacity (0.3–0.7). */
  accentRuleOpacity: number;
  /** Whether to draw a small ornament near the art. */
  showArtOrnament: boolean;
}

const SERIF = Fonts.display.bold;
const SANS = Fonts.ui.bold;
const SANS_REGULAR = Fonts.ui.regular;
const SANS_MEDIUM = Fonts.ui.medium;

const INK = Colors.inkBlack;
const MUTED = Colors.fadedStone;

export const TYPESETTER_STYLE_CONFIGS: Record<CookbookStyleId, TypesetterStyleConfig> = {
  'vintage-garden': {
    paperColor: Colors.book.page,
    inkColor: INK,
    accentColor: Colors.book.accent,
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.38,
    showBorder: true,
    borderInsetRatio: 0.04,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.6,
    showArtOrnament: true,
  },
  handwritten: {
    paperColor: Colors.white,
    inkColor: INK,
    accentColor: Colors.butterscotch,
    mutedColor: MUTED,
    marginRatio: 0.09,
    artHeightRatio: 0.40,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 25,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.5,
    showArtOrnament: true,
  },
  editorial: {
    paperColor: Colors.alabaster,
    inkColor: INK,
    accentColor: Colors.duskGrey,
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.35,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 27,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.7,
    showArtOrnament: false,
  },
  watercolor: {
    paperColor: Colors.white,
    inkColor: INK,
    accentColor: Colors.butterscotch,
    mutedColor: MUTED,
    marginRatio: 0.09,
    artHeightRatio: 0.42,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 25,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.4,
    showArtOrnament: true,
  },
  rustic: {
    paperColor: Colors.alabaster,
    inkColor: INK,
    accentColor: Colors.duskGrey,
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.36,
    showBorder: true,
    borderInsetRatio: 0.03,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 25,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.5,
    showArtOrnament: false,
  },
  minimal: {
    paperColor: Colors.white,
    inkColor: INK,
    accentColor: Colors.skyMist,
    mutedColor: MUTED,
    marginRatio: 0.10,
    artHeightRatio: 0.32,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SANS,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 24,
    bodySize: 13,
    metaSize: 10,
    labelSize: 10,
    accentRuleOpacity: 0.3,
    showArtOrnament: false,
  },
  'sage-linen': {
    paperColor: Colors.book.page,
    inkColor: INK,
    accentColor: '#d4af37',
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.38,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.6,
    showArtOrnament: true,
  },
  'terracotta-cloth': {
    paperColor: Colors.book.page,
    inkColor: INK,
    accentColor: '#b87348',
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.36,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.7,
    showArtOrnament: false,
  },
  'navy-leather': {
    paperColor: Colors.book.pageAlt,
    inkColor: INK,
    accentColor: '#b9bfc7',
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.34,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.6,
    showArtOrnament: false,
  },
  'charcoal-cloth': {
    paperColor: Colors.book.page,
    inkColor: INK,
    accentColor: '#d4af37',
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.32,
    showBorder: true,
    borderInsetRatio: 0.04,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.7,
    showArtOrnament: false,
  },
  'alabaster-linen': {
    paperColor: Colors.book.pageAlt,
    inkColor: INK,
    accentColor: '#b87348',
    mutedColor: MUTED,
    marginRatio: 0.09,
    artHeightRatio: 0.38,
    showBorder: false,
    borderInsetRatio: 0,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.5,
    showArtOrnament: true,
  },
  'umber-leather': {
    paperColor: Colors.book.pageWarm,
    inkColor: INK,
    accentColor: '#d4af37',
    mutedColor: MUTED,
    marginRatio: 0.08,
    artHeightRatio: 0.36,
    showBorder: true,
    borderInsetRatio: 0.04,
    titleFontFamily: SERIF,
    bodyFontFamily: SANS_REGULAR,
    labelFontFamily: SANS_MEDIUM,
    titleSize: 26,
    bodySize: 13,
    metaSize: 10,
    labelSize: 11,
    accentRuleOpacity: 0.6,
    showArtOrnament: false,
  },
};

const DEFAULT_STYLE: CookbookStyleId = 'vintage-garden';

export function getTypesetterStyleConfig(styleId?: CookbookStyleId | string | null): TypesetterStyleConfig {
  if (styleId && (styleId as CookbookStyleId) in TYPESETTER_STYLE_CONFIGS) {
    return TYPESETTER_STYLE_CONFIGS[styleId as CookbookStyleId];
  }
  return TYPESETTER_STYLE_CONFIGS[DEFAULT_STYLE];
}
