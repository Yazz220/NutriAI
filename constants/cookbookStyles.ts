import { Colors } from '@/constants/colors';
import type { CookbookStyleId, CookbookTheme } from '@/types/cookbook';

export interface CookbookStylePalette {
  paper: string;
  ink: string;
  accent: string;
  spine: string;
  shelfBackground: readonly [string, string, string];
}

export interface CookbookStylePreset {
  id: CookbookStyleId;
  name: string;
  tagline: string;
  palette: CookbookStylePalette;
  pagePromptDescriptor: string;
  theme: CookbookTheme;
}

const calmShelf = Colors.book.shelfGradient;

export const COOKBOOK_STYLE_PRESETS: Record<CookbookStyleId, CookbookStylePreset> = {
  'vintage-garden': {
    id: 'vintage-garden',
    name: 'Classic Kitchen',
    tagline: 'A warm cookbook cover with timeless kitchen character',
    palette: {
      paper: Colors.book.page,
      ink: Colors.inkBlack,
      accent: Colors.book.accent,
      spine: Colors.duskGrey,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'warm minimal cookbook page, alabaster paper background, black ink line drawing, subtle vintage border, generous white space, Matter-style heading',
    theme: {
      name: 'Classic Kitchen',
      prompt:
        'alabaster cookbook page with black ink line illustration, subtle vintage border, warm minimal editorial style',
    },
  },
  handwritten: {
    id: 'handwritten',
    name: 'Garden Table',
    tagline: 'Botanical linework with soft margins',
    palette: {
      paper: Colors.white,
      ink: Colors.inkBlack,
      accent: Colors.butterscotch,
      spine: Colors.ash,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'garden table cookbook page, black ink botanical line art, alabaster surface, airy layout, calm handmade cookbook feel',
    theme: {
      name: 'Garden Table',
      prompt: 'alabaster cookbook page with botanical black ink line art, airy layout, calm handmade cookbook style',
    },
  },
  editorial: {
    id: 'editorial',
    name: 'Sunday Suppers',
    tagline: 'Classic family pages with soft ornament',
    palette: {
      paper: Colors.alabaster,
      ink: Colors.inkBlack,
      accent: Colors.duskGrey,
      spine: Colors.ash,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'classic family cookbook page, black ink food illustration, subtle decorative rule, alabaster background, spacious editorial layout',
    theme: {
      name: 'Sunday Suppers',
      prompt:
        'classic family cookbook page with black ink food illustration, subtle ornaments, warm alabaster background',
    },
  },
  watercolor: {
    id: 'watercolor',
    name: 'Family Favorites',
    tagline: 'A beloved book with simple ink marks',
    palette: {
      paper: Colors.white,
      ink: Colors.inkBlack,
      accent: Colors.butterscotch,
      spine: Colors.slate,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'beloved family cookbook page, black ink line art, soft blush detail, simple centered composition, calm paper texture',
    theme: {
      name: 'Family Favorites',
      prompt: 'beloved family cookbook page with black ink line art, soft blush accent, calm paper texture',
    },
  },
  rustic: {
    id: 'rustic',
    name: 'Notes & Recipes',
    tagline: 'Notebook binding and small kitchen notes',
    palette: {
      paper: Colors.alabaster,
      ink: Colors.inkBlack,
      accent: Colors.duskGrey,
      spine: Colors.charcoal,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'minimal notes and recipes journal page, black ink line illustration, notebook-inspired margin, alabaster background, handwritten warmth',
    theme: {
      name: 'Notes & Recipes',
      prompt:
        'minimal notes and recipes journal page with black ink line illustration, notebook-inspired margin, alabaster background',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Modern Journal',
    tagline: 'A clean cover for a simple contemporary collection',
    palette: {
      paper: Colors.white,
      ink: Colors.inkBlack,
      accent: Colors.skyMist,
      spine: Colors.ash,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'clean citrus cookbook journal page, black ink citrus illustration, alabaster background, refined minimal cookbook layout',
    theme: {
      name: 'Modern Journal',
      prompt:
        'clean citrus cookbook journal page with black ink citrus illustration, refined minimal layout, alabaster background',
    },
  },
};

export const COOKBOOK_STYLE_ORDER: CookbookStyleId[] = [
  'vintage-garden',
  'handwritten',
  'editorial',
  'watercolor',
  'rustic',
  'minimal',
];

export const COOKBOOK_CREATION_STYLE_ORDER: CookbookStyleId[] = ['handwritten'];

export const DEFAULT_COOKBOOK_STYLE: CookbookStyleId = 'vintage-garden';

export function getCookbookStyle(id?: CookbookStyleId | string | null): CookbookStylePreset {
  if (id && (id as CookbookStyleId) in COOKBOOK_STYLE_PRESETS) {
    return COOKBOOK_STYLE_PRESETS[id as CookbookStyleId];
  }
  return COOKBOOK_STYLE_PRESETS[DEFAULT_COOKBOOK_STYLE];
}

export function listCookbookStyles(): CookbookStylePreset[] {
  return COOKBOOK_STYLE_ORDER.map((id) => COOKBOOK_STYLE_PRESETS[id]);
}

export function listCookbookCreationStyles(): CookbookStylePreset[] {
  return COOKBOOK_CREATION_STYLE_ORDER.map((id) => COOKBOOK_STYLE_PRESETS[id]);
}
