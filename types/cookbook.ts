import type { ImageSourcePropType } from 'react-native';
import type { RecipeGraph, RecipeCategory } from '@/types/recipeGraph';

export type CookbookSection =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'healthy'
  | 'desserts'
  | 'sides'
  | 'favorites';

export type RecipeSourceType = 'url' | 'text' | 'image' | 'video';

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
  coverStyle: CookbookStyleId;
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
  /**
   * New-pipeline fields (optional — present when the page was created
   * via the new typesetter pipeline). When present, PageCanvas renders
   * via TypesetterPage instead of the legacy full-page PNG Image.
   */
  recipeGraph?: RecipeGraph;
  artAsset?: PageArtAsset;
  styleId?: CookbookStyleId;
  templateId?: RecipeTemplateId;
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

export interface CreditBalance {
  balance: number;
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

// ---------------------------------------------------------------------------
// NEW PIPELINE TYPES — decoupled art + text architecture
//
// These types define the new pipeline where:
//   - The recipe is stored as a RecipeGraph (live, editable, selectable text)
//   - The art is a separate generated illustration asset (no text in the image)
//   - The page is rendered live by the typesetter from: graph + style + art
//
// The legacy types above (StructuredRecipe, CookbookPage with imageUrl,
// PageVersion, CookbookPagePromptPayload) remain until Phase 6 cleanup.
// ---------------------------------------------------------------------------

/** Status of the art generation process for a page. */
export type PageArtStatus = 'pending' | 'generating' | 'ready' | 'failed';

/**
 * The generated art asset for a cookbook page.
 * This is an isolated illustration — no text, no layout, no recipe data.
 * The typesetter layers this behind/around the live vector text.
 */
export interface PageArtAsset {
  id: string;
  pageId: string;
  /** URL of the generated illustration in Supabase Storage. */
  artUrl?: string;
  storagePath?: string;
  /** Which cookbook style preset conditioned the art. */
  styleId: CookbookStyleId;
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
 * Unlike the legacy CookbookPage (which stored a full-page PNG),
 * this page stores:
 *   - A reference to the RecipeGraph (the live, editable culinary data)
 *   - A PageArtAsset (the generated illustration, separate from text)
 *   - Layout metadata (density hints for the typesetter)
 *
 * The page is rendered live by the typesetter from these three inputs.
 * Editing the recipe re-flows text instantly with zero image re-generation.
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
  styleId: CookbookStyleId;
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
