export const LEGACY_RECIPE_PAGE_STYLE_IDS = [
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
  'studio-editorial',
  'bold',
] as const;

export const ACTIVE_RECIPE_PAGE_STYLE_IDS = [
  'studio',
  'editorial',
  'illustrated',
  'heritage',
  'journal',
  'artisan',
] as const;

export type LegacyRecipePageStyleId = typeof LEGACY_RECIPE_PAGE_STYLE_IDS[number];
export type CreationPageStyleId = typeof ACTIVE_RECIPE_PAGE_STYLE_IDS[number];
export type RecipePageStyleId =
  | LegacyRecipePageStyleId
  | CreationPageStyleId;
export type RecipePageDensity = 'sparse' | 'standard' | 'dense';
export type RecipePageStyleStatus = 'active' | 'legacy';

export interface RecipePageStyleVersion {
  id: RecipePageStyleId;
  revision: number;
  status: RecipePageStyleStatus;
  name: string;
  description: string;
  studioOrder?: number;
  paper: string;
  typography: string;
  imagery: string;
  palette: string;
  graphicLanguage: string;
  signature: string;
  composition: Readonly<Record<RecipePageDensity, string>>;
  exclusions: readonly string[];
  styleReferences: readonly string[];
}

export const DEFAULT_RECIPE_PAGE_STYLE_ID: CreationPageStyleId = 'studio';

function versionKey(id: RecipePageStyleId, revision: number): string {
  return `${id}@${revision}`;
}

function repeatedComposition(value: string): Readonly<Record<RecipePageDensity, string>> {
  return { sparse: value, standard: value, dense: value };
}

function legacyStyle(
  id: LegacyRecipePageStyleId | 'illustrated' | 'heritage',
  name: string,
  values: Pick<RecipePageStyleVersion, 'paper' | 'typography' | 'imagery' | 'palette'> & {
    composition: string;
  },
): RecipePageStyleVersion {
  return {
    id,
    revision: 1,
    status: 'legacy',
    name,
    description: 'Legacy cookbook page identity',
    ...values,
    graphicLanguage: 'restrained traditional cookbook publishing',
    signature: values.imagery,
    composition: repeatedComposition(values.composition),
    exclusions: [],
    styleReferences: [],
  };
}

/**
 * Immutable visual contracts. Never edit a shipped id/revision in place;
 * publish a new revision and move only the active Studio pointer instead.
 */
export const RECIPE_PAGE_STYLE_VERSIONS: Readonly<Record<string, RecipePageStyleVersion>> = Object.freeze({
  'illustrated@1': legacyStyle('illustrated', 'Illustrated', {
    paper: 'warm alabaster paper with a subtle natural tooth and pristine finish',
    typography: 'elegant warm serif display titles with calm, highly legible editorial sans-serif recipe text',
    imagery: 'refined hand-drawn black ink food illustration with delicate translucent watercolor and natural ingredient detail',
    palette: 'warm alabaster, muted sage green, restrained ochre, food-led natural color, and black ink',
    composition: 'airy contemporary cookbook publishing with generous safe margins, a balanced ingredient-and-method grid, and one integrated food illustration',
  }),
  'studio-editorial@1': legacyStyle('studio-editorial', 'Editorial', {
    paper: 'clean warm-white paper with a smooth premium editorial finish',
    typography: 'confident high-contrast serif display titles with precise modern sans-serif recipe text and crisp uppercase labels',
    imagery: 'appetizing realistic overhead culinary photography with natural texture and restrained styling',
    palette: 'warm white, charcoal black, food-led natural color, and one restrained terracotta accent',
    composition: 'disciplined contemporary culinary-magazine grid with strong hierarchy, generous whitespace, and an integrated photographic hero',
  }),
  'heritage@1': legacyStyle('heritage', 'Heritage', {
    paper: 'pristine warm parchment with a subtle archival tooth and no stains or distressing',
    typography: 'dignified heritage serif display titles with traditional but highly readable cookbook body type',
    imagery: 'refined engraved copperplate-style food artwork with controlled cross-hatching and accurate dish detail',
    palette: 'warm parchment, deep umber ink, restrained antique gold rules, and muted food-led color',
    composition: 'refined archival cookbook publishing with balanced columns, quiet classical ornament, generous margins, and modern legibility',
  }),
  'vintage-garden@1': legacyStyle('vintage-garden', 'Vintage Garden', {
    paper: 'warm alabaster paper with a subtle natural tooth',
    typography: 'classic cookbook serif display type with restrained editorial body type',
    imagery: 'fine black ink line drawing with a restrained watercolor wash',
    palette: 'warm alabaster, faded olive, muted ochre, and black ink',
    composition: 'timeless kitchen publishing with a quiet vintage border and generous margins',
  }),
  'handwritten@1': legacyStyle('handwritten', 'Handwritten', {
    paper: 'clean alabaster paper with a soft handmade texture',
    typography: 'warm classic serif titles with calm, highly legible editorial body type',
    imagery: 'loose botanical black ink linework with soft watercolor accents',
    palette: 'alabaster, leaf green, warm butterscotch, and black ink',
    composition: 'airy garden-table publishing with botanical details and generous white space',
  }),
  'editorial@1': legacyStyle('editorial', 'Editorial', {
    paper: 'warm alabaster paper with subtle print texture',
    typography: 'confident classic serif titles with refined editorial body type',
    imagery: 'refined black ink food illustration with subtle tonal shading',
    palette: 'warm alabaster, charcoal, and soft stone gray',
    composition: 'classic family cookbook publishing with restrained ornament and clear columns',
  }),
  'watercolor@1': legacyStyle('watercolor', 'Watercolor', {
    paper: 'clean white paper with a gentle deckled-paper impression',
    typography: 'friendly serif titles with simple, readable cookbook body type',
    imagery: 'delicate black ink contour drawing with translucent watercolor washes',
    palette: 'clean white, soft blush, warm caramel, and black ink',
    composition: 'beloved family-recipe publishing with gentle imperfections and centered balance',
  }),
  'rustic@1': legacyStyle('rustic', 'Rustic', {
    paper: 'warm notebook-like alabaster paper',
    typography: 'heritage serif titles with compact, legible recipe typography',
    imagery: 'expressive black ink kitchen sketch with dry-brush texture',
    palette: 'warm alabaster, charcoal, and weathered gray',
    composition: 'kitchen journal publishing with a notebook margin and practical organization',
  }),
  'minimal@1': legacyStyle('minimal', 'Minimal', {
    paper: 'bright clean white paper',
    typography: 'precise contemporary titles with crisp modern recipe typography',
    imagery: 'precise contemporary line illustration with restrained flat color',
    palette: 'clean white, black, and pale sky blue',
    composition: 'minimal modern publishing with a strict grid and generous negative space',
  }),
  'sage-linen@1': legacyStyle('sage-linen', 'Sage Linen', {
    paper: 'alabaster paper with a faint natural fiber texture',
    typography: 'classic serif display titles with refined old-world cookbook body type',
    imagery: 'fine botanical black ink linework with delicate watercolor accents',
    palette: 'alabaster, muted sage green, restrained antique gold, and black ink',
    composition: 'refined garden cookbook publishing with botanical corner details and balanced columns',
  }),
  'terracotta-cloth@1': legacyStyle('terracotta-cloth', 'Terracotta Cloth', {
    paper: 'warm cream paper with a sun-aged natural texture',
    typography: 'warm Mediterranean serif titles with elegant, readable recipe typography',
    imagery: 'confident ink food illustration with sun-washed watercolor pigment',
    palette: 'warm cream, terracotta, copper, muted olive, and dark brown ink',
    composition: 'sun-warmed Mediterranean publishing with relaxed geometry and copper accents',
  }),
  'navy-leather@1': legacyStyle('navy-leather', 'Navy Leather', {
    paper: 'deep parchment paper with a refined matte texture',
    typography: 'refined brasserie display type with crisp, high-contrast recipe typography',
    imagery: 'controlled charcoal and ink food illustration with subtle tonal shading',
    palette: 'deep parchment, midnight navy, restrained silver gray, and charcoal',
    composition: 'late-night bistro publishing with structured columns and discreet silver rules',
  }),
  'charcoal-cloth@1': legacyStyle('charcoal-cloth', 'Charcoal Cloth', {
    paper: 'soft alabaster paper with a smooth editorial finish',
    typography: 'confident modern serif titles with disciplined recipe typography',
    imagery: 'bold economical black ink illustration with one restrained metallic accent',
    palette: 'alabaster, charcoal, antique gold, and black ink',
    composition: 'modern bistro publishing with strong hierarchy and minimal ornament',
  }),
  'alabaster-linen@1': legacyStyle('alabaster-linen', 'Alabaster Linen', {
    paper: 'pale alabaster paper with a light woven texture',
    typography: 'airy farmhouse serif titles with open, readable body type',
    imagery: 'airy black ink line illustration with a light watercolor wash',
    palette: 'pale alabaster, soft copper, muted wheat, and black ink',
    composition: 'bright farmhouse publishing with wide margins and delicate copper rules',
  }),
  'umber-leather@1': legacyStyle('umber-leather', 'Umber Leather', {
    paper: 'warm parchment paper with an archival tooth',
    typography: 'heritage serif display titles with traditional cookbook body type',
    imagery: 'heritage black ink illustration with warm engraved shading',
    palette: 'warm parchment, deep umber, restrained antique gold, and black ink',
    composition: 'hearth-kitchen publishing with archival framing and a grounded two-column layout',
  }),

  'studio@1': {
    id: 'studio',
    revision: 1,
    status: 'active',
    name: 'Studio',
    description: 'Clean, modern, and quietly precise',
    studioOrder: 0,
    paper: 'bright neutral-white uncoated paper with an almost invisible fine tooth',
    typography: 'restrained modern grotesk throughout, compact medium-weight title, tabular recipe metadata, and crisp sentence-case labels',
    imagery: 'natural daylight food photography with honest texture, neutral styling, and no decorative props',
    palette: 'paper white, near-black ink, cool gray, and one muted herb-green utility accent',
    graphicLanguage: 'Swiss-influenced modular publishing, hairline rules, measured spacing, and functional alignment',
    signature: 'a small precisely cropped food photograph locked into a rational modular grid',
    composition: {
      sparse: 'wide negative space; compact title and metadata at top; one small rectangular photograph; ingredients and method arranged in an open two-column grid',
      standard: 'disciplined asymmetric grid; photograph occupies roughly one third of the page; ingredients and method use aligned modular columns',
      dense: 'compact three-zone grid with a smaller photograph, narrow gutters, efficient line lengths, and no loss of hierarchy',
    },
    exclusions: ['display serif typography', 'ornamental borders', 'handwritten marks', 'dramatic shadows', 'warm vintage styling'],
    styleReferences: [],
  },
  'editorial@2': {
    id: 'editorial',
    revision: 2,
    status: 'active',
    name: 'Editorial',
    description: 'Dramatic food-magazine art direction',
    studioOrder: 1,
    paper: 'smooth warm-white premium magazine stock with rich photographic blacks',
    typography: 'oversized high-contrast display serif title paired with sharp neutral sans-serif recipe text and tiny uppercase folio-like labels',
    imagery: 'cinematic close-cropped food photography with directional side light, deep shadow, tactile detail, and deliberate prop styling',
    palette: 'warm white, ink black, saturated food color, and one confident oxblood-red accent',
    graphicLanguage: 'fashion-editorial scale shifts, assertive cropping, asymmetric tension, and image-led pacing',
    signature: 'a dramatic photograph breaks or anchors the grid while an oversized title creates magazine-cover energy',
    composition: {
      sparse: 'image-dominant page with a bold crop covering nearly half the canvas; title overlaps or closely keys to the image edge; concise recipe copy below',
      standard: 'strong asymmetric split with a large cinematic image, oversized title, and a narrow structured recipe column',
      dense: 'full-width cinematic image band above a tightly art-directed multi-column recipe section with clear editorial hierarchy',
    },
    exclusions: ['watercolor', 'line drawing', 'centered symmetrical layout', 'small timid title', 'scrapbook decoration'],
    styleReferences: [],
  },
  'illustrated@2': {
    id: 'illustrated',
    revision: 2,
    status: 'active',
    name: 'Illustrated',
    description: 'Expressive artwork, never photography',
    studioOrder: 2,
    paper: 'soft ivory artist paper with a visible but pristine watercolor tooth',
    typography: 'warm literary serif title with restrained humanist sans-serif recipe text and hand-lettered micro labels used sparingly',
    imagery: 'genuine hand-painted gouache and transparent watercolor food illustration with loose ink contours, visible brushwork, and simplified shapes; absolutely no photography',
    palette: 'ivory, botanical green, apricot, cobalt details, and food-led watercolor pigment',
    graphicLanguage: 'illustration-led storytelling, floating ingredient studies, irregular painted edges, and calm editorial spacing',
    signature: 'one generous painted dish portrait accompanied by two or three small ingredient vignettes',
    composition: {
      sparse: 'large central or offset painted dish with small floating ingredient studies; recipe copy sits in one calm column around the artwork',
      standard: 'painted dish anchors the upper half while ingredients and method form two airy lower columns with small illustrated cues',
      dense: 'narrow painted header scene plus compact two-column copy, using tiny ingredient vignettes only where space remains',
    },
    exclusions: ['photography', 'photorealism', '3D rendering', 'magazine-style hero photo', 'engraving', 'rigid corporate grid'],
    styleReferences: [],
  },
  'heritage@2': {
    id: 'heritage',
    revision: 2,
    status: 'active',
    name: 'Heritage',
    description: 'Heirloom print with modern legibility',
    studioOrder: 3,
    paper: 'clean warm parchment with a fine laid-paper texture, pristine edges, and no artificial aging',
    typography: 'formal old-style serif title, small-cap section headings, readable book serif body, and carefully spaced classic numerals',
    imagery: 'single-color wood engraving or copperplate food illustration with controlled cross-hatching and historically informed linework',
    palette: 'parchment, deep umber ink, muted burgundy, and very restrained antique-gold rules',
    graphicLanguage: 'formal symmetry, printer ornaments, fine keylines, small caps, and measured heirloom-book proportions',
    signature: 'a centered engraved dish vignette framed by a restrained rule and small printer ornament',
    composition: {
      sparse: 'formal centered title and engraving above a balanced recipe block with wide margins and restrained rules',
      standard: 'symmetrical two-column recipe beneath a centered engraved vignette, with small caps and quiet printer ornaments',
      dense: 'compact bookish two-column composition with a small engraving, clear running hierarchy, and economical classical spacing',
    },
    exclusions: ['fake stains', 'torn paper', 'illegible antique script', 'photography', 'watercolor wash', 'rustic scrapbook clutter'],
    styleReferences: [],
  },
  'journal@1': {
    id: 'journal',
    revision: 1,
    status: 'active',
    name: 'Journal',
    description: 'Personal kitchen-notebook character',
    studioOrder: 4,
    paper: 'warm cream notebook paper with a faint practical dot grid or ruled baseline and a clean red margin line',
    typography: 'confident handwritten display title and brief annotations paired with highly legible typed recipe body text',
    imagery: 'small instant-film food photograph or taped paper crop with honest home-kitchen light, plus quick pen sketches',
    palette: 'cream paper, graphite, fountain-pen blue, tomato red, and one faded photograph palette',
    graphicLanguage: 'working kitchen notebook, underlines, circled timings, restrained tape or clipped-photo cues, and useful handwritten callouts',
    signature: 'a small candid food snapshot with one practical handwritten note, circled time, or ingredient sketch',
    composition: {
      sparse: 'open notebook page with a small offset photo, handwritten title, typed recipe list, and one useful margin note',
      standard: 'photo and title occupy the upper third; ingredients and method follow the notebook grid with sparse handwritten annotations',
      dense: 'compact typed recipe blocks aligned to the notebook grid, a tiny photo, and only one or two handwritten emphasis marks',
    },
    exclusions: ['fully handwritten body copy', 'messy illegibility', 'dense scrapbook collage', 'fake food stains', 'luxury magazine photography'],
    styleReferences: [],
  },
  'bold@1': {
    id: 'bold',
    revision: 1,
    status: 'legacy',
    name: 'Bold',
    description: 'Graphic, energetic, and poster-led',
    paper: 'bright matte stock with visible controlled risograph ink texture',
    typography: 'oversized condensed sans-serif display title, sturdy grotesk recipe text, large numerals, and unapologetic graphic labels',
    imagery: 'high-contrast screenprint or risograph food image reduced to bold color separations and halftone texture; not realistic photography',
    palette: 'two or three saturated inks chosen for strong contrast, such as tomato red, electric cobalt, acid yellow, and deep black',
    graphicLanguage: 'contemporary food poster, geometric blocks, hard crops, halftone dots, punchy rules, and confident scale changes',
    signature: 'oversized type and a duotone food image interlock as one unmistakable poster composition',
    composition: {
      sparse: 'oversized title occupies a major graphic block; duotone dish image and concise recipe copy form two bold opposing zones',
      standard: 'poster-like asymmetric grid with interlocking title, halftone dish image, and high-contrast ingredient and method blocks',
      dense: 'strong header poster zone over compact high-contrast recipe columns; large numerals and color blocks maintain energy without reducing legibility',
    },
    exclusions: ['soft watercolor', 'heritage ornament', 'beige neutral palette', 'delicate serif title', 'realistic glossy photography', 'subtle timid hierarchy'],
    styleReferences: [],
  },
  'artisan@1': {
    id: 'artisan',
    revision: 1,
    status: 'active',
    name: 'Artisan',
    description: 'Warm, tactile, and farm-to-table',
    studioOrder: 5,
    paper: 'warm unbleached oat-linen paper with subtle organic flecks, soft deckled edges, and matte natural warmth',
    typography: 'warm humanist serif display titles with rustic hand-hewn elegance, paired with clean readable humanist sans-serif recipe text and gentle letterpressed numerals',
    imagery: 'tactile rustic culinary photography in soft diffused window light, styled on raw linen, warm weathered wood, and handmade stoneware ceramics with scattered raw ingredients',
    palette: 'warm oat, toasted wheat, deep terracotta, muted rosemary olive green, raw linen cream, and soft espresso charcoal ink',
    graphicLanguage: 'farm-to-table culinary editorial, subtle earthy rule lines, botanical accents, generous breathable whitespace, and tactile organic textures',
    signature: 'natural linen paper warmth and honest handmade stoneware photography anchored by warm humanist letterpressed typography',
    composition: {
      sparse: 'generous breathing room on warm oat paper; centered rustic dish presentation in stoneware ceramics with clean ingredient list and spacious method block',
      standard: 'harmonious two-column balance with warm serif title, rustic window-lit dish hero, neatly divided tactile ingredient column, and clearly stepped method flow',
      dense: 'compact yet warm editorial spread; organized dual-column ingredient and method layout anchored by subtle terracotta dividers and a focused overhead rustic dish capture',
    },
    exclusions: ['glossy synthetic stock', 'neon or electric saturated colors', 'sterile digital vectors', 'harsh flash photography', 'cold modern chrome or plastic', 'cluttered chaotic stickers'],
    styleReferences: [],
  },
});

export const ACTIVE_RECIPE_PAGE_STYLE_REVISIONS: Readonly<Record<CreationPageStyleId, number>> = Object.freeze({
  studio: 1,
  editorial: 2,
  illustrated: 2,
  heritage: 2,
  journal: 1,
  artisan: 1,
});

const RECIPE_PAGE_STYLE_IDS = new Set<string>([
  ...LEGACY_RECIPE_PAGE_STYLE_IDS,
  ...ACTIVE_RECIPE_PAGE_STYLE_IDS,
  'illustrated',
  'heritage',
]);

export function isRecipePageStyleId(value: unknown): value is RecipePageStyleId {
  return typeof value === 'string' && RECIPE_PAGE_STYLE_IDS.has(value);
}

export function isCreationPageStyleId(value: unknown): value is CreationPageStyleId {
  return typeof value === 'string'
    && (ACTIVE_RECIPE_PAGE_STYLE_IDS as readonly string[]).includes(value);
}

export function resolveRecipePageStyleVersion(
  styleId: RecipePageStyleId,
  revision: number,
): RecipePageStyleVersion | undefined {
  return RECIPE_PAGE_STYLE_VERSIONS[versionKey(styleId, revision)];
}

export function isRecipePageStyleVersion(styleId: unknown, revision: unknown): boolean {
  return isRecipePageStyleId(styleId)
    && Number.isInteger(revision)
    && Boolean(resolveRecipePageStyleVersion(styleId, Number(revision)));
}

export function resolveActiveRecipePageStyle(
  styleId: CreationPageStyleId,
): RecipePageStyleVersion {
  const style = resolveRecipePageStyleVersion(styleId, ACTIVE_RECIPE_PAGE_STYLE_REVISIONS[styleId]);
  if (!style) throw new Error(`Missing active recipe page style ${styleId}`);
  return style;
}

export function resolveLatestRecipePageStyle(styleId: RecipePageStyleId): RecipePageStyleVersion {
  if (isCreationPageStyleId(styleId)) return resolveActiveRecipePageStyle(styleId);

  const matches = Object.values(RECIPE_PAGE_STYLE_VERSIONS)
    .filter((style) => style.id === styleId)
    .sort((left, right) => right.revision - left.revision);
  if (!matches[0]) throw new Error(`Missing recipe page style ${styleId}`);
  return matches[0];
}

export function listActiveRecipePageStyles(): RecipePageStyleVersion[] {
  return ACTIVE_RECIPE_PAGE_STYLE_IDS
    .map(resolveActiveRecipePageStyle)
    .sort((left, right) => (left.studioOrder ?? 0) - (right.studioOrder ?? 0));
}

export function compileRecipePageStyleDescriptor(
  style: RecipePageStyleVersion,
  density: RecipePageDensity,
): string {
  return [
    `Paper: ${style.paper}`,
    `Typography: ${style.typography}`,
    `Image medium: ${style.imagery}`,
    `Palette: ${style.palette}`,
    `Graphic language: ${style.graphicLanguage}`,
    `Signature cue: ${style.signature}`,
    `Composition for ${density} recipe density: ${style.composition[density]}`,
    style.exclusions.length > 0 ? `Explicitly avoid: ${style.exclusions.join(', ')}` : '',
  ].filter(Boolean).join('; ');
}
