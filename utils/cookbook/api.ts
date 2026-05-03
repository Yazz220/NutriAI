import { supabase } from '@/lib/supabase';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import { COOKBOOK_SECTION_ORDER, normalizeSection } from '@/utils/cookbook/sections';
import type {
  Cookbook,
  CookbookPage,
  CookbookTheme,
  CreditBalance,
  ParsedRecipeDraft,
  RecipeSourceType,
  StructuredIngredient,
  StructuredRecipe,
} from '@/types/cookbook';

type JsonRecord = Record<string, unknown>;

interface CookbookRow {
  id: string;
  user_id: string;
  title: string;
  theme_name: string;
  theme_prompt: string;
  section_order?: unknown;
  created_at: string;
  updated_at: string;
}

interface RecipeRow {
  id: string;
  title: string;
  description?: string | null;
  servings?: number | null;
  prep_time?: number | null;
  cook_time?: number | null;
  ingredients?: unknown;
  steps?: unknown;
  source_type: string;
  source_url?: string | null;
  tags?: unknown;
  category?: string | null;
  confidence?: number | string | null;
}

interface PageVersionRow {
  id: string;
  page_id: string;
  image_url?: string | null;
}

interface CookbookPageRow {
  id: string;
  cookbook_id: string;
  recipe_id: string;
  page_number: number;
  section?: string | null;
  sort_order: number;
  selected_version_id?: string | null;
  recipes?: RecipeRow | null;
  page_versions?: PageVersionRow | PageVersionRow[] | null;
  selected_version?: PageVersionRow | null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asIngredients(value: unknown): StructuredIngredient[] {
  return Array.isArray(value) ? (value as StructuredIngredient[]) : [];
}

function normalizeSourceType(value: string): RecipeSourceType {
  return value === 'url' || value === 'text' || value === 'image' || value === 'video' ? value : 'text';
}

function normalizeSectionOrder(value: unknown): Cookbook['sectionOrder'] {
  const sections = asStringArray(value)
    .map((section) => normalizeSection(section))
    .filter((section, index, all) => all.indexOf(section) === index);

  return sections.length ? sections : COOKBOOK_SECTION_ORDER;
}

function getEmbeddedVersion(row: CookbookPageRow): PageVersionRow | undefined {
  if (row.selected_version) return row.selected_version;
  if (Array.isArray(row.page_versions)) return row.page_versions[0];
  return row.page_versions ?? undefined;
}

export function mapCookbook(row: CookbookRow): Cookbook {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    theme: { name: row.theme_name, prompt: row.theme_prompt },
    sectionOrder: normalizeSectionOrder(row.section_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecipe(row: RecipeRow): StructuredRecipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    servings: row.servings ?? undefined,
    prepTime: row.prep_time ?? undefined,
    cookTime: row.cook_time ?? undefined,
    ingredients: asIngredients(row.ingredients),
    steps: asStringArray(row.steps),
    sourceType: normalizeSourceType(row.source_type),
    sourceUrl: row.source_url ?? undefined,
    tags: asStringArray(row.tags),
    category: normalizeSection(row.category),
    confidence: Number(row.confidence ?? 0),
  };
}

export function mapPage(
  row: CookbookPageRow,
  selectedVersions: Record<string, PageVersionRow | undefined> = {},
): CookbookPage {
  const selectedVersion = selectedVersions[row.id] ?? getEmbeddedVersion(row);

  return {
    id: row.id,
    cookbookId: row.cookbook_id,
    recipeId: row.recipe_id,
    title: row.recipes?.title ?? 'Untitled Recipe',
    section: normalizeSection(row.section),
    pageNumber: row.page_number,
    sortOrder: row.sort_order,
    selectedVersionId: row.selected_version_id ?? undefined,
    imageUrl: selectedVersion?.image_url ?? undefined,
    recipe: row.recipes ? mapRecipe(row.recipes) : undefined,
  };
}

export async function getOrCreateCookbook(userId: string, theme: CookbookTheme): Promise<Cookbook> {
  const { data: existing, error: existingError } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return mapCookbook(existing as CookbookRow);

  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .insert({
      user_id: userId,
      title: 'My Cookbook',
      theme_name: theme.name,
      theme_prompt: theme.prompt,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapCookbook(data as CookbookRow);
}

export async function fetchCookbookPages(cookbookId: string): Promise<CookbookPage[]> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .select('*, recipes(*)')
    .eq('cookbook_id', cookbookId)
    .order('sort_order', { ascending: true })
    .order('page_number', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as CookbookPageRow[];
  const selectedVersionIds = rows
    .map((row) => row.selected_version_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  let selectedVersions: Record<string, PageVersionRow | undefined> = {};
  if (selectedVersionIds.length > 0) {
    const { data: versions, error: versionsError } = await supabase
      .schema('nutriai')
      .from('page_versions')
      .select('id, page_id, image_url')
      .in('id', selectedVersionIds);

    if (versionsError) throw versionsError;
    selectedVersions = Object.fromEntries(
      ((versions ?? []) as PageVersionRow[]).map((version) => [version.page_id, version]),
    );
  }

  return rows.map((row) => mapPage(row, selectedVersions)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function parseRecipeSource(payload: Record<string, unknown>): Promise<{
  recipe: ParsedRecipeDraft;
  confidence: number;
  needsReview: boolean;
  reasons: string[];
}> {
  return callAuthenticatedFunction('parse-recipe-source', payload);
}

export async function generateCookbookPage(payload: Record<string, unknown>): Promise<CookbookPage> {
  const response = await callAuthenticatedFunction<CookbookPage | CookbookPageRow | { page: CookbookPage | CookbookPageRow }>(
    'generate-cookbook-page',
    payload,
  );
  const page = (response as { page?: CookbookPage | CookbookPageRow }).page ?? response;

  if ('cookbook_id' in (page as JsonRecord)) {
    return mapPage(page as CookbookPageRow);
  }

  return page as CookbookPage;
}

export async function fetchCreditBalance(): Promise<CreditBalance> {
  try {
    return await callAuthenticatedFunction('credits', { action: 'balance' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('(404)')) {
      return { balance: 0 };
    }
    throw err;
  }
}
