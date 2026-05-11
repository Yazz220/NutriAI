import { supabase } from '@/lib/supabase';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import { COOKBOOK_SECTION_ORDER, normalizeSection, normalizeSections } from '@/utils/cookbook/sections';
import { COOKBOOK_STYLE_PRESETS, getCookbookStyle } from '@/constants/cookbookStyles';
import type {
  Cookbook,
  CookbookPage,
  CookbookSectionEntry,
  CookbookStyleId,
  CreditBalance,
  ParsedRecipeDraft,
  RecipeSourceType,
  StructuredIngredient,
  StructuredRecipe,
} from '@/types/cookbook';

type JsonRecord = Record<string, unknown>;
type CookbookInsertPayload = {
  user_id: string;
  title: string;
  theme_name: string;
  theme_prompt: string;
  cover_style?: CookbookStyleId;
  sections?: CookbookSectionEntry[];
};

interface CookbookRow {
  id: string;
  user_id: string;
  title: string;
  theme_name: string;
  theme_prompt: string;
  section_order?: unknown;
  cover_style?: string | null;
  sections?: unknown;
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

interface CookbookPageCountRow {
  cookbook_id: string;
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

function normalizeCoverStyle(value?: string | null, themeName?: string | null): CookbookStyleId {
  const matchingTheme = themeName
    ? Object.values(COOKBOOK_STYLE_PRESETS).find((preset) => preset.theme.name === themeName)
    : undefined;
  if (matchingTheme) return matchingTheme.id;
  return getCookbookStyle(value).id;
}

function getEmbeddedVersion(row: CookbookPageRow): PageVersionRow | undefined {
  if (row.selected_version) return row.selected_version;
  if (Array.isArray(row.page_versions)) return row.page_versions[0];
  return row.page_versions ?? undefined;
}

export function mapCookbook(row: CookbookRow): Cookbook {
  const coverStyle = normalizeCoverStyle(row.cover_style, row.theme_name);
  const sections = normalizeSections(row.sections);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    theme: { name: row.theme_name, prompt: row.theme_prompt },
    sectionOrder: normalizeSectionOrder(row.section_order),
    coverStyle,
    sections,
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

export async function listCookbooks(userId: string): Promise<Cookbook[]> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  const cookbooks = ((data ?? []) as CookbookRow[]).map(mapCookbook);
  if (cookbooks.length === 0) return cookbooks;

  const cookbookIds = cookbooks.map((cookbook) => cookbook.id);
  const { data: pageRows, error: pageCountError } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .select('cookbook_id')
    .in('cookbook_id', cookbookIds);

  if (pageCountError) throw pageCountError;

  const pageCounts = ((pageRows ?? []) as CookbookPageCountRow[]).reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.cookbook_id] = (counts[row.cookbook_id] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return cookbooks.map((cookbook) => ({
    ...cookbook,
    pageCount: pageCounts[cookbook.id] ?? 0,
  }));
}

export async function getCookbook(cookbookId: string): Promise<Cookbook | null> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .select('*')
    .eq('id', cookbookId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCookbook(data as CookbookRow) : null;
}

export interface CreateCookbookInput {
  userId: string;
  title: string;
  coverStyle: CookbookStyleId;
  sections?: CookbookSectionEntry[];
}

function isMissingCookbookColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string };
  const message = record.message ?? '';
  return (
    record.code === 'PGRST204' ||
    message.includes("Could not find the 'cover_style' column") ||
    message.includes("Could not find the 'sections' column")
  );
}

function isCoverStyleConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string; details?: string };
  const text = `${record.message ?? ''} ${record.details ?? ''}`;
  return record.code === '23514' && text.includes('cookbooks_cover_style_check');
}

async function insertCookbook(payload: CookbookInsertPayload): Promise<CookbookRow> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as CookbookRow;
}

export async function createCookbook(input: CreateCookbookInput): Promise<Cookbook> {
  const preset = getCookbookStyle(input.coverStyle);
  const title = input.title.trim() || 'My Cookbook';
  const basePayload = {
    user_id: input.userId,
    title,
    theme_name: preset.theme.name,
    theme_prompt: preset.theme.prompt,
  };

  try {
    const row = await insertCookbook({
      ...basePayload,
      cover_style: preset.id,
      sections: input.sections ?? [],
    });
    return { ...mapCookbook(row), pageCount: 0 };
  } catch (error) {
    if (isCoverStyleConstraintError(error)) {
      const row = await insertCookbook({
        ...basePayload,
        cover_style: 'handwritten',
        sections: input.sections ?? [],
      });
      return { ...mapCookbook(row), pageCount: 0 };
    }

    if (!isMissingCookbookColumnError(error)) throw error;

    // Older deployed databases may not have the multi-cookbook style columns yet.
    // The row still saves with theme metadata, and mapCookbook falls back to a valid cover style.
    const row = await insertCookbook(basePayload);
    return { ...mapCookbook(row), pageCount: 0 };
  }
}

export async function deleteCookbook(cookbookId: string): Promise<void> {
  const { error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .delete()
    .eq('id', cookbookId);
  if (error) throw error;
}

export async function updateCookbookSections(
  cookbookId: string,
  sections: CookbookSectionEntry[],
): Promise<void> {
  const { error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .update({ sections })
    .eq('id', cookbookId);
  if (error) throw error;
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
