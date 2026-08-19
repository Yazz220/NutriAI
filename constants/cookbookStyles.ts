import { Colors } from '@/constants/colors';
import type { CookbookBindingId } from '@/constants/cookbookBindings';
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
  /**
   * Physical binding archetype rendered by `PhysicalBook` on the 3D shelf
   * and in the creation studio. Legacy presets leave this undefined and
   * keep their flat `BookCover` artwork.
   */
  binding?: CookbookBindingId;
  /** Signature line stamped on the inspector spread's right page. */
  quote?: string;
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
    quote: 'The garden writes the menu.',
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
  'sage-linen': {
    id: 'sage-linen',
    name: 'Sage Linen',
    tagline: 'Sage green linen with gold foil stamping',
    palette: {
      paper: Colors.book.page,
      ink: Colors.inkBlack,
      accent: '#d4af37',
      spine: '#7d8471',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'herb garden cookbook page, black ink botanical line illustration, subtle sage green and gold accents, alabaster background, refined country kitchen editorial layout',
    theme: {
      name: 'Sage Linen',
      prompt:
        'herb garden cookbook page with black ink botanical line illustration, sage green and gold accents, alabaster background',
    },
    binding: 'sage-linen',
    quote: 'Every meal begins with a leaf.',
  },
  'terracotta-cloth': {
    id: 'terracotta-cloth',
    name: 'Terracotta Cloth',
    tagline: 'Warm terracotta cloth with copper foil',
    palette: {
      paper: Colors.book.page,
      ink: Colors.inkBlack,
      accent: '#b87348',
      spine: Colors.peach,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'sun-warmed mediterranean cookbook page, black ink food illustration, subtle terracotta and copper accents, alabaster background, generous editorial spacing',
    theme: {
      name: 'Terracotta Cloth',
      prompt:
        'sun-warmed mediterranean cookbook page with black ink food illustration, terracotta and copper accents, alabaster background',
    },
    binding: 'terracotta-cloth',
    quote: 'Sun on the wall, bread on the table.',
  },
  'navy-leather': {
    id: 'navy-leather',
    name: 'Navy Leather',
    tagline: 'Midnight navy leather with silver foil',
    palette: {
      paper: Colors.book.pageAlt,
      ink: Colors.inkBlack,
      accent: '#b9bfc7',
      spine: '#2f3b52',
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'midnight bistro cookbook page, black ink line illustration, subtle navy and silver accents, clean alabaster background, refined brasserie editorial layout',
    theme: {
      name: 'Navy Leather',
      prompt:
        'midnight bistro cookbook page with black ink line illustration, navy and silver accents, clean alabaster background',
    },
    binding: 'navy-leather',
    quote: 'The night kitchen keeps its own hours.',
  },
  'charcoal-cloth': {
    id: 'charcoal-cloth',
    name: 'Charcoal Cloth',
    tagline: 'Charcoal cloth with gold foil',
    palette: {
      paper: Colors.book.page,
      ink: Colors.inkBlack,
      accent: '#d4af37',
      spine: Colors.charcoal,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'modern bistro cookbook page, black ink illustration, single restrained gold accent rule, alabaster background, confident minimal editorial layout',
    theme: {
      name: 'Charcoal Cloth',
      prompt:
        'modern bistro cookbook page with black ink illustration, restrained gold accent rule, alabaster background, minimal editorial layout',
    },
    binding: 'charcoal-cloth',
    quote: 'Restraint is a kind of generosity.',
  },
  'alabaster-linen': {
    id: 'alabaster-linen',
    name: 'Alabaster Linen',
    tagline: 'Pale alabaster linen with copper foil',
    palette: {
      paper: Colors.book.pageAlt,
      ink: Colors.inkBlack,
      accent: '#b87348',
      spine: Colors.alabaster,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'bright farmhouse cookbook page, black ink line illustration, soft copper accent details, alabaster background, airy editorial layout with generous margins',
    theme: {
      name: 'Alabaster Linen',
      prompt:
        'bright farmhouse cookbook page with black ink line illustration, soft copper accents, alabaster background, airy layout',
    },
    binding: 'alabaster-linen',
    quote: 'A clean page, a slow morning.',
  },
  'umber-leather': {
    id: 'umber-leather',
    name: 'Umber Leather',
    tagline: 'Dark umber leather with gold foil',
    palette: {
      paper: Colors.book.pageWarm,
      ink: Colors.inkBlack,
      accent: '#d4af37',
      spine: Colors.warmUmber,
      shelfBackground: calmShelf,
    },
    pagePromptDescriptor:
      'hearth kitchen cookbook page, black ink illustration, warm umber and gold accents, warm parchment background, heritage editorial layout',
    theme: {
      name: 'Umber Leather',
      prompt:
        'hearth kitchen cookbook page with black ink illustration, warm umber and gold accents, warm parchment background',
    },
    binding: 'umber-leather',
    quote: 'The hearth knows every recipe by heart.',
  },
};

export const COOKBOOK_STYLE_ORDER: CookbookStyleId[] = [
  'vintage-garden',
  'handwritten',
  'editorial',
  'watercolor',
  'rustic',
  'minimal',
  'sage-linen',
  'terracotta-cloth',
  'navy-leather',
  'charcoal-cloth',
  'alabaster-linen',
  'umber-leather',
];

export const COOKBOOK_CREATION_STYLE_ORDER: CookbookStyleId[] = [
  'sage-linen',
  'terracotta-cloth',
  'navy-leather',
  'charcoal-cloth',
  'alabaster-linen',
  'umber-leather',
  'handwritten',
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

export function listCookbookCreationStyles(): CookbookStylePreset[] {
  return COOKBOOK_CREATION_STYLE_ORDER.map((id) => COOKBOOK_STYLE_PRESETS[id]);
}
