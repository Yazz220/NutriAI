import { supabase } from '@/lib/supabase';
import type { Cookbook } from '@/types/cookbook';
import { getCookbook } from '@/utils/cookbook/api';
import { loadRecipeFromCollection } from '@/utils/cookbook/recipeCollection';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

export type CollectionActionKind = 'move' | 'copy';

export interface CollectionActionPreview {
  action: CollectionActionKind;
  pageId: string;
  recipeTitle: string;
  sourceCookbook: Pick<Cookbook, 'id' | 'title'>;
  destinationCookbook: Pick<Cookbook, 'id' | 'title'>;
}

export interface CollectionActionResult {
  action: CollectionActionKind;
  sourcePageId: string;
  sourceCookbookId: string;
  sourceCookbookTitle: string;
  destinationCookbookId: string;
  destinationCookbookTitle: string;
  resultPageId: string;
  changed: boolean;
}

export interface RemoveRecipePageResult {
  pageId: string;
  cookbookId: string;
  cookbookTitle: string;
  captureId?: string | null;
  recipeId: string;
}

export interface ReorderCookbookPageResult {
  cookbookId: string;
  pageId: string;
  beforePageId?: string | null;
  orderedPageIds: string[];
  changed: boolean;
}

interface CollectionActionRpcRow {
  action: CollectionActionKind;
  sourcePageId: string;
  sourceCookbookId: string;
  sourceCookbookTitle: string;
  destinationCookbookId: string;
  destinationCookbookTitle: string;
  resultPageId: string;
  changed: boolean;
}

export function createCollectionActionRequestKey(): string {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `collection:${suffix}`;
}

export async function loadCollectionActionPreview(input: {
  action: CollectionActionKind;
  pageId: string;
  destinationCookbookId: string;
}): Promise<CollectionActionPreview> {
  const [loaded, destination] = await Promise.all([
    loadRecipeFromCollection(input.pageId),
    getCookbook(input.destinationCookbookId),
  ]);
  if (!destination) throw new Error('That destination cookbook is no longer available.');
  const source = loaded.cookbookId === destination.id
    ? destination
    : await getCookbook(loaded.cookbookId);
  if (!source) throw new Error('The recipe\'s cookbook is no longer available.');
  if (input.action === 'move' && source.id === destination.id) {
    throw new Error(`This recipe is already in ${destination.title}.`);
  }
  return {
    ...input,
    recipeTitle: loaded.recipeGraph.title,
    sourceCookbook: { id: source.id, title: source.title },
    destinationCookbook: { id: destination.id, title: destination.title },
  };
}

export async function organizeRecipePage(input: {
  action: CollectionActionKind;
  pageId: string;
  destinationCookbookId: string;
  idempotencyKey: string;
}): Promise<CollectionActionResult> {
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('organize_recipe_page', {
      p_action: input.action,
      p_page_id: input.pageId,
      p_destination_cookbook_id: input.destinationCookbookId,
      p_idempotency_key: input.idempotencyKey,
    });
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('Folio could not confirm the collection change.');
  return data as CollectionActionRpcRow;
}

export async function reorderCookbookPage(input: {
  cookbookId: string;
  pageId: string;
  beforePageId?: string | null;
  idempotencyKey: string;
}): Promise<ReorderCookbookPageResult> {
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('reorder_cookbook_page', {
      p_cookbook_id: input.cookbookId,
      p_page_id: input.pageId,
      p_before_page_id: input.beforePageId ?? null,
      p_idempotency_key: input.idempotencyKey,
    });
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('Folio could not confirm the new page order.');
  return data as ReorderCookbookPageResult;
}

export async function removeRecipePage(pageId: string): Promise<RemoveRecipePageResult> {
  const response = await callAuthenticatedFunction<{ result?: RemoveRecipePageResult }>(
    'delete-reader-content',
    { action: 'removeRecipe', pageId },
  );
  if (!response.result || typeof response.result !== 'object') {
    throw new Error('Folio could not confirm the recipe removal.');
  }
  return response.result;
}
