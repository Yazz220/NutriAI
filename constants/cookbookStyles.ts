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
    name: 'Vintage Kitchen',
    tagline: 'Ink borders and a quiet kitchen sketch',
    palette: {
      paper: Colors.book.page,
      ink: Colors.inkBlack,
      accent: Colors.book.accent,
      spine: '#B8AD9E',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'warm minimal cookbook page, paper cream background, black ink line drawing, subtle vintage border, generous white space, Playfair-style serif heading',
    theme: {
      name: 'Vintage Kitchen',
      prompt:
        'paper cream cookbook page with black ink line illustration, subtle vintage border, warm minimal editorial style',
    },
  },
  handwritten: {
    id: 'handwritten',
    name: 'Garden Table',
    tagline: 'Botanical linework with soft margins',
    palette: {
      paper: '#FFFDF8',
      ink: Colors.inkBlack,
      accent: '#B8A884',
      spine: '#D7CCB9',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'garden table cookbook page, black ink botanical line art, paper cream surface, airy layout, calm handmade cookbook feel',
    theme: {
      name: 'Garden Table',
      prompt:
        'paper cream cookbook page with botanical black ink line art, airy layout, calm handmade cookbook style',
    },
  },
  editorial: {
    id: 'editorial',
    name: 'Sunday Suppers',
    tagline: 'Classic family pages with soft ornament',
    palette: {
      paper: '#FEF8F2',
      ink: Colors.inkBlack,
      accent: '#9A9488',
      spine: '#C9BFAE',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'classic family cookbook page, black ink food illustration, subtle decorative rule, paper cream background, spacious editorial layout',
    theme: {
      name: 'Sunday Suppers',
      prompt:
        'classic family cookbook page with black ink food illustration, subtle ornaments, warm paper cream background',
    },
  },
  watercolor: {
    id: 'watercolor',
    name: 'Family Favorites',
    tagline: 'A beloved book with simple ink marks',
    palette: {
      paper: '#FFFDF8',
      ink: Colors.inkBlack,
      accent: '#C7A46B',
      spine: '#8B8379',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'beloved family cookbook page, black ink line art, soft blush detail, simple centered composition, calm paper texture',
    theme: {
      name: 'Family Favorites',
      prompt:
        'beloved family cookbook page with black ink line art, soft blush accent, calm paper texture',
    },
  },
  rustic: {
    id: 'rustic',
    name: 'Notes & Recipes',
    tagline: 'Notebook binding and small kitchen notes',
    palette: {
      paper: '#FEF8F2',
      ink: Colors.inkBlack,
      accent: '#9A9488',
      spine: '#111111',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'minimal notes and recipes journal page, black ink line illustration, notebook-inspired margin, paper cream background, handwritten warmth',
    theme: {
      name: 'Notes & Recipes',
      prompt:
        'minimal notes and recipes journal page with black ink line illustration, notebook-inspired margin, paper cream background',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Citrus Journal',
    tagline: 'Clean cream pages with citrus line art',
    palette: {
      paper: '#FFFDF8',
      ink: Colors.inkBlack,
      accent: Colors.blush,
      spine: '#D9CBB6',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'clean citrus cookbook journal page, black ink citrus illustration, paper cream background, refined minimal cookbook layout',
    theme: {
      name: 'Citrus Journal',
      prompt:
        'clean citrus cookbook journal page with black ink citrus illustration, refined minimal layout, paper cream background',
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
