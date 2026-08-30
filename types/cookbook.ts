import type { ImageSourcePropType } from 'react-native';
import type {
  RecipeGraph,
  RecipeCategory,
  RecipeSourceType as CanonicalRecipeSourceType,
} from '@/types/recipeGraph';

export type CookbookSection =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'healthy'
  | 'desserts'
  | 'sides'
  | 'favorites';

export type RecipeSourceType = CanonicalRecipeSourceType;

export type PageVersionStatus = 'pending' | 'generating' | 'ready' | 'failed';

export type CookbookStyleId =
  | 'vintage-garden'
  | 'handwritten'
  | 'editorial'
  | 'watercolor'
  | 'rustic'
  | 'minimal'
  | 'sage-linen'
  | 'terracotta-cloth'
  | 'navy-leather'
  | 'charcoal-cloth'
  | 'alabaster-linen'
  | 'umber-leather';

/** Surface finish applied to the one canonical Nosh cover construction. */
export type CookbookCoverFinishId = 'fine-cloth' | 'natural-linen';

/** Curated cover color, independent from the surface finish. */
export type CookbookCoverColorId =
  | 'sage'
  | 'clay'
  | 'midnight'
  | 'alabaster'
  | 'charcoal'
  | 'umber';

/**
 * The book-owned visual language used by complete-page generation.
 * Legacy cover-linked ids remain valid so existing cookbooks preserve their
 * visual identity while new books use the three Studio page languages.
 */
export type CookbookPageStyleId =
  | CookbookStyleId
  | 'illustrated'
  | 'studio-editorial'
  | 'heritage';

export type RecipeTemplateId =
  | 'clean-cream'
  | 'ink-sketch'
  | 'modern-editorial';

export interface CookbookTheme {
  name: string;
  prompt: string;
}

export interface CookbookSectionEntry {
  id: CookbookSection;
  label: string;
  order: number;
}

export interface Cookbook {
  id: string;
  userId: string;
  title: string;
  coverImageAsset?: ImageSourcePropType;
  theme: CookbookTheme;
  sectionOrder: CookbookSection[];
  /** Physical binding/skin shown on the shelf and closed book. */
  coverStyle: CookbookStyleId;
  /** Surface texture on the canonical cover construction. */
  coverFinishId: CookbookCoverFinishId;
  /** Curated color applied independently to the selected cover finish. */
  coverColorId: CookbookCoverColorId;
  /** Book-owned recipe-page visual language, independent of its cover. */
  pageStyleId: CookbookPageStyleId;
  /** Immutable page-style revision used by every generated page in this book. */
  styleRevision: number;
  /** Locked visual references for this identity revision. */
  pageStyleReferences?: string[];
  /** The first cookbook becomes the automatic destination for shared recipes. */
  isDefault: boolean;
  /** Book-level default page layout for new recipe pages. */
  pageTemplateId: RecipeTemplateId;
  sections: CookbookSectionEntry[];
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredIngredient {
  name: string;
  quantity?: string;
  unit?: string;
  isOptional?: boolean;
}

export interface StructuredRecipe {
  id: string;
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: StructuredIngredient[];
  steps: string[];
  sourceType: RecipeSourceType;
  sourceUrl?: string;
  tags: string[];
  category: CookbookSection;
  confidence?: number;
}

export interface CookbookPage {
  id: string;
  cookbookId: string;
  recipeId: string;
  title: string;
  section: CookbookSection;
  pageNumber: number;
  sortOrder: number;
  selectedVersionId?: string;
  imageAsset?: ImageSourcePropType;
  imageUrl?: string;
  recipe?: StructuredRecipe;
  /** Canonical recipe data used by Nosh for reasoning and future changes. */
  recipeGraph?: RecipeGraph;
  /** Complete generated recipe page displayed to the user. */
  pageImage?: GeneratedRecipePage;
  /** Compatibility field for pages created by the retired split-art pipeline. */
  artAsset?: PageArtAsset;
  styleId?: CookbookPageStyleId;
  templateId?: RecipeTemplateId;
  /** Processing pages remain hidden until their complete page image is ready. */
  lifecycleStatus?: 'processing' | 'approved';
  captureId?: string;
}

export interface CookbookPageSummary {
  id: string;
  title: string;
  section: CookbookSection;
  pageNumber: number;
  imageUrl?: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  imageUrl?: string;
  storagePath?: string;
  promptPayload: CookbookPagePromptPayload;
  model: string;
  status: PageVersionStatus;
  creditCost: number;
  errorMessage?: string;
  createdAt: string;
}

export interface ParsedRecipeDraft extends Omit<StructuredRecipe, 'id' | 'tags' | 'category'> {
  id?: string;
  tags?: string[];
  category?: CookbookSection;
}

export interface RecipeConfidenceResult {
  confidence: number;
  needsReview: boolean;
  reasons: string[];
}

export interface CookbookPagePromptPayload {
  layout: 'single-page-cookbook';
  theme: CookbookTheme;
  template?: {
    id: RecipeTemplateId;
    name: string;
    styleDescriptor: string;
    promptDescriptor: string;
  };
  recipe: {
    title: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    ingredients: string[];
    steps: string[];
  };
  instructions: string;
}

export interface TocSection {
  id: CookbookSection;
  label: string;
  pages: CookbookPageSummary[];
}

// Generated pages keep structured culinary data and the user-facing page image
// together. Nosh reasons from RecipeGraph. The reader displays the image.

/** Status of the art generation process for a page. */
export type PageArtStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface GeneratedRecipePage {
  id: string;
  pageId: string;
  imageUrl?: string;
  storagePath?: string;
  styleId: CookbookPageStyleId;
  styleRevision: number;
  generationPrompt: string;
  styleReferences?: string[];
  model: string;
  status: PageArtStatus;
  creditCost: number;
  errorMessage?: string;
  createdAt: string;
}

/**
 * Compatibility shape for artwork created before full-page generation.
 */
export interface PageArtAsset {
  id: string;
  pageId: string;
  /** URL of the generated illustration in Supabase Storage. */
  artUrl?: string;
  storagePath?: string;
  /** Which cookbook style preset conditioned the art. */
  styleId: CookbookPageStyleId;
  /** The art-generation prompt used (for debugging / re-generation). */
  artPrompt: string;
  /** Reference image URLs passed to the art model for style conditioning. */
  styleReferences?: string[];
  /** Model that generated the art, e.g., "qwen/qwen-image-3-pro". */
  model: string;
  status: PageArtStatus;
  creditCost: number;
  errorMessage?: string;
  createdAt: string;
}

/**
 * A cookbook page in the new pipeline.
 *
 * Retained while existing split-art pages are migrated to full-page images.
 */
export interface CookbookPageV2 {
  id: string;
  cookbookId: string;
  recipeId: string;
  /** The canonical recipe graph (structured culinary data). */
  recipeGraph: RecipeGraph;
  section: CookbookSection;
  pageNumber: number;
  sortOrder: number;
  /** The generated art asset for this page. */
  artAsset?: PageArtAsset;
  /** Layout density hint, computed from the recipe graph. */
  layoutDensity?: PageLayoutDensity;
  createdAt: string;
  updatedAt: string;
}

/**
 * Layout density classification for the typesetter.
 * The typesetter uses this to choose a layout that fits the content.
 */
export type PageLayoutDensity = 'sparse' | 'standard' | 'dense';

/** Summary of a page for the table of contents (new pipeline). */
export interface CookbookPageSummaryV2 {
  id: string;
  title: string;
  section: CookbookSection;
  pageNumber: number;
  /** Art thumbnail URL for the TOC, if art is ready. */
  artThumbnailUrl?: string;
}

/**
 * The art-generation prompt payload (new pipeline).
 * Unlike the legacy CookbookPagePromptPayload, this contains NO recipe text.
 * It only describes the visual art to generate, conditioned on the cookbook style.
 */
export interface PageArtPromptPayload {
  /** The cookbook style preset that conditions the art. */
  styleId: CookbookPageStyleId;
  /** Human-readable style descriptor from the preset. */
  styleDescriptor: string;
  /** Theme prompt from the preset. */
  themePrompt: string;
  /** The dish name — used only to guide what food to illustrate, not to render as text. */
  dishName: string;
  /** Cuisine hint for the illustration, e.g., "Italian", "Japanese". */
  cuisine?: string;
  /** Art instructions — what to draw, never includes recipe text. */
  artInstructions: string;
  /** Reference image URLs for style conditioning (from the cookbook style preset). */
  styleReferences?: string[];
}

/**
 * The typesetter input — everything the native renderer needs to lay out a page.
 * This is computed at render time from: RecipeGraph + CookbookStylePreset + PageArtAsset.
 */
export interface TypesetterInput {
  recipeGraph: RecipeGraph;
  styleId: CookbookStyleId;
  artAsset?: PageArtAsset;
  layoutDensity: PageLayoutDensity;
}

/**
 * Map a RecipeCategory (culinary classification) to a CookbookSection
 * (where in the book this recipe lives).
 */
export function categoryToSection(category: RecipeCategory): CookbookSection {
  // The values are currently identical, but this function makes the
  // conceptual boundary explicit and allows future divergence.
  return category as CookbookSection;
}

/**
 * Compute layout density from a recipe graph.
 * Used by the typesetter to choose a layout that fits the content.
 */
export function computeLayoutDensity(graph: RecipeGraph): PageLayoutDensity {
  const ingredientCount = graph.ingredientGroups.reduce(
    (sum, group) => sum + group.ingredients.length,
    0,
  );
  const stepCount = graph.stepGroups.reduce(
    (sum, group) => sum + group.steps.length,
    0,
  );

  if (ingredientCount <= 5 && stepCount <= 4) return 'sparse';
  if (ingredientCount <= 12 && stepCount <= 8) return 'standard';
  return 'dense';
}
