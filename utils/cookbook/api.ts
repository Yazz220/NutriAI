import { supabase } from '@/lib/supabase';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import { COOKBOOK_SECTION_ORDER, normalizeSection, normalizeSections } from '@/utils/cookbook/sections';
import { COOKBOOK_STYLE_PRESETS, getCookbookStyle } from '@/constants/cookbookStyles';
import { DEFAULT_RECIPE_TEMPLATE_ID, getRecipeTemplate, isRecipeTemplateId } from '@/constants/recipeTemplates';
import type {
  Cookbook,
  CookbookPage,
  CookbookSectionEntry,
  CookbookStyleId,
  CreditBalance,
  PageArtAsset,
  PageArtStatus,
  RecipeSourceType,
  RecipeTemplateId,
  StructuredIngredient,
  StructuredRecipe,
} from '@/types/cookbook';
import type { RecipeGraph, RecipeGraphDraft } from '@/types/recipeGraph';

type CookbookInsertPayload = {
  user_id: string;
  title: string;
  theme_name: string;
  theme_prompt: string;
  cover_style?: CookbookStyleId;
  page_template_id?: RecipeTemplateId;
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
  page_template_id?: string | null;
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
  storage_path?: string | null;
  prompt_payload?: unknown;
  model?: string | null;
  status?: string | null;
  credit_cost?: number | null;
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
  /** New-pipeline columns (nullable — only present for typesetter pages) */
  recipe_graph?: unknown;
  style_id?: string | null;
  template_id?: string | null;
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

function normalizePageTemplateId(value?: string | null): RecipeTemplateId {
  return isRecipeTemplateId(value) ? value : DEFAULT_RECIPE_TEMPLATE_ID;
}

function getEmbeddedVersion(row: CookbookPageRow): PageVersionRow | undefined {
  if (row.selected_version) return row.selected_version;
  if (Array.isArray(row.page_versions)) return row.page_versions[0];
  return row.page_versions ?? undefined;
}

export function mapCookbook(row: CookbookRow): Cookbook {
  const coverStyle = normalizeCoverStyle(row.cover_style, row.theme_name);
  const pageTemplateId = normalizePageTemplateId(row.page_template_id);
  const sections = normalizeSections(row.sections);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    theme: { name: row.theme_name, prompt: row.theme_prompt },
    sectionOrder: normalizeSectionOrder(row.section_order),
    coverStyle,
    pageTemplateId,
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

  const page: CookbookPage = {
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

  // New-pipeline fields: populate when the page has a recipe_graph
  if (row.recipe_graph && typeof row.recipe_graph === 'object') {
    page.recipeGraph = row.recipe_graph as RecipeGraph;
  }

  // Build artAsset from the selected version (the generated illustration)
  if (selectedVersion?.image_url && row.style_id) {
    page.artAsset = {
      id: selectedVersion.id,
      pageId: row.id,
      artUrl: selectedVersion.image_url,
      storagePath: selectedVersion.storage_path ?? undefined,
      styleId: row.style_id as CookbookStyleId,
      artPrompt: '', // Not stored on the version row; available in prompt_payload
      model: selectedVersion.model ?? '',
      status: (selectedVersion.status as PageArtStatus) ?? 'ready',
      creditCost: selectedVersion.credit_cost ?? 1,
      createdAt: '', // Not selected in the lightweight query
    };
  }

  if (row.style_id) {
    page.styleId = row.style_id as CookbookStyleId;
  }

  if (row.template_id) {
    page.templateId = row.template_id as RecipeTemplateId;
  }

  return page;
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
  pageTemplateId?: RecipeTemplateId;
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
  const templateId = getRecipeTemplate(input.pageTemplateId).id;
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
      page_template_id: templateId,
      sections: input.sections ?? [],
    });
    return { ...mapCookbook(row), pageCount: 0 };
  } catch (error) {
    if (isCoverStyleConstraintError(error)) {
      const row = await insertCookbook({
        ...basePayload,
        cover_style: 'handwritten',
        page_template_id: templateId,
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

export async function updateCookbookPageTemplate(
  cookbookId: string,
  pageTemplateId: RecipeTemplateId,
): Promise<void> {
  const templateId = getRecipeTemplate(pageTemplateId).id;
  const { error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .update({ page_template_id: templateId })
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
      .select('id, page_id, image_url, storage_path, model, status, credit_cost')
      .in('id', selectedVersionIds);

    if (versionsError) throw versionsError;
    selectedVersions = Object.fromEntries(
      ((versions ?? []) as PageVersionRow[]).map((version) => [version.page_id, version]),
    );
  }

  return rows.map((row) => mapPage(row, selectedVersions)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Call the new extract-recipe Edge Function (Phase 2).
 * Accepts any source type (URL, text, image, video) in a single call
 * and returns a RecipeGraphDraft — the canonical structured recipe format.
 */
export async function extractRecipe(payload: {
  type: 'url' | 'text' | 'image' | 'video';
  input?: string;
  imageBase64?: string;
  videoUrl?: string;
}): Promise<{
  recipeGraph: RecipeGraphDraft;
  confidence: number;
  inferredFields: string[];
  extractionNotes: string[];
}> {
  return callAuthenticatedFunction('extract-recipe', payload, { timeoutMs: 95_000 });
}

// ---------------------------------------------------------------------------
// Phase 4.5: New-pipeline page creation + art generation
// ---------------------------------------------------------------------------

/**
 * Create a cookbook page row with a RecipeGraph.
 * Inserts a `recipes` row (flattened from the graph for backward compatibility)
 * and a `cookbook_pages` row with the full graph stored as JSONB.
 * Returns the new page with all fields populated.
 */
export async function createRecipePageWithGraph(input: {
  cookbookId: string;
  recipeGraph: RecipeGraphDraft;
  styleId: CookbookStyleId;
  templateId: RecipeTemplateId;
}): Promise<CookbookPage> {
  const { cookbookId, recipeGraph, styleId, templateId } = input;

  // Flatten the graph into the legacy recipes schema for backward compatibility
  const flatIngredients = recipeGraph.ingredientGroups.flatMap((g) =>
    g.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      isOptional: ing.isOptional,
    })),
  );
  const flatSteps = recipeGraph.stepGroups.flatMap((g) => g.steps.map((s) => s.text));

  // Insert the recipe row
  const { data: recipeRow, error: recipeError } = await supabase
    .schema('nutriai')
    .from('recipes')
    .insert({
      title: recipeGraph.title,
      description: recipeGraph.description ?? null,
      servings: recipeGraph.servings,
      prep_time: recipeGraph.prepTimeMinutes ?? null,
      cook_time: recipeGraph.cookTimeMinutes ?? null,
      ingredients: flatIngredients,
      steps: flatSteps,
      source_type: recipeGraph.provenance.sourceType,
      source_url: recipeGraph.provenance.sourceUrl ?? null,
      tags: recipeGraph.tags,
      category: recipeGraph.category,
      confidence: recipeGraph.provenance.confidence,
    })
    .select('id')
    .single();

  if (recipeError) throw recipeError;
  const recipeId = (recipeRow as { id: string }).id;

  // Determine the next page number and sort order
  const { data: existingPages, error: pagesError } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .select('page_number, sort_order')
    .eq('cookbook_id', cookbookId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (pagesError) throw pagesError;

  const maxSortOrder = (existingPages as Array<{ sort_order: number; page_number: number }>)[0]?.sort_order ?? -1;
  const maxPageNumber = (existingPages as Array<{ sort_order: number; page_number: number }>)[0]?.page_number ?? 0;

  // Insert the page row with the RecipeGraph stored as JSONB
  const { data: pageRow, error: pageError } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .insert({
      cookbook_id: cookbookId,
      recipe_id: recipeId,
      page_number: maxPageNumber + 1,
      section: recipeGraph.category,
      sort_order: maxSortOrder + 1,
      recipe_graph: recipeGraph as unknown as Record<string, unknown>,
      style_id: styleId,
      template_id: templateId,
    })
    .select('*, recipes(*)')
    .single();

  if (pageError) throw pageError;

  return mapPage(pageRow as CookbookPageRow);
}

/**
 * Call the generate-page-art Edge Function (Phase 2).
 * Generates an isolated illustration (no text) for the page.
 * Returns the art asset on success, or a processing status for polling.
 */
export async function generatePageArt(payload: {
  cookbookId: string;
  pageId: string;
  recipeGraph: RecipeGraphDraft;
  styleId: CookbookStyleId;
  idempotencyKey: string;
}): Promise<{ artAsset: PageArtAsset } | { status: 'processing'; requestId: string }> {
  return callAuthenticatedFunction('generate-page-art', payload, { timeoutMs: 20_000 });
}

/**
 * Update the selected_version_id on a cookbook page to point to the
 * newly generated art version. This links the page to its art asset.
 */
export async function updatePageSelectedVersion(
  pageId: string,
  versionId: string,
): Promise<void> {
  const { error } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .update({ selected_version_id: versionId })
    .eq('id', pageId);

  if (error) throw error;
}

/**
 * Fetch a single page by ID with all fields (including new-pipeline columns).
 * Used after art generation to get the updated page with the art asset.
 */
export async function fetchPageById(pageId: string): Promise<CookbookPage | null> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .select('*, recipes(*)')
    .eq('id', pageId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as CookbookPageRow;

  // Fetch the selected version if present
  const selectedVersions: Record<string, PageVersionRow | undefined> = {};
  if (row.selected_version_id) {
    const { data: version, error: versionError } = await supabase
      .schema('nutriai')
      .from('page_versions')
      .select('id, page_id, image_url, storage_path, model, status, credit_cost')
      .eq('id', row.selected_version_id)
      .maybeSingle();

    if (!versionError && version) {
      selectedVersions[row.id] = version as PageVersionRow;
    }
  }

  return mapPage(row, selectedVersions);
}

/**
 * Update the recipe_graph JSONB on a cookbook page.
 * Used by Nosh tools (scale_servings, substitute_ingredient, update_page_data)
 * to persist RecipeGraph mutations from the assistant.
 */
export async function updatePageRecipeGraph(
  pageId: string,
  recipeGraph: RecipeGraph,
): Promise<void> {
  const { error } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .update({ recipe_graph: recipeGraph as unknown as Record<string, unknown> })
    .eq('id', pageId);

  if (error) throw error;
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
