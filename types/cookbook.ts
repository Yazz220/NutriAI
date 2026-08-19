import type { ImageSourcePropType } from 'react-native';

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
