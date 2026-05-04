# Nosh AI Cookbook Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Nosh into a personal recipe e-book with an AI chef assistant who understands every generated cookbook page.

**Architecture:** Keep the existing Expo Router, Supabase auth, EAS, and brand foundation, but replace the current tab/meal-planner centered product with a cookbook domain. Supabase becomes the source of truth for cookbooks, structured recipes, generated page versions, credits, and assistant context; AsyncStorage is only a cache. The first implementation builds URL/text/image/screenshot/video import, light review, fixed generated page images, book reader navigation, TOC, Nosh assistant sheet, credits, and image export.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, TypeScript strict mode, Supabase, Supabase Edge Functions, TanStack React Query, AsyncStorage cache, Jest.

---

## Scope Check

This plan implements the first shippable cookbook reset slice from `docs/superpowers/specs/2026-05-03-nosh-ai-cookbook-reset-design.md`.

Included:

- Cookbook data model and client types.
- Supabase migrations and RLS for cookbook pages, page versions, and credits.
- Authenticated Edge Function helper repairs.
- Book-first navigation shell.
- Onboarding cookbook style selection.
- Book reader, table of contents, add page/import, review, generation result, Nosh sheet, settings.
- URL, pasted text, image, screenshot, and video URL import.
- OpenRouter as the primary recipe-processing provider, with OpenAI kept available for image-page generation and future provider changes.
- One-credit-per-successful-generation ledger.
- Native image export/share.

Excluded from this first plan:

- Public gallery.
- Multiple cookbooks.
- Full PDF export.
- Full subscription purchase flow.
- Multi-page recipe spreads.

## File Structure

### New Domain Types and Pure Logic

- Create `types/cookbook.ts`: cookbook, recipe, page, page version, credit, and parser confidence types.
- Modify `types/index.ts`: re-export cookbook types.
- Create `utils/cookbook/sections.ts`: category labels, section sorting, TOC grouping.
- Create `utils/cookbook/confidence.ts`: confidence score helpers for parsed recipes.
- Create `utils/cookbook/pagePrompt.ts`: deterministic prompt payload builder for generated pages.
- Test `__tests__/utils/cookbook/sections.test.ts`.
- Test `__tests__/utils/cookbook/confidence.test.ts`.
- Test `__tests__/utils/cookbook/pagePrompt.test.ts`.

### Supabase and Edge Functions

- Create `supabase/sql/20260503_ai_cookbook_reset.sql`: schema additions, storage bucket notes, RLS, grants.
- Modify `supabase/functions/_shared/cors.ts`: restore request-aware helpers.
- Modify `supabase/functions/_shared/auth.ts`: compile cleanly with shared helpers.
- Create `utils/supabaseEdge.ts`: client helper that sends the signed-in access token.
- Create `supabase/functions/parse-recipe-source/index.ts`: unified OpenRouter-backed parser wrapper for URL/text/image/video with legacy media fallbacks.
- Create `supabase/functions/generate-cookbook-page/index.ts`: generation endpoint with storage upload and ledger spend.
- Use the existing authenticated `ai-chat` Edge Function for the contextual assistant sheet.
- Create `supabase/functions/credits/index.ts`: credit balance endpoint.

### Client Data Layer

- Create `hooks/useCookbook.ts`: React Query data layer for cookbook, pages, and selected page.
- Create `hooks/useCookbookImport.ts`: import/review/generation state machine.
- Create `hooks/useNoshAssistant.ts`: contextual assistant state.
- Create `utils/cookbook/api.ts`: Supabase table reads/writes and Edge Function calls.
- Create `utils/cookbook/cache.ts`: AsyncStorage cache for last loaded cookbook.

### Navigation and Screens

- Modify `app/_layout.tsx`: replace old provider stack with cookbook-focused providers and redirect authenticated users to `(book)`.
- Create `app/(book)/_layout.tsx`: stack layout for book reader flow.
- Create `app/(book)/index.tsx`: book reader landing screen.
- Create `app/(book)/toc.tsx`: table of contents.
- Create `app/(book)/add.tsx`: add page/import.
- Create `app/(book)/review.tsx`: light recipe editor.
- Create `app/(book)/generation/[pageId].tsx`: generation result.
- Create `app/(book)/settings.tsx`: profile/settings.
- Keep `app/(auth)` with fixes as needed.
- Replace or stop routing to `app/(tabs)` in V1.

### UI Components

- Create `components/cookbook/BookReader.tsx`.
- Create `components/cookbook/PageCanvas.tsx`.
- Create `components/cookbook/PageControls.tsx`.
- Create `components/cookbook/TableOfContents.tsx`.
- Create `components/cookbook/AddPageComposer.tsx`.
- Create `components/cookbook/RecipeReviewForm.tsx`.
- Create `components/cookbook/GenerationResult.tsx`.
- Create `components/cookbook/NoshAssistantButton.tsx`.
- Create `components/cookbook/NoshAssistantSheet.tsx`.
- Create `components/cookbook/CookbookStylePicker.tsx`.
- Create `components/cookbook/CreditBadge.tsx`.

### Onboarding and Settings

- Modify `types/onboarding.ts`: add cookbook style fields.
- Modify `utils/onboardingPersistence.ts`: persist cookbook style.
- Modify `utils/onboardingNavigation.ts`: add cookbook style step before completion.
- Create `app/(onboarding)/cookbook-style.tsx`: style choice screen.
- Modify `app/(onboarding)/_layout.tsx` if route list is explicit.
- Modify `components/profile/EnhancedProfileScreen.tsx` or replace settings surface in `(book)/settings.tsx`.

### Legacy Cleanup

- Leave old `hooks/useMealsStore.ts`, `hooks/useMealPlanner.ts`, and `hooks/useShoppingListStore.ts` in place until new flow passes tests.
- Remove old providers from the root once cookbook flow is live.
- Keep old tab files untouched until the new `(book)` shell is verified, then remove or orphan them from routing.

---

## Task 1: Repair Edge Function Shared Helpers and Authenticated Client Calls

**Files:**

- Modify: `supabase/functions/_shared/cors.ts`
- Modify: `supabase/functions/_shared/auth.ts`
- Create: `utils/supabaseEdge.ts`
- Modify: `utils/aiClient.ts`
- Modify: `utils/importOrchestrator.ts`

- [ ] **Step 1: Write a failing Deno check target**

Create a local verification note in the plan executor output, then run:

```bash
deno check supabase/functions/delete-account/index.ts
```

Expected before changes: FAIL with errors about `jsonError(..., req)`, missing `getCorsHeaders`, and wrong `corsResponse` arguments.

- [ ] **Step 2: Replace shared CORS helpers**

Set `supabase/functions/_shared/cors.ts` to this shape:

```ts
const allowedOrigins = new Set([
  'http://localhost:8081',
  'http://localhost:19006',
  'https://nosh.app',
]);

export function getCorsHeaders(req?: Request): HeadersInit {
  const origin = req?.headers.get('origin') ?? '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export function corsResponse(req?: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(req) });
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function jsonError(message: string, status: number, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}
```

- [ ] **Step 3: Verify shared auth compiles**

Run:

```bash
deno check supabase/functions/delete-account/index.ts
```

Expected: PASS.

- [ ] **Step 4: Create signed Edge Function client helper**

Create `utils/supabaseEdge.ts`:

```ts
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to use this feature.');
  return token;
}

export async function callAuthenticatedFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured.');
  }

  const token = await getAccessToken();
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${functionName} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}
```

- [ ] **Step 5: Refactor AI client to use signed helper**

In `utils/aiClient.ts`, remove `authHeaders()` and change `edgeFunctionRequest` to call:

```ts
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

async function edgeFunctionRequest(
  payload: Record<string, unknown>,
  maxRetries = 2,
): Promise<any> {
  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= maxRetries) {
    try {
      return await callAuthenticatedFunction('ai-chat', payload);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const retryable = message.includes('(429)') || message.includes('(500)') || message.includes('(502)') || message.includes('(503)');
      if (!retryable || attempt === maxRetries) break;
      const delayMs = Math.pow(2, attempt) * 500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
```

- [ ] **Step 6: Refactor import orchestrator helper**

In `utils/importOrchestrator.ts`, replace the internal `callEdgeFunction` implementation with:

```ts
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  return callAuthenticatedFunction<T>(functionName, body);
}
```

- [ ] **Step 7: Run verification**

Run:

```bash
npm run typecheck
deno check supabase/functions/delete-account/index.ts
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/_shared/cors.ts supabase/functions/_shared/auth.ts utils/supabaseEdge.ts utils/aiClient.ts utils/importOrchestrator.ts
git commit -m "fix: use authenticated edge function calls"
```

---

## Task 2: Add Cookbook Types and Pure Utilities

**Files:**

- Create: `types/cookbook.ts`
- Modify: `types/index.ts`
- Create: `utils/cookbook/sections.ts`
- Create: `utils/cookbook/confidence.ts`
- Create: `utils/cookbook/pagePrompt.ts`
- Test: `__tests__/utils/cookbook/sections.test.ts`
- Test: `__tests__/utils/cookbook/confidence.test.ts`
- Test: `__tests__/utils/cookbook/pagePrompt.test.ts`

- [ ] **Step 1: Write section grouping tests**

Create `__tests__/utils/cookbook/sections.test.ts`:

```ts
import { groupPagesBySection, normalizeSection } from '@/utils/cookbook/sections';
import type { CookbookPageSummary } from '@/types/cookbook';

const pages: CookbookPageSummary[] = [
  { id: 'p1', title: 'Oats', section: 'breakfast', pageNumber: 1, imageUrl: 'a' },
  { id: 'p2', title: 'Pasta', section: 'dinner', pageNumber: 2, imageUrl: 'b' },
  { id: 'p3', title: 'Cake', section: 'desserts', pageNumber: 3, imageUrl: 'c' },
];

describe('cookbook sections', () => {
  it('normalizes unknown sections to favorites', () => {
    expect(normalizeSection('weeknight')).toBe('favorites');
  });

  it('groups pages by cookbook section order', () => {
    const grouped = groupPagesBySection(pages);
    expect(grouped.map((section) => section.id)).toEqual(['breakfast', 'dinner', 'desserts']);
    expect(grouped[0].pages[0].title).toBe('Oats');
  });
});
```

- [ ] **Step 2: Write confidence tests**

Create `__tests__/utils/cookbook/confidence.test.ts`:

```ts
import { scoreParsedRecipeConfidence } from '@/utils/cookbook/confidence';

describe('scoreParsedRecipeConfidence', () => {
  it('returns high confidence for complete recipes', () => {
    const score = scoreParsedRecipeConfidence({
      title: 'Lemon Pasta',
      ingredients: [
        { name: 'pasta', quantity: '8', unit: 'oz' },
        { name: 'lemon', quantity: '1', unit: '' },
        { name: 'butter', quantity: '2', unit: 'tbsp' },
      ],
      steps: ['Boil pasta.', 'Make sauce.', 'Toss together.'],
      servings: 4,
      sourceType: 'url',
    });
    expect(score.confidence).toBeGreaterThanOrEqual(0.8);
    expect(score.needsReview).toBe(false);
  });

  it('requires review for missing steps', () => {
    const score = scoreParsedRecipeConfidence({
      title: 'Mystery Dish',
      ingredients: [{ name: 'egg', quantity: '1', unit: '' }],
      steps: [],
      sourceType: 'text',
    });
    expect(score.needsReview).toBe(true);
    expect(score.reasons).toContain('Missing directions');
  });
});
```

- [ ] **Step 3: Write page prompt tests**

Create `__tests__/utils/cookbook/pagePrompt.test.ts`:

```ts
import { buildCookbookPagePromptPayload } from '@/utils/cookbook/pagePrompt';

describe('buildCookbookPagePromptPayload', () => {
  it('builds deterministic payload for one-page generation', () => {
    const payload = buildCookbookPagePromptPayload({
      recipe: {
        id: 'r1',
        title: 'Blueberry Muffins',
        servings: 12,
        ingredients: [{ name: 'blueberries', quantity: '1', unit: 'cup' }],
        steps: ['Mix batter.', 'Bake until golden.'],
        tags: ['breakfast'],
        category: 'breakfast',
        sourceType: 'text',
      },
      theme: {
        name: 'Warm handwritten',
        prompt: 'warm handwritten family cookbook, cream paper, soft watercolor food illustration',
      },
    });

    expect(payload.recipe.title).toBe('Blueberry Muffins');
    expect(payload.layout).toBe('single-page-cookbook');
    expect(payload.instructions).toContain('Readable recipe text is required.');
  });
});
```

- [ ] **Step 4: Run tests to verify failure**

Run:

```bash
npm test -- --runInBand __tests__/utils/cookbook
```

Expected: FAIL because modules do not exist.

- [ ] **Step 5: Create cookbook types**

Create `types/cookbook.ts`:

```ts
export type CookbookSection =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'healthy'
  | 'desserts'
  | 'sides'
  | 'favorites';

export type RecipeSourceType = 'url' | 'text' | 'image';

export type PageVersionStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface CookbookTheme {
  name: string;
  prompt: string;
}

export interface Cookbook {
  id: string;
  userId: string;
  title: string;
  theme: CookbookTheme;
  sectionOrder: CookbookSection[];
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
```

Modify `types/index.ts`:

```ts
export * from './cookbook';
```

- [ ] **Step 6: Implement section utilities**

Create `utils/cookbook/sections.ts`:

```ts
import type { CookbookSection, CookbookPageSummary, TocSection } from '@/types/cookbook';

export const COOKBOOK_SECTION_ORDER: CookbookSection[] = [
  'breakfast',
  'lunch',
  'dinner',
  'healthy',
  'desserts',
  'sides',
  'favorites',
];

export const COOKBOOK_SECTION_LABELS: Record<CookbookSection, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  healthy: 'Healthy',
  desserts: 'Desserts',
  sides: 'Sides',
  favorites: 'Favorites',
};

export function normalizeSection(value?: string | null): CookbookSection {
  if (!value) return 'favorites';
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized === 'breakfast') return 'breakfast';
  if (normalized === 'lunch') return 'lunch';
  if (normalized === 'dinner') return 'dinner';
  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'dessert' || normalized === 'desserts') return 'desserts';
  if (normalized === 'side' || normalized === 'sides') return 'sides';
  return 'favorites';
}

export function groupPagesBySection(pages: CookbookPageSummary[]): TocSection[] {
  return COOKBOOK_SECTION_ORDER.map((id) => ({
    id,
    label: COOKBOOK_SECTION_LABELS[id],
    pages: pages
      .filter((page) => page.section === id)
      .sort((a, b) => a.pageNumber - b.pageNumber),
  })).filter((section) => section.pages.length > 0);
}
```

- [ ] **Step 7: Implement confidence utility**

Create `utils/cookbook/confidence.ts`:

```ts
import type { ParsedRecipeDraft, RecipeConfidenceResult } from '@/types/cookbook';

export function scoreParsedRecipeConfidence(recipe: ParsedRecipeDraft): RecipeConfidenceResult {
  const reasons: string[] = [];
  let score = 0;

  if (recipe.title?.trim()) score += 0.2;
  else reasons.push('Missing title');

  if (recipe.ingredients.length >= 3) score += 0.25;
  else reasons.push('Too few ingredients');

  if (recipe.steps.length >= 2) score += 0.25;
  else reasons.push('Missing directions');

  if (recipe.servings && recipe.servings > 0) score += 0.1;
  else reasons.push('Missing servings');

  if (recipe.sourceType === 'url' || recipe.sourceType === 'image') score += 0.1;
  if (recipe.ingredients.every((ingredient) => ingredient.name.trim().length > 0)) score += 0.1;

  const confidence = Math.min(1, Math.round(score * 100) / 100);
  return {
    confidence,
    needsReview: confidence < 0.75,
    reasons,
  };
}
```

- [ ] **Step 8: Implement page prompt utility**

Create `utils/cookbook/pagePrompt.ts`:

```ts
import type { CookbookPagePromptPayload, CookbookTheme, StructuredRecipe } from '@/types/cookbook';

interface BuildPromptInput {
  recipe: StructuredRecipe;
  theme: CookbookTheme;
}

export function buildCookbookPagePromptPayload({
  recipe,
  theme,
}: BuildPromptInput): CookbookPagePromptPayload {
  return {
    layout: 'single-page-cookbook',
    theme,
    recipe: {
      title: recipe.title,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      ingredients: recipe.ingredients.map((ingredient) =>
        [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' '),
      ),
      steps: recipe.steps,
    },
    instructions: [
      'Create one portrait recipe cookbook page.',
      'Readable recipe text is required.',
      'Use the supplied title, ingredients, directions, servings, and timing exactly.',
      'Keep the structure consistent: title, timing/servings, ingredients, directions, food visual.',
      'Apply the cookbook visual style without changing the recipe facts.',
      `Cookbook style: ${theme.prompt}`,
    ].join(' '),
  };
}
```

- [ ] **Step 9: Run tests and typecheck**

Run:

```bash
npm test -- --runInBand __tests__/utils/cookbook
npm run typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add types/cookbook.ts types/index.ts utils/cookbook __tests__/utils/cookbook
git commit -m "feat: add cookbook domain types"
```

---

## Task 3: Add Supabase Cookbook Schema

**Files:**

- Create: `supabase/sql/20260503_ai_cookbook_reset.sql`

- [ ] **Step 1: Create migration SQL**

Create `supabase/sql/20260503_ai_cookbook_reset.sql`:

```sql
create schema if not exists nutriai;

grant usage on schema nutriai to anon, authenticated, service_role;

create table if not exists nutriai.cookbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My Cookbook',
  theme_name text not null,
  theme_prompt text not null,
  section_order jsonb not null default '["breakfast","lunch","dinner","healthy","desserts","sides","favorites"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nutriai.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  servings integer,
  prep_time integer,
  cook_time integer,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source_type text not null check (source_type in ('url','text','image')),
  source_url text,
  tags jsonb not null default '[]'::jsonb,
  category text not null default 'favorites',
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nutriai.cookbook_pages (
  id uuid primary key default gen_random_uuid(),
  cookbook_id uuid not null references nutriai.cookbooks(id) on delete cascade,
  recipe_id uuid not null references nutriai.recipes(id) on delete cascade,
  page_number integer not null,
  section text not null default 'favorites',
  sort_order integer not null default 0,
  selected_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cookbook_id, page_number)
);

create table if not exists nutriai.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references nutriai.cookbook_pages(id) on delete cascade,
  image_url text,
  storage_path text,
  prompt_payload jsonb not null,
  model text not null,
  status text not null check (status in ('pending','generating','ready','failed')),
  credit_cost integer not null default 1,
  error_message text,
  created_at timestamptz not null default now()
);

alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_selected_version_id_fkey;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_selected_version_id_fkey
  foreign key (selected_version_id) references nutriai.page_versions(id) on delete set null;

create table if not exists nutriai.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('grant','generation_spend','adjustment')),
  amount integer not null,
  related_page_version_id uuid references nutriai.page_versions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cookbooks_user_idx on nutriai.cookbooks(user_id);
create index if not exists recipes_user_idx on nutriai.recipes(user_id);
create index if not exists pages_cookbook_order_idx on nutriai.cookbook_pages(cookbook_id, sort_order);
create index if not exists page_versions_page_idx on nutriai.page_versions(page_id);
create index if not exists credit_ledger_user_idx on nutriai.credit_ledger(user_id, created_at desc);

alter table nutriai.cookbooks enable row level security;
alter table nutriai.recipes enable row level security;
alter table nutriai.cookbook_pages enable row level security;
alter table nutriai.page_versions enable row level security;
alter table nutriai.credit_ledger enable row level security;

drop policy if exists cookbooks_owner_select on nutriai.cookbooks;
create policy cookbooks_owner_select on nutriai.cookbooks
  for select using (auth.uid() = user_id);

drop policy if exists cookbooks_owner_insert on nutriai.cookbooks;
create policy cookbooks_owner_insert on nutriai.cookbooks
  for insert with check (auth.uid() = user_id);

drop policy if exists cookbooks_owner_update on nutriai.cookbooks;
create policy cookbooks_owner_update on nutriai.cookbooks
  for update using (auth.uid() = user_id);

drop policy if exists recipes_owner_all on nutriai.recipes;
create policy recipes_owner_all on nutriai.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pages_owner_all on nutriai.cookbook_pages;
create policy pages_owner_all on nutriai.cookbook_pages
  for all using (
    exists (
      select 1 from nutriai.cookbooks
      where cookbooks.id = cookbook_pages.cookbook_id
      and cookbooks.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from nutriai.cookbooks
      where cookbooks.id = cookbook_pages.cookbook_id
      and cookbooks.user_id = auth.uid()
    )
  );

drop policy if exists page_versions_owner_all on nutriai.page_versions;
create policy page_versions_owner_all on nutriai.page_versions
  for all using (
    exists (
      select 1
      from nutriai.cookbook_pages p
      join nutriai.cookbooks c on c.id = p.cookbook_id
      where p.id = page_versions.page_id
      and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from nutriai.cookbook_pages p
      join nutriai.cookbooks c on c.id = p.cookbook_id
      where p.id = page_versions.page_id
      and c.user_id = auth.uid()
    )
  );

drop policy if exists credit_ledger_owner_select on nutriai.credit_ledger;
create policy credit_ledger_owner_select on nutriai.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists credit_ledger_service_all on nutriai.credit_ledger;
create policy credit_ledger_service_all on nutriai.credit_ledger
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select, insert, update, delete on all tables in schema nutriai to authenticated;
grant all privileges on all tables in schema nutriai to service_role;
grant usage on all sequences in schema nutriai to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cookbook-pages',
  'cookbook-pages',
  true,
  10485760,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
```

- [ ] **Step 2: Validate SQL syntax locally**

Run:

```bash
supabase db lint --local
```

Expected: PASS, or if local Supabase is not running, document the exact connection error in the task notes and continue to type-level work.

- [ ] **Step 3: Commit**

```bash
git add supabase/sql/20260503_ai_cookbook_reset.sql
git commit -m "feat: add cookbook schema"
```

---

## Task 4: Build Cookbook API and React Query Hook

**Files:**

- Create: `utils/cookbook/api.ts`
- Create: `utils/cookbook/cache.ts`
- Create: `hooks/useCookbook.ts`
- Test: `__tests__/utils/cookbook/cache.test.ts`

- [ ] **Step 1: Write cache test**

Create `__tests__/utils/cookbook/cache.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCachedCookbook, saveCachedCookbook } from '@/utils/cookbook/cache';

describe('cookbook cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips cached cookbook data', async () => {
    await saveCachedCookbook({
      cookbook: {
        id: 'c1',
        userId: 'u1',
        title: 'My Cookbook',
        theme: { name: 'Warm', prompt: 'warm cookbook' },
        sectionOrder: ['breakfast', 'dinner', 'favorites'],
        createdAt: '2026-05-03T00:00:00.000Z',
        updatedAt: '2026-05-03T00:00:00.000Z',
      },
      pages: [],
    });

    const cached = await loadCachedCookbook();
    expect(cached?.cookbook.title).toBe('My Cookbook');
  });
});
```

- [ ] **Step 2: Implement cache**

Create `utils/cookbook/cache.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

const CACHE_KEY = 'nosh:cookbook-cache:v1';

interface CachedCookbook {
  cookbook: Cookbook;
  pages: CookbookPage[];
}

export async function saveCachedCookbook(value: CachedCookbook): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(value));
}

export async function loadCachedCookbook(): Promise<CachedCookbook | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedCookbook;
  } catch {
    await AsyncStorage.removeItem(CACHE_KEY);
    return null;
  }
}
```

- [ ] **Step 3: Implement API mapping**

Create `utils/cookbook/api.ts`:

```ts
import { supabase } from '@/lib/supabase';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import { normalizeSection } from '@/utils/cookbook/sections';
import type {
  Cookbook,
  CookbookPage,
  CookbookTheme,
  CreditBalance,
  ParsedRecipeDraft,
  StructuredRecipe,
} from '@/types/cookbook';

function mapCookbook(row: any): Cookbook {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    theme: { name: row.theme_name, prompt: row.theme_prompt },
    sectionOrder: row.section_order ?? ['breakfast', 'lunch', 'dinner', 'healthy', 'desserts', 'sides', 'favorites'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecipe(row: any): StructuredRecipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    servings: row.servings ?? undefined,
    prepTime: row.prep_time ?? undefined,
    cookTime: row.cook_time ?? undefined,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    sourceType: row.source_type,
    sourceUrl: row.source_url ?? undefined,
    tags: row.tags ?? [],
    category: normalizeSection(row.category),
    confidence: Number(row.confidence ?? 0),
  };
}

function mapPage(row: any): CookbookPage {
  return {
    id: row.id,
    cookbookId: row.cookbook_id,
    recipeId: row.recipe_id,
    title: row.recipes?.title ?? 'Untitled Recipe',
    section: normalizeSection(row.section),
    pageNumber: row.page_number,
    sortOrder: row.sort_order,
    selectedVersionId: row.selected_version_id ?? undefined,
    imageUrl: row.page_versions?.image_url ?? undefined,
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
  if (existing) return mapCookbook(existing);

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
  return mapCookbook(data);
}

export async function fetchCookbookPages(cookbookId: string): Promise<CookbookPage[]> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .select('*, recipes(*), page_versions!cookbook_pages_selected_version_id_fkey(*)')
    .eq('cookbook_id', cookbookId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapPage);
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
  return callAuthenticatedFunction('generate-cookbook-page', payload);
}

export async function fetchCreditBalance(): Promise<CreditBalance> {
  return callAuthenticatedFunction('credits', { action: 'balance' });
}
```

- [ ] **Step 4: Implement hook**

Create `hooks/useCookbook.ts`:

```ts
import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getOrCreateCookbook, fetchCookbookPages, fetchCreditBalance } from '@/utils/cookbook/api';
import { loadCachedCookbook, saveCachedCookbook } from '@/utils/cookbook/cache';
import type { CookbookPage, CookbookTheme } from '@/types/cookbook';

const DEFAULT_THEME: CookbookTheme = {
  name: 'Warm handwritten',
  prompt: 'warm handwritten family cookbook, cream paper, soft watercolor food illustration',
};

export const [CookbookProvider, useCookbook] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const cookbookQuery = useQuery({
    queryKey: ['cookbook', user?.id],
    enabled: !!user,
    queryFn: () => getOrCreateCookbook(user!.id, DEFAULT_THEME),
  });

  const pagesQuery = useQuery({
    queryKey: ['cookbook-pages', cookbookQuery.data?.id],
    enabled: !!cookbookQuery.data?.id,
    queryFn: () => fetchCookbookPages(cookbookQuery.data!.id),
  });

  const creditsQuery = useQuery({
    queryKey: ['credits', user?.id],
    enabled: !!user,
    queryFn: fetchCreditBalance,
  });

  useEffect(() => {
    if (cookbookQuery.data && pagesQuery.data) {
      saveCachedCookbook({ cookbook: cookbookQuery.data, pages: pagesQuery.data }).catch(() => {});
    }
  }, [cookbookQuery.data, pagesQuery.data]);

  useEffect(() => {
    if (pagesQuery.data?.length && !selectedPageId) {
      setSelectedPageId(pagesQuery.data[0].id);
    }
  }, [pagesQuery.data, selectedPageId]);

  const selectedPage = useMemo<CookbookPage | null>(() => {
    return pagesQuery.data?.find((page) => page.id === selectedPageId) ?? pagesQuery.data?.[0] ?? null;
  }, [pagesQuery.data, selectedPageId]);

  const refresh = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cookbook', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['cookbook-pages', cookbookQuery.data?.id] });
      await queryClient.invalidateQueries({ queryKey: ['credits', user?.id] });
    },
  });

  return {
    cookbook: cookbookQuery.data ?? null,
    pages: pagesQuery.data ?? [],
    selectedPage,
    selectedPageId,
    setSelectedPageId,
    creditBalance: creditsQuery.data?.balance ?? 0,
    isLoading: cookbookQuery.isLoading || pagesQuery.isLoading,
    error: cookbookQuery.error ?? pagesQuery.error ?? creditsQuery.error,
    refresh: refresh.mutateAsync,
    loadCachedCookbook,
  };
});
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
npm test -- --runInBand __tests__/utils/cookbook/cache.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add utils/cookbook/api.ts utils/cookbook/cache.ts hooks/useCookbook.ts __tests__/utils/cookbook/cache.test.ts
git commit -m "feat: add cookbook data layer"
```

---

## Task 5: Replace Root Navigation With Book Shell

**Files:**

- Modify: `app/_layout.tsx`
- Create: `app/(book)/_layout.tsx`
- Create: `app/(book)/index.tsx`
- Create: `components/cookbook/EmptyBookState.tsx`

- [ ] **Step 1: Create empty book screen component**

Create `components/cookbook/EmptyBookState.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface EmptyBookStateProps {
  onAddPage: () => void;
}

export function EmptyBookState({ onAddPage }: EmptyBookStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cookbook is ready.</Text>
      <Text style={styles.subtitle}>Add your first recipe page and start building a book Nosh can cook from with you.</Text>
      <Button title="Add first page" onPress={onAddPage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
```

- [ ] **Step 2: Create book layout**

Create `app/(book)/_layout.tsx`:

```tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function BookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="toc" />
      <Stack.Screen name="add" />
      <Stack.Screen name="review" />
      <Stack.Screen name="generation/[pageId]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
```

- [ ] **Step 3: Create first book index screen**

Create `app/(book)/index.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyBookState } from '@/components/cookbook/EmptyBookState';
import { useCookbook } from '@/hooks/useCookbook';
import { Colors } from '@/constants/colors';

export default function BookReaderScreen() {
  const insets = useSafeAreaInsets();
  const { pages, isLoading } = useCookbook();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (pages.length === 0) {
    return <EmptyBookState onAddPage={() => router.push('/(book)/add')} />;
  }

  return <View style={[styles.container, { paddingTop: insets.top }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
```

- [ ] **Step 4: Update root layout providers and redirects**

In `app/_layout.tsx`:

- Import `CookbookProvider`.
- Remove old top-level providers for meals, meal planner, shopping list, and recipe store.
- Change authenticated redirect target from `/(tabs)` to `/(book)`.
- Change group check from `(tabs)` to `(book)`.
- Add `<Stack.Screen name="(book)" options={{ headerShown: false }} />`.

The provider return should become:

```tsx
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
        <UserPreferencesProvider>
          <CookbookProvider>
            <ToastProvider>
              <GlobalErrorBoundary>
                <RootLayoutNav />
              </GlobalErrorBoundary>
            </ToastProvider>
          </CookbookProvider>
        </UserPreferencesProvider>
      </UserProfileProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx app/(book)/_layout.tsx app/(book)/index.tsx components/cookbook/EmptyBookState.tsx
git commit -m "feat: add book-first app shell"
```

---

## Task 6: Add Cookbook Style Onboarding

**Files:**

- Modify: `types/onboarding.ts`
- Modify: `utils/onboardingNavigation.ts`
- Modify: `utils/onboardingPersistence.ts`
- Create: `components/cookbook/CookbookStylePicker.tsx`
- Create: `app/(onboarding)/cookbook-style.tsx`

- [ ] **Step 1: Add onboarding type fields**

In `types/onboarding.ts`, add:

```ts
export interface CookbookStylePreference {
  name: string;
  prompt: string;
}
```

Add this field to `OnboardingData`:

```ts
cookbookStyle: CookbookStylePreference | null;
```

Set `defaultOnboardingData.cookbookStyle` to:

```ts
cookbookStyle: null,
```

- [ ] **Step 2: Add navigation step**

In `utils/onboardingNavigation.ts`, add `cookbook-style` to the step union, `ONBOARDING_STEPS`, and `STEP_ROUTES`:

```ts
'cookbook-style': '/(onboarding)/cookbook-style',
```

Set validation so the step requires `onboardingData.cookbookStyle`.

- [ ] **Step 3: Create style picker**

Create `components/cookbook/CookbookStylePicker.tsx`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Radii } from '@/constants/spacing';
import type { CookbookTheme } from '@/types/cookbook';

export const COOKBOOK_THEMES: CookbookTheme[] = [
  {
    name: 'Clean Editorial',
    prompt: 'clean editorial cookbook page, generous white space, refined serif title, realistic food photography',
  },
  {
    name: 'Warm Handwritten',
    prompt: 'warm handwritten family cookbook, cream paper, soft watercolor food illustration, cozy kitchen feeling',
  },
  {
    name: 'Modern Magazine',
    prompt: 'modern magazine recipe layout, crisp typography, polished food styling, high contrast sections',
  },
  {
    name: 'Vintage Recipe Book',
    prompt: 'vintage recipe book page, aged paper, nostalgic typography, gentle ink illustration',
  },
];

interface CookbookStylePickerProps {
  value: CookbookTheme | null;
  onChange: (theme: CookbookTheme) => void;
}

export function CookbookStylePicker({ value, onChange }: CookbookStylePickerProps) {
  return (
    <View style={styles.grid}>
      {COOKBOOK_THEMES.map((theme) => {
        const selected = value?.name === theme.name;
        return (
          <TouchableOpacity
            key={theme.name}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => onChange(theme)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${theme.name} cookbook style`}
          >
            <View style={styles.preview} />
            <Text style={styles.name}>{theme.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  preview: {
    height: 96,
    borderRadius: Radii.sm,
    backgroundColor: Colors.cardSecondary,
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Create onboarding screen**

Create `app/(onboarding)/cookbook-style.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, useOnboarding } from '@/components/onboarding';
import { CookbookStylePicker } from '@/components/cookbook/CookbookStylePicker';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { CookbookTheme } from '@/types/cookbook';

export default function CookbookStyleScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const selected = onboardingData.cookbookStyle as CookbookTheme | null;

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Choose your cookbook style</Text>
        <Text style={styles.subtitle}>Every recipe page will feel like it belongs in this book.</Text>
        <CookbookStylePicker
          value={selected}
          onChange={(theme) => updateOnboardingData('cookbookStyle', theme)}
        />
        <View style={styles.actions}>
          <OnboardingButton title="Back" variant="secondary" onPress={previousStep} />
          <OnboardingButton title="Continue" onPress={nextStep} disabled={!selected} />
        </View>
      </View>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  actions: {
    marginTop: 'auto',
    gap: Spacing.sm,
  },
});
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add types/onboarding.ts utils/onboardingNavigation.ts utils/onboardingPersistence.ts components/cookbook/CookbookStylePicker.tsx app/(onboarding)/cookbook-style.tsx
git commit -m "feat: add cookbook style onboarding"
```

---

## Task 7: Implement Book Reader and Table of Contents

**Files:**

- Create: `components/cookbook/PageCanvas.tsx`
- Create: `components/cookbook/PageControls.tsx`
- Create: `components/cookbook/BookReader.tsx`
- Create: `components/cookbook/TableOfContents.tsx`
- Modify: `app/(book)/index.tsx`
- Create: `app/(book)/toc.tsx`

- [ ] **Step 1: Create page canvas**

Create `components/cookbook/PageCanvas.tsx`:

```tsx
import React from 'react';
import { Image, View, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface PageCanvasProps {
  page: CookbookPage;
}

const width = Dimensions.get('window').width;
const pageWidth = Math.min(width - Spacing.lg * 2, 420);

export function PageCanvas({ page }: PageCanvasProps) {
  return (
    <View style={styles.frame}>
      {page.imageUrl ? (
        <Image source={{ uri: page.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{page.title}</Text>
          <Text style={styles.emptyStateText}>This page is waiting for its generated cookbook image.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: pageWidth,
    aspectRatio: 0.72,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyStateTitle: {
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Create page controls**

Create `components/cookbook/PageControls.tsx`:

```tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BookOpen, Plus, Share, Settings } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';

interface PageControlsProps {
  pageLabel: string;
  onToc: () => void;
  onAdd: () => void;
  onShare: () => void;
  onSettings: () => void;
}

export function PageControls({ pageLabel, onToc, onAdd, onShare, onSettings }: PageControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconButton} onPress={onToc} accessibilityLabel="Open table of contents">
        <BookOpen size={20} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.pageLabel}>{pageLabel}</Text>
      <TouchableOpacity style={styles.iconButton} onPress={onAdd} accessibilityLabel="Add page">
        <Plus size={20} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={onShare} accessibilityLabel="Share page">
        <Share size={20} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={onSettings} accessibilityLabel="Open settings">
        <Settings size={20} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLabel: {
    flex: 1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 3: Create book reader**

Create `components/cookbook/BookReader.tsx`:

```tsx
import React, { useRef } from 'react';
import { FlatList, View, StyleSheet, ListRenderItemInfo } from 'react-native';
import { router } from 'expo-router';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { PageControls } from '@/components/cookbook/PageControls';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface BookReaderProps {
  pages: CookbookPage[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
}

export function BookReader({ pages, selectedPageId, onSelectPage, onShare }: BookReaderProps) {
  const listRef = useRef<FlatList<CookbookPage>>(null);
  const selectedIndex = Math.max(0, pages.findIndex((page) => page.id === selectedPageId));
  const selectedPage = pages[selectedIndex] ?? pages[0];

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(page) => page.id}
        renderItem={({ item }: ListRenderItemInfo<CookbookPage>) => (
          <View style={styles.pageSlot}>
            <PageCanvas page={item} />
          </View>
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
          const page = pages[index];
          if (page) onSelectPage(page.id);
        }}
      />
      <View style={styles.controls}>
        <PageControls
          pageLabel={`Page ${selectedIndex + 1} of ${pages.length}`}
          onToc={() => router.push('/(book)/toc')}
          onAdd={() => router.push('/(book)/add')}
          onShare={() => selectedPage && onShare(selectedPage)}
          onSettings={() => router.push('/(book)/settings')}
        />
      </View>
      {selectedPage ? <NoshAssistantButton page={selectedPage} cookbookPages={pages} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  controls: {
    padding: Spacing.md,
  },
});
```

- [ ] **Step 4: Create temporary Nosh button stub**

Create `components/cookbook/NoshAssistantButton.tsx`:

```tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantButtonProps {
  page: CookbookPage;
}

export function NoshAssistantButton({ page }: NoshAssistantButtonProps) {
  return (
    <TouchableOpacity style={styles.button} accessibilityLabel={`Ask Nosh about ${page.title}`}>
      <ChefHat size={26} color={Colors.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
```

- [ ] **Step 5: Create table of contents component and screen**

Create `components/cookbook/TableOfContents.tsx` with grouped sections from `groupPagesBySection`, then create `app/(book)/toc.tsx` to call it and route back to `/(book)`.

Use this minimal component:

```tsx
import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { groupPagesBySection } from '@/utils/cookbook/sections';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { CookbookPageSummary } from '@/types/cookbook';

interface TableOfContentsProps {
  pages: CookbookPageSummary[];
  onSelectPage: (id: string) => void;
}

export function TableOfContents({ pages, onSelectPage }: TableOfContentsProps) {
  const sections = groupPagesBySection(pages);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Table of Contents</Text>
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.label}</Text>
          {section.pages.map((page) => (
            <TouchableOpacity key={page.id} style={styles.row} onPress={() => onSelectPage(page.id)}>
              <Text style={styles.rowTitle}>{page.title}</Text>
              <Text style={styles.rowPage}>{page.pageNumber}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  title: { fontSize: Typography.sizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.textSecondary, fontWeight: '700', marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  rowTitle: { color: Colors.text },
  rowPage: { color: Colors.textMuted },
});
```

- [ ] **Step 6: Wire book reader screen**

Modify `app/(book)/index.tsx` to render `BookReader` when pages exist and pass a temporary `onShare` that routes to export implementation in Task 12.

- [ ] **Step 7: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/cookbook/PageCanvas.tsx components/cookbook/PageControls.tsx components/cookbook/BookReader.tsx components/cookbook/TableOfContents.tsx components/cookbook/NoshAssistantButton.tsx app/(book)/index.tsx app/(book)/toc.tsx
git commit -m "feat: add cookbook reader and toc"
```

---

## Task 8: Implement Add Page Import and Review Flow

**Files:**

- Create: `hooks/useCookbookImport.ts`
- Create: `components/cookbook/AddPageComposer.tsx`
- Create: `components/cookbook/RecipeReviewForm.tsx`
- Modify: `app/(book)/add.tsx`
- Create: `app/(book)/review.tsx`

- [ ] **Step 1: Create import state hook**

Create `hooks/useCookbookImport.ts`:

```ts
import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';
import { parseRecipeSource } from '@/utils/cookbook/api';
import type { ParsedRecipeDraft } from '@/types/cookbook';

export const [CookbookImportProvider, useCookbookImport] = createContextHook(() => {
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);

  async function parseSource(payload: Record<string, unknown>) {
    setIsParsing(true);
    try {
      const result = await parseRecipeSource(payload);
      setDraft(result.recipe);
      setConfidence(result.confidence);
      setNeedsReview(result.needsReview);
      setReasons(result.reasons);
      return result;
    } finally {
      setIsParsing(false);
    }
  }

  return {
    draft,
    setDraft,
    isParsing,
    confidence,
    needsReview,
    reasons,
    parseSource,
  };
});
```

- [ ] **Step 2: Add provider to root**

Wrap `CookbookImportProvider` inside `CookbookProvider` in `app/_layout.tsx`.

- [ ] **Step 3: Create AddPageComposer**

Create `components/cookbook/AddPageComposer.tsx`:

```tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Link, Send } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';

type SubmitPayload =
  | { type: 'url'; input: string }
  | { type: 'text'; input: string }
  | { type: 'image'; imageBase64: string; input?: string };

interface AddPageComposerProps {
  isSubmitting?: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void> | void;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function AddPageComposer({ isSubmitting = false, onSubmit }: AddPageComposerProps) {
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
      allowsEditing: false,
    });

    const base64 = result.canceled ? null : result.assets?.[0]?.base64 ?? null;
    if (base64) setImageBase64(base64);
  }

  async function submit() {
    if (isSubmitting) return;
    const trimmed = input.trim();
    if (imageBase64) {
      await onSubmit({ type: 'image', imageBase64, input: trimmed || undefined });
      return;
    }
    if (!trimmed) return;
    await onSubmit({ type: looksLikeUrl(trimmed) ? 'url' : 'text', input: trimmed });
  }

  const canSubmit = Boolean(imageBase64 || input.trim()) && !isSubmitting;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a recipe page</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        multiline
        style={styles.input}
        placeholder="Paste a recipe link or recipe text"
        placeholderTextColor={Colors.textMuted}
        editable={!isSubmitting}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} disabled={isSubmitting}>
          <ImagePlus size={20} color={Colors.text} />
          <Text style={styles.secondaryText}>{imageBase64 ? 'Image attached' : 'Add image'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, !canSubmit && styles.disabled]} onPress={submit} disabled={!canSubmit}>
          {looksLikeUrl(input) && !imageBase64 ? <Link size={18} color={Colors.onPrimary} /> : <Send size={18} color={Colors.onPrimary} />}
          <Text style={styles.primaryText}>{isSubmitting ? 'Reading' : 'Review recipe'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700', marginBottom: Spacing.md },
  input: {
    minHeight: 220,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  actions: { marginTop: Spacing.lg, gap: Spacing.md },
  secondaryButton: {
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryText: { color: Colors.text, fontWeight: '600' },
  primaryButton: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryText: { color: Colors.onPrimary, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
```

- [ ] **Step 4: Create add screen**

Create `app/(book)/add.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AddPageComposer } from '@/components/cookbook/AddPageComposer';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { Colors } from '@/constants/colors';

export default function AddPageScreen() {
  const { parseSource } = useCookbookImport();

  return (
    <View style={styles.container}>
      <AddPageComposer
        onSubmit={async (payload) => {
          const result = await parseSource(payload);
          router.push(result.needsReview ? '/(book)/review' : '/(book)/review');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
```

Both high-confidence and low-confidence imports go through review in the first implementation so users can see the parsed recipe before credits are spent. Auto-generation can be enabled after the review and generation flow is stable.

- [ ] **Step 5: Create review form**

Create `components/cookbook/RecipeReviewForm.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';
import type { ParsedRecipeDraft, StructuredRecipe } from '@/types/cookbook';

interface RecipeReviewFormProps {
  draft: ParsedRecipeDraft;
  isGenerating?: boolean;
  onGenerate: (recipe: StructuredRecipe) => Promise<void> | void;
}

export function RecipeReviewForm({ draft, isGenerating = false, onGenerate }: RecipeReviewFormProps) {
  const [title, setTitle] = useState(draft.title);
  const [servings, setServings] = useState(String(draft.servings ?? 4));
  const [ingredients, setIngredients] = useState(
    draft.ingredients.map((ingredient) => [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ')).join('\n'),
  );
  const [steps, setSteps] = useState(draft.steps.join('\n'));

  const canGenerate = useMemo(
    () => title.trim().length > 0 && ingredients.trim().length > 0 && steps.trim().length > 0 && !isGenerating,
    [title, ingredients, steps, isGenerating],
  );

  async function submit() {
    if (!canGenerate) return;
    await onGenerate({
      ...draft,
      title: title.trim(),
      servings: Number(servings) || 4,
      ingredients: ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ name: line })),
      steps: steps.split('\n').map((line) => line.trim()).filter(Boolean),
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review before spending a credit</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Recipe title" placeholderTextColor={Colors.textMuted} />
      <TextInput style={styles.input} value={servings} onChangeText={setServings} keyboardType="number-pad" placeholder="Servings" placeholderTextColor={Colors.textMuted} />
      <TextInput style={[styles.input, styles.block]} value={ingredients} onChangeText={setIngredients} multiline placeholder="Ingredients, one per line" placeholderTextColor={Colors.textMuted} />
      <TextInput style={[styles.input, styles.block]} value={steps} onChangeText={setSteps} multiline placeholder="Directions, one per line" placeholderTextColor={Colors.textMuted} />
      <TouchableOpacity style={[styles.button, !canGenerate && styles.disabled]} disabled={!canGenerate} onPress={submit}>
        <Text style={styles.buttonText}>{isGenerating ? 'Generating' : 'Generate page - 1 credit'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  input: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: Spacing.md,
  },
  block: { minHeight: 120, textAlignVertical: 'top' },
  button: { height: 52, borderRadius: Radii.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: Colors.onPrimary, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
```

- [ ] **Step 6: Create review screen**

Create `app/(book)/review.tsx` that reads `draft` from `useCookbookImport`, renders `RecipeReviewForm`, redirects to `/(book)/add` if there is no draft, and calls `generateCookbookPage` after the user taps `Generate page - 1 credit`.

- [ ] **Step 7: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add hooks/useCookbookImport.ts components/cookbook/AddPageComposer.tsx components/cookbook/RecipeReviewForm.tsx app/(book)/add.tsx app/(book)/review.tsx app/_layout.tsx
git commit -m "feat: add cookbook import review flow"
```

---

## Task 9: Implement Parser Edge Function

**Files:**

- Create: `supabase/functions/parse-recipe-source/index.ts`
- Modify: `utils/cookbook/api.ts` if response mapping needs adjustment.

- [ ] **Step 1: Create parse function**

Create `supabase/functions/parse-recipe-source/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

type SourceType = 'url' | 'text' | 'image';

interface RequestBody {
  type: SourceType;
  input?: string;
  imageBase64?: string;
}

function basicTextRecipe(input: string, sourceType: SourceType, sourceUrl?: string) {
  const lines = input.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = lines[0] || 'Imported Recipe';
  const ingredients = lines
    .filter((line) => /^[-*]?\s*\d|cup|tbsp|tsp|gram|g |oz|egg|salt|flour/i.test(line))
    .slice(0, 20)
    .map((line) => ({ name: line.replace(/^[-*]\s*/, '') }));
  const steps = lines
    .filter((line) => /bake|cook|mix|stir|boil|chop|serve|heat|add/i.test(line))
    .slice(0, 12);

  return {
    title,
    ingredients,
    steps,
    servings: 4,
    sourceType,
    sourceUrl,
  };
}

function confidenceFor(recipe: { title: string; ingredients: unknown[]; steps: unknown[] }) {
  const reasons: string[] = [];
  let confidence = 0.2;
  if (recipe.title) confidence += 0.2;
  if (recipe.ingredients.length >= 3) confidence += 0.3;
  else reasons.push('Too few ingredients');
  if (recipe.steps.length >= 2) confidence += 0.3;
  else reasons.push('Missing directions');
  confidence = Math.min(1, Math.round(confidence * 100) / 100);
  return { confidence, needsReview: confidence < 0.75, reasons };
}

async function textFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8' },
  });
  if (!res.ok) throw new Error(`URL fetch failed (${res.status})`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parseImageRecipe(req: Request, imageBase64: string) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/parse-image-recipe`, {
    method: 'POST',
    headers: {
      authorization: req.headers.get('authorization') ?? '',
      apikey: req.headers.get('apikey') ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Image parser failed (${res.status})`);
  }

  const recipe = data.recipe ?? {};
  return {
    title: recipe.title ?? 'Imported Recipe',
    description: recipe.description ?? '',
    servings: Number(recipe.servings) || 4,
    prepTime: Number(recipe.prepTime) || 0,
    cookTime: Number(recipe.cookTime) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    sourceType: 'image' as const,
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    category: recipe.category ?? 'favorites',
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.type) return jsonError('Missing source type', 400, req);

    if (body.type === 'image') {
      if (!body.imageBase64) return jsonError('Missing imageBase64', 400, req);
      const parsed = await parseImageRecipe(req, body.imageBase64);
      const confidence = confidenceFor(parsed);
      return jsonResponse({ recipe: parsed, ...confidence }, 200, req);
    }

    if (!body.input?.trim()) return jsonError('Missing input', 400, req);

    const sourceText = body.type === 'url' ? await textFromUrl(body.input) : body.input;
    const parsed = basicTextRecipe(sourceText, body.type, body.type === 'url' ? body.input : undefined);
    const confidence = confidenceFor(parsed);

    return jsonResponse({
      recipe: {
        ...parsed,
        sourceType: body.type,
        tags: [],
        category: 'favorites',
      },
      ...confidence,
    }, 200, req);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Parse failed', 500, req);
  }
});
```

This first version supports URL, text, image, and video sources. URL import fetches server-side HTML and sends the page text to OpenRouter for structured parsing. Image and video imports use OpenRouter multimodal content first, then fall back to the existing authenticated dedicated media parsers if a provider rejects the payload.

- [ ] **Step 2: Deno check**

Run:

```bash
deno check supabase/functions/parse-recipe-source/index.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/parse-recipe-source/index.ts
git commit -m "feat: add recipe source parser function"
```

---

## Task 10: Implement Generation and Credit Flow

**Files:**

- Create: `supabase/functions/credits/index.ts`
- Create: `supabase/functions/generate-cookbook-page/index.ts`
- Create: `components/cookbook/GenerationResult.tsx`
- Create: `app/(book)/generation/[pageId].tsx`
- Create: `utils/cookbook/share.ts`
- Modify: `utils/cookbook/api.ts`
- Modify: `app/(book)/review.tsx`

- [ ] **Step 1: Create credits function**

Create `supabase/functions/credits/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await admin
    .schema('nutriai')
    .from('credit_ledger')
    .select('amount')
    .eq('user_id', user!.id);

  if (error) return jsonError(error.message, 500, req);
  const balance = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  return jsonResponse({ balance }, 200, req);
});
```

- [ ] **Step 2: Create generation function**

Create `supabase/functions/generate-cookbook-page/index.ts` with authenticated input, credit balance check, real OpenAI image generation, Supabase Storage upload, recipe/page insert, page version insert, and credit ledger spend. The OpenAI image guide was checked on 2026-05-03; use the Image API `/v1/images/generations` with `gpt-image-2`, which returns base64 image data in `data[0].b64_json`.

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-2';
const BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64.replace(/^data:[^;]+;base64,/, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function promptFromPayload(promptPayload: any): string {
  const recipe = promptPayload.recipe ?? {};
  return [
    promptPayload.instructions,
    '',
    `Title: ${recipe.title}`,
    `Servings: ${recipe.servings ?? 'not specified'}`,
    `Prep time: ${recipe.prepTime ?? 0} minutes`,
    `Cook time: ${recipe.cookTime ?? 0} minutes`,
    'Ingredients:',
    ...(recipe.ingredients ?? []).map((item: string) => `- ${item}`),
    'Directions:',
    ...(recipe.steps ?? []).map((step: string, index: number) => `${index + 1}. ${step}`),
    '',
    'Design requirements: portrait cookbook page, readable text, no invented ingredients, no invented directions.',
  ].join('\n');
}

async function generateImage(prompt: string): Promise<Uint8Array> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI image generation is not configured.');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: '1024x1536',
      quality: 'medium',
      output_format: 'png',
      moderation: 'auto',
      n: 1,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : `OpenAI image error (${res.status})`;
    throw new Error(message);
  }

  const b64 = data?.data?.[0]?.b64_json;
  if (typeof b64 !== 'string') throw new Error('OpenAI image response did not include b64_json.');
  return base64ToBytes(b64);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { cookbookId, pageId, recipe, promptPayload } = body;
    if (!cookbookId || !recipe || !promptPayload) {
      return jsonError('Missing cookbookId, recipe, or promptPayload', 400, req);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: cookbookRow, error: cookbookError } = await admin
      .schema('nutriai')
      .from('cookbooks')
      .select('id')
      .eq('id', cookbookId)
      .eq('user_id', user!.id)
      .single();

    if (cookbookError || !cookbookRow) return jsonError('Cookbook not found', 404, req);

    const { data: credits, error: creditsError } = await admin
      .schema('nutriai')
      .from('credit_ledger')
      .select('amount')
      .eq('user_id', user!.id);

    if (creditsError) return jsonError(creditsError.message, 500, req);
    const balance = (credits ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    if (balance < 1) return jsonError('Not enough credits', 402, req);

    const prompt = promptFromPayload(promptPayload);
    let imageBytes: Uint8Array;
    try {
      imageBytes = await generateImage(prompt);
    } catch (generationError) {
      return jsonError(generationError instanceof Error ? generationError.message : 'Image generation failed', 502, req);
    }

    const storagePath = `${user!.id}/${crypto.randomUUID()}.png`;
    const upload = await admin.storage.from(BUCKET).upload(storagePath, imageBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    if (upload.error) return jsonError(upload.error.message, 500, req);
    const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

    let recipeRow: any;
    let pageRow: any;
    let pageNumber: number;

    if (pageId) {
      const { data: existingPage, error: existingPageError } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .select('*, recipes(*)')
        .eq('id', pageId)
        .eq('cookbook_id', cookbookId)
        .single();

      if (existingPageError || !existingPage) return jsonError('Page not found', 404, req);
      recipeRow = existingPage.recipes;
      pageRow = existingPage;
      pageNumber = existingPage.page_number;
    } else {
      const { data: insertedRecipe, error: recipeError } = await admin
        .schema('nutriai')
        .from('recipes')
        .insert({
          user_id: user!.id,
          title: recipe.title,
          description: recipe.description ?? null,
          servings: recipe.servings ?? null,
          prep_time: recipe.prepTime ?? null,
          cook_time: recipe.cookTime ?? null,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          source_type: recipe.sourceType,
          source_url: recipe.sourceUrl ?? null,
          tags: recipe.tags ?? [],
          category: recipe.category ?? 'favorites',
          confidence: recipe.confidence ?? 1,
        })
        .select('*')
        .single();

      if (recipeError) return jsonError(recipeError.message, 500, req);
      recipeRow = insertedRecipe;

      const { count } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .select('id', { count: 'exact', head: true })
        .eq('cookbook_id', cookbookId);

      pageNumber = (count ?? 0) + 1;

      const { data: insertedPage, error: pageError } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .insert({
          cookbook_id: cookbookId,
          recipe_id: recipeRow.id,
          page_number: pageNumber,
          section: recipe.category ?? 'favorites',
          sort_order: pageNumber,
        })
        .select('*')
        .single();

      if (pageError) return jsonError(pageError.message, 500, req);
      pageRow = insertedPage;
    }

    const { data: versionRow, error: versionError } = await admin
      .schema('nutriai')
      .from('page_versions')
      .insert({
        page_id: pageRow.id,
        image_url: publicUrl.publicUrl,
        storage_path: storagePath,
        prompt_payload: promptPayload,
        model: OPENAI_IMAGE_MODEL,
        status: 'ready',
        credit_cost: 1,
      })
      .select('*')
      .single();

    if (versionError) return jsonError(versionError.message, 500, req);

    await admin
      .schema('nutriai')
      .from('cookbook_pages')
      .update({ selected_version_id: versionRow.id })
      .eq('id', pageRow.id);

    await admin
      .schema('nutriai')
      .from('credit_ledger')
      .insert({
        user_id: user!.id,
        event_type: 'generation_spend',
        amount: -1,
        related_page_version_id: versionRow.id,
      });

    return jsonResponse({
      id: pageRow.id,
      cookbookId,
      recipeId: recipeRow.id,
      title: recipeRow.title,
      section: pageRow.section,
      pageNumber,
      sortOrder: pageRow.sort_order,
      selectedVersionId: versionRow.id,
      imageUrl: publicUrl.publicUrl,
    }, 200, req);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Generation failed', 500, req);
  }
});
```

- [ ] **Step 3: Wire review screen to generation**

In `app/(book)/review.tsx`, call `generateCookbookPage` with `cookbook.id`, edited recipe, and `buildCookbookPagePromptPayload`. After success, refresh cookbook and route to `/(book)/generation/${page.id}`. If the function returns an OpenAI/provider/storage error, keep the user on the review screen and show the error without decrementing local credit UI.

- [ ] **Step 4: Create generation result UI**

Create `components/cookbook/GenerationResult.tsx` with generated image preview, Keep, Regenerate, Export, and Ask Nosh controls. Regenerate must call the same generation endpoint with `pageId` so it creates a new page version, selects it, and spends one credit only after the new image is generated and uploaded.

```tsx
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { RefreshCw, Share2 } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface GenerationResultProps {
  page: CookbookPage;
  cookbookPages: CookbookPage[];
  isRegenerating?: boolean;
  onKeep: () => void;
  onRegenerate: () => void;
  onExport: () => void;
}

export function GenerationResult({
  page,
  cookbookPages,
  isRegenerating = false,
  onKeep,
  onRegenerate,
  onExport,
}: GenerationResultProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{page.title}</Text>
      {page.imageUrl ? <Image source={{ uri: page.imageUrl }} style={styles.image} resizeMode="contain" /> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={onKeep}>
          <Text style={styles.primaryText}>Keep page</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onRegenerate} disabled={isRegenerating}>
          <RefreshCw size={18} color={Colors.text} />
          <Text style={styles.secondaryText}>{isRegenerating ? 'Regenerating' : 'Regenerate - 1 credit'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onExport}>
          <Share2 size={18} color={Colors.text} />
          <Text style={styles.secondaryText}>Export image</Text>
        </TouchableOpacity>
      </View>
      <NoshAssistantButton page={page} cookbookPages={cookbookPages} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700', marginBottom: Spacing.md },
  image: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  actions: { gap: Spacing.sm },
  primary: { height: 52, borderRadius: Radii.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: Colors.onPrimary, fontWeight: '700' },
  secondary: {
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryText: { color: Colors.text, fontWeight: '600' },
});
```

- [ ] **Step 5: Create share helper**

Create `utils/cookbook/share.ts`:

```ts
import { Share } from 'react-native';
import type { CookbookPage } from '@/types/cookbook';

export async function shareCookbookPage(page: CookbookPage): Promise<void> {
  if (!page.imageUrl) {
    throw new Error('This page does not have an image to share yet.');
  }

  await Share.share({
    title: page.title,
    message: `${page.title}\n${page.imageUrl}`,
    url: page.imageUrl,
  });
}
```

- [ ] **Step 6: Create generation route**

Create `app/(book)/generation/[pageId].tsx` that finds page from `useCookbook().pages`, builds a prompt from `page.recipe` and `cookbook.theme`, calls `generateCookbookPage({ cookbookId: cookbook.id, pageId: page.id, recipe: page.recipe, promptPayload })` for regeneration, invalidates cookbook/credit queries, calls `shareCookbookPage(page)` for export, and routes to `/(book)` for Keep.

- [ ] **Step 7: Verify**

Run:

```bash
deno check supabase/functions/credits/index.ts
deno check supabase/functions/generate-cookbook-page/index.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/credits/index.ts supabase/functions/generate-cookbook-page/index.ts components/cookbook/GenerationResult.tsx app/(book)/generation/[pageId].tsx app/(book)/review.tsx utils/cookbook/api.ts utils/cookbook/share.ts
git commit -m "feat: add cookbook page generation flow"
```

---

## Task 11: Implement Nosh Assistant Sheet

**Files:**

- Create: `hooks/useNoshAssistant.ts`
- Create: `components/cookbook/NoshAssistantSheet.tsx`
- Modify: `components/cookbook/NoshAssistantButton.tsx`
- Use: `supabase/functions/ai-chat/index.ts`

- [ ] **Step 1: Use the existing assistant function**

Use the existing authenticated `supabase/functions/ai-chat/index.ts` function. The client hook should provide cookbook-specific system context so Nosh answers as the chef assistant inside the user's book:

```ts
const ASSISTANT_SYSTEM_PROMPT = `
You are Nosh, an AI chef assistant who lives inside the user's personal recipe e-book.
Help the user cook from their cookbook.
Use the current page and structured recipe context when available.
Answer clearly, warmly, and practically.
Do not claim you changed the generated image page unless a tool result says that happened.
`;
```

The endpoint should accept:

```ts
{
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: unknown }>;
  context?: {
    currentPage?: unknown;
    cookbookPages?: Array<{ title: string; section: string }>;
    profile?: unknown;
  };
}
```

- [ ] **Step 2: Deno check**

Run:

```bash
deno check supabase/functions/ai-chat/index.ts
```

Expected: PASS.

- [ ] **Step 3: Create assistant hook**

Create `hooks/useNoshAssistant.ts`:

```ts
import { useState } from 'react';
import { createChatCompletion } from '@/utils/aiClient';
import type { CookbookPage } from '@/types/cookbook';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function useNoshAssistant(page: CookbookPage | null, cookbookPages: CookbookPage[]) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  async function send(content: string) {
    const userMessage: AssistantMessage = { id: `${Date.now()}-u`, role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    try {
      const reply = await createChatCompletion([
        { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ question: content, currentPage: page, cookbookPages }) },
      ]);
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply }]);
    } finally {
      setIsSending(false);
    }
  }

  return { messages, isSending, send };
}
```

- [ ] **Step 4: Create sheet UI**

Create `components/cookbook/NoshAssistantSheet.tsx`:

```tsx
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { useNoshAssistant } from '@/hooks/useNoshAssistant';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantSheetProps {
  page: CookbookPage;
  cookbookPages: CookbookPage[];
  onClose: () => void;
}

export function NoshAssistantSheet({ page, cookbookPages, onClose }: NoshAssistantSheetProps) {
  const [input, setInput] = useState('');
  const { messages, isSending, send } = useNoshAssistant(page, cookbookPages);

  async function submit() {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await send(text);
  }

  return (
    <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Ask Nosh</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>Done</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ask about substitutions, quantities, prep, timing, or shopping lists for {page.title}.</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={styles.input}
          placeholder="Ask about this recipe"
          placeholderTextColor={Colors.textMuted}
          editable={!isSending}
        />
        <TouchableOpacity style={styles.send} onPress={submit} disabled={!input.trim() || isSending}>
          <Send size={18} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  title: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  close: { color: Colors.primary, fontWeight: '700' },
  messages: { padding: Spacing.lg, gap: Spacing.sm },
  bubble: { maxWidth: '86%', borderRadius: Radii.md, padding: Spacing.md },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface },
  messageText: { color: Colors.text },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, borderRadius: Radii.md, backgroundColor: Colors.surface, color: Colors.text, paddingHorizontal: Spacing.md },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
});
```

- [ ] **Step 5: Wire button to sheet**

Modify `components/cookbook/NoshAssistantButton.tsx` to accept `cookbookPages`, open a `Modal`, and render the sheet:

```tsx
import React, { useState } from 'react';
import { Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { NoshAssistantSheet } from '@/components/cookbook/NoshAssistantSheet';
import { Colors } from '@/constants/colors';
import type { CookbookPage } from '@/types/cookbook';

interface NoshAssistantButtonProps {
  page: CookbookPage;
  cookbookPages: CookbookPage[];
}

export function NoshAssistantButton({ page, cookbookPages }: NoshAssistantButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} accessibilityLabel={`Ask Nosh about ${page.title}`}>
        <ChefHat size={26} color={Colors.onPrimary} />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <NoshAssistantSheet page={page} cookbookPages={cookbookPages} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
```

Update `components/cookbook/BookReader.tsx` so the existing assistant button call becomes:

```tsx
{selectedPage ? <NoshAssistantButton page={selectedPage} cookbookPages={pages} /> : null}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/useNoshAssistant.ts components/cookbook/NoshAssistantSheet.tsx components/cookbook/NoshAssistantButton.tsx
git commit -m "feat: add contextual nosh assistant"
```

---

## Task 12: Implement Export/Share and Settings

**Files:**

- Modify: `components/cookbook/BookReader.tsx`
- Create: `app/(book)/settings.tsx`
- Modify: `components/profile/EnhancedProfileScreen.tsx` only if reused.

- [ ] **Step 1: Confirm share helper is available**

Confirm `utils/cookbook/share.ts` exists from Task 10 and exports `shareCookbookPage(page)`.

- [ ] **Step 2: Wire reader share action**

In `app/(book)/index.tsx`, pass:

```ts
onShare={(page) => shareCookbookPage(page).catch(() => {})}
```

- [ ] **Step 3: Create settings screen**

Create `app/(book)/settings.tsx`:

```tsx
import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { useCookbook } from '@/hooks/useCookbook';
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';

export default function CookbookSettingsScreen() {
  const { signOut } = useAuth();
  const { cookbook, creditBalance } = useCookbook();

  async function deleteAccount() {
    await callAuthenticatedFunction('delete-account', {});
    await signOut();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cookbook Settings</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Cookbook style</Text>
        <Text style={styles.value}>{cookbook?.theme.name ?? 'Clean Editorial'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Credits</Text>
        <Text style={styles.value}>{creditBalance?.balance ?? 0}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/(book)/add')}>
        <Text style={styles.buttonText}>Add recipe page</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonSecondary} onPress={signOut}>
        <Text style={styles.buttonSecondaryText}>Sign out</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.danger}
        onPress={() => {
          Alert.alert(
            'Delete account',
            'This permanently deletes your account and cookbook data.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteAccount().catch((err) => Alert.alert('Could not delete account', err instanceof Error ? err.message : 'Try again.')) },
            ],
          );
        }}
      >
        <Text style={styles.dangerText}>Delete account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  title: { color: Colors.text, fontSize: 26, fontWeight: '700', marginBottom: Spacing.md },
  row: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  label: { color: Colors.textSecondary },
  value: { color: Colors.text, fontWeight: '700' },
  button: { height: 52, borderRadius: Radii.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: Colors.onPrimary, fontWeight: '700' },
  buttonSecondary: { height: 52, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  buttonSecondaryText: { color: Colors.text, fontWeight: '700' },
  danger: { paddingVertical: Spacing.md },
  dangerText: { color: Colors.error, fontWeight: '700' },
});
```

The account deletion action must always stay behind the destructive `Alert` confirmation and call the authenticated `delete-account` Edge Function.

- [ ] **Step 4: Verify**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(book)/index.tsx app/(book)/settings.tsx
git commit -m "feat: add cookbook sharing and settings"
```

---

## Task 13: Remove Old Tab Shell From Active Product

**Files:**

- Modify: `app/_layout.tsx`
- Leave: `app/(tabs)/*` until final cleanup branch decision.
- Modify: `docs/PRE-LAUNCH-CHECKLIST.md`

- [ ] **Step 1: Confirm no redirects to `(tabs)`**

Run:

```bash
rg -n "\\(tabs\\)|/\\(tabs\\)" app hooks components utils
```

Expected: no active redirect in `app/_layout.tsx`. Old tab files may still contain route names.

- [ ] **Step 2: Update pre-launch checklist**

Modify `docs/PRE-LAUNCH-CHECKLIST.md` to add cookbook reset blockers:

```md
- [ ] Test cookbook style onboarding
- [ ] Test URL/text/image/video import into generated cookbook page
- [ ] Test credit spend for generation and regeneration
- [ ] Test Nosh assistant on current page context
- [ ] Test export/share generated image
```

- [ ] **Step 3: Run verification**

Run:

```bash
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

Expected: PASS for all commands.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx docs/PRE-LAUNCH-CHECKLIST.md
git commit -m "chore: finalize cookbook reset shell"
```

---

## Task 14: Manual App Verification

**Files:**

- No planned file changes.

- [ ] **Step 1: Start web preview**

Run:

```bash
EXPO_NO_BROWSER=1 npx expo start --web --port 8081
```

Expected: Metro reports `Web is waiting on http://localhost:8081`.

- [ ] **Step 2: Browser smoke test**

Open `http://localhost:8081` in the Codex browser.

Verify:

- Auth/onboarding routes load.
- Authenticated user lands in `/(book)`.
- Empty cookbook state appears if no pages exist.
- Add Page opens.
- Review screen accepts parsed data.
- Generation result creates a page.
- Reader can navigate pages.
- TOC opens and jumps to a page.
- Nosh assistant sheet opens.
- Settings opens.

- [ ] **Step 3: Native iOS smoke test**

Run:

```bash
npx expo start
```

Open the dev build on device or simulator.

Verify the same flows as web, with emphasis on:

- Image picker permission.
- Native share sheet.
- Keyboard behavior in review and assistant sheets.

- [ ] **Step 4: Final verification commands**

Run:

```bash
npm run typecheck
npm test -- --runInBand
npx expo-doctor
deno check supabase/functions/parse-recipe-source/index.ts
deno check supabase/functions/generate-cookbook-page/index.ts
deno check supabase/functions/ai-chat/index.ts
deno check supabase/functions/credits/index.ts
```

Expected: PASS for all commands.

- [ ] **Step 5: Commit verification notes if docs changed**

If verification notes are added to docs:

```bash
git add docs/PRE-LAUNCH-CHECKLIST.md
git commit -m "docs: record cookbook reset verification"
```

---

## Self-Review Checklist

- Spec coverage: The plan covers product positioning, cookbook style onboarding, generated fixed image pages, structured recipe data, e-book reader navigation, table of contents, Nosh assistant context, Supabase data model, credits, export/share, and the clean reset inside the existing repo.
- Scope control: Public platform features, multiple cookbooks, PDF export, subscription purchase flow, audio-file import, and multi-page spreads are excluded from this first implementation.
- Type consistency: Client types use `Cookbook`, `StructuredRecipe`, `CookbookPage`, `PageVersion`, `CreditBalance`, and `ParsedRecipeDraft` consistently across tasks.
- Verification: Each implementation task includes `npm run typecheck`, Jest, Deno checks, Expo Doctor, or manual browser/native verification.
- Commit cadence: Each task ends with a focused commit.
