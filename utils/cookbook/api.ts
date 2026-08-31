import { supabase } from '@/lib/supabase';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import { COOKBOOK_SECTION_ORDER, normalizeSection, normalizeSections } from '@/utils/cookbook/sections';
import { COOKBOOK_STYLE_PRESETS, getCookbookStyle } from '@/constants/cookbookStyles';
import {
  getLegacyCoverStyleForColor,
  normalizeCoverColorId,
  normalizeCoverFinishId,
} from '@/constants/cookbookBindings';
import {
  getCookbookPageStyleModelDescription,
  getCookbookPageStyleName,
  getCookbookPageStyleReferences,
  getCookbookPageStyleRevision,
  normalizeCookbookPageStyleId,
} from '@/constants/cookbookCustomization';
import { DEFAULT_RECIPE_TEMPLATE_ID, getRecipeTemplate, isRecipeTemplateId } from '@/constants/recipeTemplates';
import type {
  Cookbook,
  CookbookCoverColorId,
  CookbookCoverFinishId,
  CookbookPage,
  CookbookPageStyleId,
  CookbookSectionEntry,
  CookbookStyleId,
  GeneratedRecipePage,
  PageArtStatus,
  RecipeSourceType,
  RecipeTemplateId,
  StructuredIngredient,
  StructuredRecipe,
} from '@/types/cookbook';
import type { RecipeGraph, RecipeGraphDraft } from '@/types/recipeGraph';
import {
  normalizeRecipeCapturePageStatus,
  normalizeRecipeCaptureStatus,
  type RecipeCapture,
  type RecipeCaptureSource,
} from '@/utils/cookbook/captureLifecycle';
import { signStoredPageImages } from '@/utils/cookbook/privatePageUrls';
import { prepareRecipeCaptureImage } from '@/utils/cookbook/recipeCaptureImage';
import {
  prepareRecipeCaptureAudio,
  type RecipeCaptureAudioAsset,
} from '@/utils/cookbook/recipeCaptureAudio';
import {
  prepareRecipeCaptureVideo,
  type RecipeCaptureVideoAsset,
} from '@/utils/cookbook/recipeCaptureVideo';
import { captureStageCheckpoints } from '@/supabase/functions/_shared/captureStages';

interface CookbookRow {
  id: string;
  user_id: string;
  title: string;
  theme_name: string;
  theme_prompt: string;
  section_order?: unknown;
  cover_style?: string | null;
  cover_finish_id?: string | null;
  cover_color_id?: string | null;
  page_style_id?: string | null;
  page_template_id?: string | null;
  sections?: unknown;
  style_revision?: number | null;
  page_style_references?: unknown;
  is_default?: boolean | null;
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
  /** Complete-page pipeline columns. */
  recipe_graph?: unknown;
  style_id?: string | null;
  template_id?: string | null;
  lifecycle_status?: string | null;
  capture_id?: string | null;
  style_revision?: number | null;
}

interface RecipeCaptureRow {
  id: string;
  user_id: string;
  destination_cookbook_id?: string | null;
  source_type: RecipeSourceType;
  source_payload?: unknown;
  source_storage_path?: string | null;
  status: string;
  recipe_graph?: unknown;
  confidence?: number | string | null;
  extraction_notes?: unknown;
  inferred_fields?: unknown;
  pending_page_id?: string | null;
  art_status: string;
  art_warning?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  failed_stage?: string | null;
  stage_checkpoints?: unknown;
  idempotency_key: string;
  processing_attempt: number;
  processing_started_at?: string | null;
  created_at: string;
  updated_at: string;
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
  if (value && getCookbookStyle(value).id === value) {
    return value as CookbookStyleId;
  }
  const matchingTheme = themeName
    ? Object.values(COOKBOOK_STYLE_PRESETS).find((preset) => preset.theme.name === themeName)
    : undefined;
  if (matchingTheme) return matchingTheme.id;
  return getCookbookStyle().id;
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
  const coverFinishId = normalizeCoverFinishId(row.cover_finish_id);
  const coverColorId = normalizeCoverColorId(row.cover_color_id, coverStyle);
  const pageStyleId = normalizeCookbookPageStyleId(row.page_style_id, coverStyle);
  const pageTemplateId = normalizePageTemplateId(row.page_template_id);
  const sections = normalizeSections(row.sections);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    theme: { name: row.theme_name, prompt: row.theme_prompt },
    sectionOrder: normalizeSectionOrder(row.section_order),
    coverStyle,
    coverFinishId,
    coverColorId,
    pageStyleId,
    styleRevision: row.style_revision ?? getCookbookPageStyleRevision(pageStyleId),
    pageStyleReferences: asStringArray(row.page_style_references),
    isDefault: row.is_default === true,
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

  const promptPayload = selectedVersion?.prompt_payload;
  const isCompletePage = !!promptPayload
    && typeof promptPayload === 'object'
    && (promptPayload as { kind?: unknown }).kind === 'complete-recipe-page';

  if (selectedVersion?.image_url && row.style_id && isCompletePage) {
    page.pageImage = {
      id: selectedVersion.id,
      pageId: row.id,
      imageUrl: selectedVersion.image_url,
      storagePath: selectedVersion.storage_path ?? undefined,
      styleId: row.style_id as CookbookPageStyleId,
      styleRevision: (row.style_revision ?? Number((promptPayload as { styleRevision?: unknown }).styleRevision)) || 1,
      generationPrompt: '',
      model: selectedVersion.model ?? '',
      status: (selectedVersion.status as PageArtStatus) ?? 'ready',
      creditCost: selectedVersion.credit_cost ?? 1,
      createdAt: '',
    } satisfies GeneratedRecipePage;
  }

  // Compatibility for pages generated by the retired split-art pipeline.
  if (selectedVersion?.image_url && row.style_id && !isCompletePage) {
    page.artAsset = {
      id: selectedVersion.id,
      pageId: row.id,
      artUrl: selectedVersion.image_url,
      storagePath: selectedVersion.storage_path ?? undefined,
      styleId: row.style_id as CookbookPageStyleId,
      artPrompt: '', // Not stored on the version row; available in prompt_payload
      model: selectedVersion.model ?? '',
      status: (selectedVersion.status as PageArtStatus) ?? 'ready',
      creditCost: selectedVersion.credit_cost ?? 1,
      createdAt: '', // Not selected in the lightweight query
    };
  }

  if (row.style_id) {
    page.styleId = row.style_id as CookbookPageStyleId;
  }

  if (row.template_id) {
    page.templateId = row.template_id as RecipeTemplateId;
  }

  page.lifecycleStatus = row.lifecycle_status === 'processing' ? 'processing' : 'approved';
  if (row.capture_id) page.captureId = row.capture_id;

  return page;
}

export function mapRecipeCapture(row: RecipeCaptureRow): RecipeCapture {
  const destinationCookbookId = row.destination_cookbook_id ?? undefined;
  const pageId = row.pending_page_id ?? undefined;
  const pageStatus = normalizeRecipeCapturePageStatus(row.art_status);
  const status = normalizeRecipeCaptureStatus({
    status: row.status,
    pageStatus,
    pageId,
    destinationCookbookId,
  });
  return {
    id: row.id,
    userId: row.user_id,
    destinationCookbookId,
    sourceType: row.source_type,
    sourcePayload: row.source_payload && typeof row.source_payload === 'object'
      ? row.source_payload as Record<string, unknown>
      : {},
    sourceStoragePath: row.source_storage_path ?? undefined,
    status,
    recipeGraph: row.recipe_graph && typeof row.recipe_graph === 'object'
      ? row.recipe_graph as RecipeGraphDraft
      : undefined,
    confidence: row.confidence == null ? undefined : Number(row.confidence),
    extractionNotes: asStringArray(row.extraction_notes),
    inferredFields: asStringArray(row.inferred_fields),
    pageId,
    pageStatus,
    pageWarning: row.art_warning ?? undefined,
    failureCode: row.failure_code ?? undefined,
    failureMessage: row.failure_message ?? undefined,
    failedStage: row.failed_stage === 'source'
      || row.failed_stage === 'transcription'
      || row.failed_stage === 'extraction'
      || row.failed_stage === 'normalization'
      || row.failed_stage === 'quality'
      || row.failed_stage === 'destination'
      || row.failed_stage === 'page_generation'
      || row.failed_stage === 'publication'
      ? row.failed_stage
      : undefined,
    stageCheckpoints: captureStageCheckpoints(row.stage_checkpoints),
    idempotencyKey: row.idempotency_key,
    processingAttempt: row.processing_attempt,
    processingStartedAt: row.processing_started_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    .in('cookbook_id', cookbookIds)
    .eq('lifecycle_status', 'approved');

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
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
  pageStyleId: CookbookPageStyleId;
  pageTemplateId?: RecipeTemplateId;
  sections?: CookbookSectionEntry[];
}

export const COOKBOOK_LIMIT_REACHED_CODE = 'cookbook_limit_reached' as const;

export class CookbookLimitReachedError extends Error {
  readonly code = COOKBOOK_LIMIT_REACHED_CODE;

  constructor() {
    super('You have reached the cookbook limit for your plan.');
    this.name = 'CookbookLimitReachedError';
  }
}

function isCookbookLimitReachedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string; details?: string };
  const diagnostic = `${record.message ?? ''} ${record.details ?? ''}`;
  return record.code === 'P0001' && diagnostic.includes(COOKBOOK_LIMIT_REACHED_CODE);
}

export async function createCookbook(input: CreateCookbookInput): Promise<Cookbook> {
  const coverPreset = getCookbookStyle(getLegacyCoverStyleForColor(input.coverColorId));
  const pageStyleId = normalizeCookbookPageStyleId(input.pageStyleId, coverPreset.id);
  const templateId = getRecipeTemplate(input.pageTemplateId).id;
  const title = input.title.trim() || 'My Cookbook';
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('create_cookbook_for_current_user', {
      p_title: title,
      p_theme_name: getCookbookPageStyleName(pageStyleId),
      p_theme_prompt: getCookbookPageStyleModelDescription(pageStyleId),
      p_cover_style: coverPreset.id,
      p_cover_finish_id: normalizeCoverFinishId(input.coverFinishId),
      p_cover_color_id: normalizeCoverColorId(input.coverColorId),
      p_page_style_id: pageStyleId,
      p_style_revision: getCookbookPageStyleRevision(pageStyleId),
      p_page_style_references: getCookbookPageStyleReferences(pageStyleId),
      p_page_template_id: templateId,
      p_sections: input.sections ?? [],
    });

  if (error) {
    if (isCookbookLimitReachedError(error)) throw new CookbookLimitReachedError();
    throw error;
  }
  if (!data) throw new Error('Cookbook creation returned no cookbook');
  return { ...mapCookbook(data as CookbookRow), pageCount: 0 };
}

export async function deleteCookbook(cookbookId: string): Promise<void> {
  await callAuthenticatedFunction('delete-reader-content', {
    action: 'deleteCookbook',
    cookbookId,
  });
}

export async function retryReaderStorageCleanup(): Promise<void> {
  await callAuthenticatedFunction('delete-reader-content', { action: 'drain' });
}

export async function updateCookbookTitle(cookbookId: string, title: string): Promise<void> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error('Cookbook name cannot be empty.');

  const { error } = await supabase
    .schema('nutriai')
    .from('cookbooks')
    .update({ title: trimmedTitle })
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
      .select('id, page_id, image_url, storage_path, prompt_payload, model, status, credit_cost')
      .in('id', selectedVersionIds);

    if (versionsError) throw versionsError;
    const signedVersions = await signStoredPageImages((versions ?? []) as PageVersionRow[]);
    selectedVersions = Object.fromEntries(
      signedVersions.map((version) => [version.page_id, version]),
    );
  }

  return rows
    .map((row) => mapPage(row, selectedVersions))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listRecipeCaptures(userId: string): Promise<RecipeCapture[]> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('recipe_captures')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RecipeCaptureRow[]).map(mapRecipeCapture);
}

export async function startRecipeCapture(input: {
  source: RecipeCaptureSource;
  destinationCookbookId?: string;
  idempotencyKey: string;
}): Promise<{ capture: RecipeCapture; pendingPage?: CookbookPage; status: 'processing' }> {
  return callAuthenticatedFunction('capture-recipe', input, { timeoutMs: 20_000 });
}

export async function retryRecipeCapture(captureId: string): Promise<{
  capture: RecipeCapture;
  pendingPage?: CookbookPage;
  status: 'processing';
}> {
  return callAuthenticatedFunction('capture-recipe', { captureId }, { timeoutMs: 20_000 });
}

export async function correctRecipeCapture(
  captureId: string,
  correctedRecipeGraph: RecipeGraphDraft,
): Promise<{
  capture: RecipeCapture;
  pendingPage?: CookbookPage;
  status: 'processing';
}> {
  return callAuthenticatedFunction(
    'capture-recipe',
    { captureId, correctedRecipeGraph },
    { timeoutMs: 20_000 },
  );
}

export async function prepareRecipeCaptureDestination(
  captureId: string,
  destinationCookbookId: string,
): Promise<{ capture: RecipeCapture; status: 'processing' }> {
  return callAuthenticatedFunction(
    'capture-recipe',
    { captureId, destinationCookbookId },
    { timeoutMs: 20_000 },
  );
}

export async function uploadRecipeCaptureImage(input: {
  userId: string;
  imageUri?: string;
  imageBase64?: string;
  mimeType?: string;
  requestKey: string;
}): Promise<{ storagePath: string; mimeType: string }> {
  const prepared = await prepareRecipeCaptureImage(input);
  const storagePath = `${input.userId}/${input.requestKey}.jpg`;
  const { error } = await supabase.storage
    .from('recipe-captures')
    .upload(storagePath, prepared.bytes, { contentType: prepared.mimeType, upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return { storagePath, mimeType: prepared.mimeType };
}

export async function uploadRecipeCaptureAudio(input: {
  userId: string;
  audio: RecipeCaptureAudioAsset;
  requestKey: string;
}): Promise<{
  storagePath: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
}> {
  const prepared = await prepareRecipeCaptureAudio(input.audio);
  const storagePath = `${input.userId}/${input.requestKey}.${prepared.format}`;
  const { error } = await supabase.storage
    .from('recipe-captures')
    .upload(storagePath, prepared.bytes, { contentType: prepared.mimeType, upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return {
    storagePath,
    mimeType: prepared.mimeType,
    fileName: prepared.fileName,
    byteSize: prepared.byteSize,
  };
}

export async function uploadRecipeCaptureVideo(input: {
  userId: string;
  video: RecipeCaptureVideoAsset;
  requestKey: string;
}): Promise<{
  storagePath: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
}> {
  const prepared = await prepareRecipeCaptureVideo(input.video);
  const storagePath = `${input.userId}/${input.requestKey}.${prepared.fileExtension}`;
  const { error } = await supabase.storage
    .from('recipe-captures')
    .upload(storagePath, prepared.bytes, { contentType: prepared.mimeType, upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return {
    storagePath,
    mimeType: prepared.mimeType,
    fileName: prepared.fileName,
    byteSize: prepared.byteSize,
  };
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
  userId: string;
  recipeGraph: RecipeGraphDraft;
  styleId: CookbookPageStyleId;
  templateId: RecipeTemplateId;
}): Promise<CookbookPage> {
  const { cookbookId, userId, recipeGraph, styleId, templateId } = input;

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
      user_id: userId,
      title: recipeGraph.title,
      description: recipeGraph.description ?? null,
      servings: recipeGraph.servings,
      prep_time: recipeGraph.prepTimeMinutes ?? null,
      cook_time: recipeGraph.cookTimeMinutes ?? null,
      ingredients: flatIngredients,
      steps: flatSteps,
      source_type: recipeGraph.provenance?.sourceType ?? 'manual',
      source_url: recipeGraph.provenance?.sourceUrl ?? null,
      tags: recipeGraph.tags,
      category: recipeGraph.category,
      confidence: recipeGraph.provenance?.confidence ?? 1,
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
      style_revision: getCookbookPageStyleRevision(styleId),
      template_id: templateId,
      lifecycle_status: 'processing',
    })
    .select('*, recipes(*)')
    .single();

  if (pageError) throw pageError;

  return mapPage(pageRow as CookbookPageRow);
}

/** Generate one complete, styled recipe-page image. */
export async function generateRecipePageImage(payload: {
  cookbookId: string;
  pageId: string;
  recipeGraph: RecipeGraphDraft;
  styleId: CookbookPageStyleId;
  styleRevision?: number;
  styleReferences?: string[];
  idempotencyKey: string;
  artDirection?: string;
  referenceArtUrl?: string;
  selectOnComplete?: boolean;
}): Promise<{ pageImage: GeneratedRecipePage } | { status: 'processing'; requestId: string }> {
  const result = await callAuthenticatedFunction<
    { pageImage: GeneratedRecipePage } | { status: 'processing'; requestId: string }
  >('generate-page-art', payload, { timeoutMs: 20_000 });
  if (!('pageImage' in result) || !result.pageImage.storagePath) return result;

  const [signedPage] = await signStoredPageImages([{
    image_url: result.pageImage.imageUrl,
    storage_path: result.pageImage.storagePath,
  }]);
  return {
    pageImage: {
      ...result.pageImage,
      imageUrl: signedPage.image_url ?? undefined,
    },
  };
}

/**
 * Update the selected_version_id on a cookbook page to point to the
 * newly generated art version. This links the page to its art asset.
 */
export async function updatePageSelectedVersion(
  pageId: string,
  versionId: string,
): Promise<void> {
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('select_page_art_version', {
      p_page_id: pageId,
      p_version_id: versionId,
    });

  if (error) throw error;
  if (data !== true) throw new Error('Artwork version does not belong to this recipe page');
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
      .select('id, page_id, image_url, storage_path, prompt_payload, model, status, credit_cost')
      .eq('id', row.selected_version_id)
      .maybeSingle();

    if (!versionError && version) {
      const [signedVersion] = await signStoredPageImages([version as PageVersionRow]);
      selectedVersions[row.id] = signedVersion;
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

/**
 * Apply corrected recipe data and its generated page version together.
 * The database function validates page ownership and candidate membership.
 */
export async function applyRecipePageRevision(
  pageId: string,
  recipeGraph: RecipeGraph,
  versionId: string,
): Promise<void> {
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('apply_recipe_page_revision', {
      p_page_id: pageId,
      p_recipe_graph: recipeGraph as unknown as Record<string, unknown>,
      p_version_id: versionId,
    });

  if (error) throw error;
  if (data !== true) throw new Error('Recipe page revision could not be applied');
}
