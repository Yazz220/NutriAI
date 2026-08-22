# Nosh Codebase Cleanup Implementation Plan

> Superseded implementation plan. Do not execute its tasks. Current product and pipeline boundaries live in `docs/PRODUCT_FLOW.md` and `docs/ARCHITECTURE.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current Nosh codebase into a clean, production-ready, book-first shape by removing legacy product drift, fixing launch blockers, and simplifying the UI/developer architecture.

**Architecture:** Preserve the current book-first route model: shelf -> book reader -> add/review/generation -> assistant. Keep three product domains only: cookbooks, recipe import, and assistant. Remove nutrition/dashboard/meal-planning artifacts unless a live file imports them.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, TypeScript strict, Supabase Edge Functions, TanStack React Query, AsyncStorage, Jest, ESLint.

---

## Current Baseline

Run these commands before starting:

```bash
npm run typecheck
npm test -- --runInBand
npx expo-doctor
npm run lint
```

Expected current state:

- `npm run typecheck`: passes.
- `npm test -- --runInBand`: passes 4 suites / 9 tests.
- `npx expo-doctor`: passes 17/17 checks.
- `npm run lint`: fails with React hook lint errors, stale unused imports, and a few real cleanup issues.

Do not change product scope while executing this plan. Nosh remains a personal digital cookbook with an embedded chef assistant. Do not reintroduce tabs, calorie tracking, food logging, nutrition dashboards, inventory, or top-level shopping/planning screens.

---

## File Ownership Map

### App Shell And Routing

- `app/_layout.tsx`: auth guard, providers, splash/font loading, offline banner.
- `app/(auth)/*`: public auth surfaces.
- `app/(book)/*`: authenticated book surface.
- `app/(book)/[cookbookId]/*`: active cookbook reader, import, review, generation flow.

### Product Domains

- `hooks/useCookbooks.ts`: shelf state and credit balance.
- `hooks/useCookbook.ts`: one active cookbook plus pages.
- `hooks/useCookbookImport.ts`: parse-source state.
- `hooks/useNoshAssistant.ts`: in-book assistant state and prompt context.
- `utils/cookbook/*`: cookbook API, cache, prompt, sections, sharing, fixtures.
- `types/cookbook.ts`: canonical cookbook domain types.

### UI

- `components/cookbook/*`: current product UI.
- `components/ui/Text.tsx`: shared text primitive.
- `components/ui/OfflineBanner.tsx`, `components/ui/GlobalErrorBoundary.tsx`: shell utilities.
- Other `components/ui/*`: legacy or underused primitives to review/delete/refactor.

### Backend

- `supabase/functions/parse-recipe-source/index.ts`: URL/text/image/video parsing orchestrator.
- `supabase/functions/parse-image-recipe/index.ts`: direct image parser.
- `supabase/functions/parse-video-recipe/index.ts`: direct video parser.
- `supabase/functions/generate-cookbook-page/index.ts`: page image generation and credit spend.
- `supabase/functions/delete-account/index.ts`: account deletion.
- `supabase/sql/*`: setup and migration SQL.

---

## Phase 0: Branch And Guardrails

### Task 0.1: Create A Cleanup Branch

**Files:** none

- [ ] **Step 1: Check worktree state**

```bash
git status --short
```

Expected: review existing modified/deleted files before touching anything. Do not revert unrelated user changes.

- [ ] **Step 2: Create a branch**

```bash
git switch -c codex/nosh-codebase-cleanup
```

Expected: branch created.

- [ ] **Step 3: Commit only after each completed phase**

Use these commit boundaries:

```bash
git commit -m "chore: repair cleanup guardrails"
git commit -m "fix: harden recipe import edge functions"
git commit -m "docs: align cookbook architecture docs"
git commit -m "chore: remove legacy nutrition app artifacts"
git commit -m "refactor: simplify shared ui primitives"
git commit -m "polish: align cookbook reader and review ux"
git commit -m "fix: complete account lifecycle flows"
git commit -m "ci: enforce lint in project checks"
```

---

## Phase 1: Production Blockers

### Task 1.1: Make Lint A Real Passing Gate

**Files:**

- Modify: `.eslintrc.js`
- Modify: `.github/workflows/ci.yml`
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/_layout.tsx`
- Modify: `components/cookbook/BookReader.tsx`
- Modify: `components/cookbook/BookTableOfContentsPage.tsx`
- Modify: `components/cookbook/ExtractingRecipeStages.tsx`
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/Toast.tsx`
- Modify/delete after usage review: `components/ui/Card.tsx`, `components/ui/Input.tsx`, `components/ui/IconButtonSquare.tsx`, `components/ui/Rule.tsx`, `components/ui/Modal.tsx`, `components/ui/ScreenHeader.tsx`

- [ ] **Step 1: Record current lint failure**

```bash
npm run lint
```

Expected: fails. Keep the output in the implementation notes for comparison.

- [ ] **Step 2: Decide lint policy for React compiler-adjacent rules**

In `.eslintrc.js`, keep `react-hooks/rules-of-hooks` as `error` and `react-hooks/exhaustive-deps` as `warn`. Add explicit policy for the new strict React hook rules that are currently blocking normal React Native patterns.

Use this rule block:

```js
rules: {
  'react/react-in-jsx-scope': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'react-hooks/refs': 'off',
  'react-hooks/set-state-in-effect': 'off',
},
```

Reason: this repo is not using React Compiler as a production gate. These rules currently produce noisy failures for `Animated.Value`, `PanResponder`, and state synchronization patterns. Keep real hook rules active.

- [ ] **Step 3: Fix real lint issues in auth**

In `app/(auth)/sign-in.tsx`, remove the unused `session` destructure and replace the empty catch.

Change:

```ts
const { session } = useAuth();
```

to:

```ts
useAuth();
```

Change:

```ts
try { await supabase.auth.signOut(); } catch {}
```

to:

```ts
try {
  await supabase.auth.signOut();
} catch {
  // Ignore stale local sessions before password sign-in.
}
```

- [ ] **Step 4: Fix unescaped copy lint**

In `components/cookbook/BookTableOfContentsPage.tsx`, replace the apostrophe in JSX text with a plain string expression.

Change:

```tsx
{pages.length === 1 ? '1 page' : `${pages.length} pages`} organized from this book's recipes.
```

to:

```tsx
{`${pages.length === 1 ? '1 page' : `${pages.length} pages`} organized from this book's recipes.`}
```

In `components/ui/ErrorBoundary.tsx`, replace any `Don't` JSX text with `Do not` or a string expression.

- [ ] **Step 5: Remove unused imports and unused locals**

Run:

```bash
npm run lint
```

For each `@typescript-eslint/no-unused-vars` warning, either remove the symbol or prefix it with `_` only when it is part of a required signature.

Known removals from audit:

- `Shadows` from `components/ui/Button.tsx`
- `Colors` and `Radii` from `components/ui/Card.tsx` if the component remains
- `LegacyType` and `Shadows` from `components/ui/Input.tsx`
- `Spacing` from `constants/tokens.ts`
- `Platform` from `constants/typography.ts`
- `width` from `components/ui/Toast.tsx`

- [ ] **Step 6: Fix `Toast` function ordering**

In `components/ui/Toast.tsx`, define `hideToast` with `useCallback` before it is used in `useEffect`.

Use this shape:

```tsx
const hideToast = React.useCallback(() => {
  Animated.parallel([
    Animated.timing(translateY, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start(() => {
    onHide();
  });
}, [onHide, opacity, translateY]);

useEffect(() => {
  if (!visible) return;
  Animated.parallel([
    Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
  ]).start();

  const timer = setTimeout(hideToast, duration);
  return () => clearTimeout(timer);
}, [duration, hideToast, opacity, translateY, visible]);
```

- [ ] **Step 7: Simplify `Button` animation**

If `components/ui/Button.tsx` remains, replace the `useRef(new Animated.Value(1)).current` pattern with `useState`.

Use:

```tsx
const [scaleAnim] = React.useState(() => new Animated.Value(1));
```

Keep the existing press animation behavior.

- [ ] **Step 8: Remove or fix unused generic UI files**

Search usage:

```bash
rg -n "from '@/components/ui/(Card|Input|Modal|ScreenHeader|IconButtonSquare|Rule)'" app components hooks utils
```

If a component has no imports, delete it in this phase. If keeping it, it must pass lint.

- [ ] **Step 9: Add lint to CI**

In `.github/workflows/ci.yml`, add lint between typecheck and tests:

```yaml
      - name: ESLint
        run: npm run lint
```

- [ ] **Step 10: Verify**

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
```

Expected: all pass.

---

### Task 1.2: Harden Direct Edge Function Inputs

**Files:**

- Create: `supabase/functions/_shared/publicUrl.ts`
- Create: `supabase/functions/_shared/base64.ts`
- Modify: `supabase/functions/parse-recipe-source/index.ts`
- Modify: `supabase/functions/parse-image-recipe/index.ts`
- Modify: `supabase/functions/parse-video-recipe/index.ts`

- [ ] **Step 1: Extract public URL validation**

Create `supabase/functions/_shared/publicUrl.ts` with:

```ts
export function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized.includes(':')) return true;

  const parts = normalized.split('.').map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return true;
  }

  return false;
}

export function isBlockedIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  const ipv4 = normalized.split('.').map((part) => Number(part));
  if (ipv4.length === 4 && ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = ipv4;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }

  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized.startsWith('::ffff:')) return isBlockedIpAddress(normalized.replace('::ffff:', ''));
  return false;
}

export function validatePublicHttpUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('This URL cannot be imported');
  }
  return parsed;
}

export async function assertPublicDnsHostname(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) throw new Error('This URL cannot be imported');

  const [aRecords, aaaaRecords] = await Promise.all([
    Deno.resolveDns(hostname, 'A').catch(() => [] as string[]),
    Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]),
  ]);

  const addresses = [...aRecords, ...aaaaRecords];
  if (addresses.length === 0) throw new Error('Could not resolve URL host');
  if (addresses.some(isBlockedIpAddress)) throw new Error('This URL cannot be imported');
}
```

- [ ] **Step 2: Extract base64 validation**

Create `supabase/functions/_shared/base64.ts` with:

```ts
export function normalizeBase64Payload(value: string, maxBytes: number, label: string): string {
  const base64 = value.includes(',') ? value.split(',').pop() ?? '' : value;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    throw new Error(`Invalid ${label}`);
  }
  const compact = base64.replace(/\s/g, '');
  const estimatedBytes = Math.ceil((compact.length * 3) / 4);
  if (estimatedBytes > maxBytes) {
    throw new Error(`${label} is too large`);
  }
  return compact;
}
```

- [ ] **Step 3: Use shared validation in direct video parser**

In `supabase/functions/parse-video-recipe/index.ts`, import:

```ts
import { assertPublicDnsHostname, validatePublicHttpUrl } from '../_shared/publicUrl.ts';
```

Then replace:

```ts
const videoUrl = url.trim();
console.log('[parse-video-recipe] processing url:', videoUrl);
```

with:

```ts
const parsedVideoUrl = validatePublicHttpUrl(url.trim());
await assertPublicDnsHostname(parsedVideoUrl.hostname);
const videoUrl = parsedVideoUrl.toString();
console.log('[parse-video-recipe] processing url:', videoUrl);
```

Expected: direct `parse-video-recipe` has the same SSRF protection as `parse-recipe-source`.

- [ ] **Step 4: Use shared base64 validation in direct image parser**

In `supabase/functions/parse-image-recipe/index.ts`, import:

```ts
import { normalizeBase64Payload } from '../_shared/base64.ts';
```

Add:

```ts
const MAX_IMAGE_BASE64_BYTES = 8_000_000;
```

Replace:

```ts
const base64Data = image.includes(',') ? image.split(',')[1] : image;
```

with:

```ts
const base64Data = normalizeBase64Payload(image, MAX_IMAGE_BASE64_BYTES, 'image');
```

- [ ] **Step 5: Remove duplicate helper code from `parse-recipe-source`**

In `supabase/functions/parse-recipe-source/index.ts`, import shared helpers:

```ts
import { assertPublicDnsHostname, validatePublicHttpUrl } from '../_shared/publicUrl.ts';
import { normalizeBase64Payload } from '../_shared/base64.ts';
```

Replace its local `isBlockedHostname`, `isBlockedIpAddress`, `assertPublicDnsHostname`, and `validatePublicHttpUrl` with the shared imports. Replace `normalizeImageBase64` body with:

```ts
function normalizeImageBase64(value: string): string {
  return normalizeBase64Payload(value, MAX_IMAGE_BASE64_BYTES, 'image');
}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

Expected: client typecheck still passes. Deno functions are excluded from client TS, so also run:

```bash
deno check supabase/functions/parse-recipe-source/index.ts
deno check supabase/functions/parse-image-recipe/index.ts
deno check supabase/functions/parse-video-recipe/index.ts
```

Expected: all three Deno checks pass.

---

## Phase 2: Documentation And Configuration Truth

### Task 2.1: Align Docs With Actual Routes, Providers, And Backend

**Files:**

- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEVELOPMENT.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `env.example`
- Create: `.nvmrc`

- [ ] **Step 1: Add the missing Node version file**

Create `.nvmrc`:

```text
20.19.4
```

- [ ] **Step 2: Fix route docs**

In `README.md`, `docs/ARCHITECTURE.md`, and `CLAUDE.md`, remove references to:

```text
reset-password
toc.tsx
/(book)/[cookbookId]/toc
```

Use this route tree instead:

```text
app/(auth)/
  index.tsx
  sign-in.tsx
  sign-up.tsx
  forgot-password.tsx

app/(book)/
  index.tsx
  library.tsx
  settings.tsx
  [cookbookId]/
    _layout.tsx
    index.tsx
    add.tsx
    review.tsx
    generation/[pageId].tsx
```

Document that the table of contents is an in-reader page rendered by `BookTableOfContentsPage`, not a route.

- [ ] **Step 3: Fix provider docs**

Replace all provider tree docs with:

```text
QueryClientProvider
  CookbooksProvider
    CookbookImportProvider
      ToastProvider
        GlobalErrorBoundary
          RootLayoutNav
            GestureHandlerRootView
              SafeAreaProvider
                Stack
                OfflineBanner
```

Do not mention `UserProfileProvider` or `UserPreferencesProvider` unless they are reintroduced in code.

- [ ] **Step 4: Fix AI provider docs**

Current code uses:

- recipe parsing: OpenRouter primary in `parse-recipe-source`, Gemini fallbacks for direct image/video functions.
- page image generation: OpenAI image endpoint in `generate-cookbook-page`.
- chat: OpenRouter through `ai-chat`.

Update `README.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, and `CLAUDE.md` to list these secrets:

```text
AI_API_KEY, AI_API_BASE, AI_MODEL          -> ai-chat and parse-recipe-source OpenRouter calls
GEMINI_API_KEY                            -> parse-image-recipe and parse-video-recipe fallbacks
OPENAI_API_KEY, OPENAI_IMAGE_MODEL         -> generate-cookbook-page image generation
COOKBOOK_PAGE_BUCKET                       -> generate-cookbook-page storage bucket override
```

- [ ] **Step 5: Replace stale `AGENTS.md`**

Rewrite `AGENTS.md` so it matches the current book-first product. Keep only current route, state, backend, and command information. Remove references to:

```text
(tabs)
(onboarding)
useMeals
useShoppingList
useMealPlanner
useUserProfile
recipe-detail nutrition
meal planner
shopping list tab
chat-first landing
```

- [ ] **Step 6: Clean `env.example`**

Keep:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=openai/gpt-oss-20b:free
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
```

Remove stale public variables:

```text
EXPO_PUBLIC_SUPABASE_IMAGES_BUCKET
EXPO_PUBLIC_AI_VISION_MODEL
EXPO_PUBLIC_RECIPE_SOURCE
EXPO_PUBLIC_MEALDB_API_KEY
EXPO_PUBLIC_ENABLE_AI_PICKS
EXPO_PUBLIC_ENABLE_NUTRITION_DASHBOARD
EXPO_PUBLIC_OFFLINE_ONLY
EXPO_PUBLIC_DEV_RESET_ONBOARDING
```

Remove stale secret comments for FatSecret, HuggingFace, USDA, Stability, Modelslab, and AWS unless a live edge function uses them.

- [ ] **Step 7: Verify docs do not reference removed concepts**

```bash
rg -n "tabs|meal planner|shopping list tab|calorie|nutrition dashboard|useMeals|useShoppingList|useMealPlanner|UserProfileProvider|UserPreferencesProvider|toc.tsx|reset-password" README.md docs CLAUDE.md AGENTS.md env.example
```

Expected: no current-doc hits, except archived specs/plans if intentionally left as history.

---

## Phase 3: Legacy Code And Schema Cleanup

### Task 3.1: Remove Legacy Types And Unused Utilities

**Files:**

- Modify: `types/index.ts`
- Delete if unused: `utils/validation.ts`
- Delete: `utils/cookbook/samplePages.ts`
- Modify: `utils/cookbook/sampleCookbook.ts`

- [ ] **Step 1: Confirm imports**

```bash
rg -n "@/types'|@/types\"" app components hooks utils constants __tests__
rg -n "samplePages|SAMPLE_COOKBOOK_PAGES|SAMPLE_COOKBOOK_ID" app components hooks utils constants __tests__
rg -n "from '@/utils/validation'|from \"@/utils/validation\"" app components hooks utils constants __tests__
```

Expected before cleanup: `utils/validation.ts` imports from `@/types`; `samplePages.ts` duplicates sample data. No live app file should import `samplePages.ts`.

- [ ] **Step 2: Reduce `types/index.ts`**

Replace the full contents of `types/index.ts` with:

```ts
export * from './cookbook';
```

- [ ] **Step 3: Delete unused validation utility**

If Step 1 confirms no live import of `utils/validation.ts`, delete it:

```bash
git rm utils/validation.ts
```

- [ ] **Step 4: Delete duplicate sample pages**

```bash
git rm utils/cookbook/samplePages.ts
```

Keep `utils/cookbook/sampleCookbook.ts` as the only sample/demo fixture source.

- [ ] **Step 5: Verify**

```bash
npm run typecheck
npm test -- --runInBand
```

Expected: both pass.

---

### Task 3.2: Clean Database Setup Files

**Files:**

- Modify: `supabase/sql/00_bootstrap.sql`
- Keep: `supabase/sql/20260503_ai_cookbook_reset.sql`
- Keep: `supabase/sql/20260505_multi_cookbook.sql`
- Delete after confirming no deploy process references it: `supabase/migrations/20250106000000_ai_nutrition_scan.sql`
- Delete after confirming no deploy process references it: `supabase/sql/20250822_ingredient_icons.sql`
- Modify: `docs/DATABASE.md`

- [ ] **Step 1: Confirm legacy SQL references**

```bash
rg -n "20250106000000_ai_nutrition_scan|20250822_ingredient_icons|meal_plans|ingredient_icons|food_logs|food_usda_mapping|food_synonyms" README.md docs supabase package.json .github
```

Expected: legacy references are only documentation/history or the legacy SQL files themselves.

- [ ] **Step 2: Rewrite `00_bootstrap.sql` to be current-only**

Keep only:

- `CREATE SCHEMA IF NOT EXISTS nutriai;`
- `nutriai.set_updated_at()`
- `public.update_updated_at_column()` only if still needed by current migrations; otherwise remove it.
- `nutriai.profiles` only if the app still intentionally keeps profiles.
- grants for `nutriai`.

Remove all sections that create:

```sql
nutriai.meal_plans
nutriai.ingredient_icons
public.food_usda_mapping
public.food_synonyms
public.food_logs
```

Remove USDA seed data and comments for those tables.

- [ ] **Step 3: Delete standalone legacy migrations**

If no deploy process references these paths:

```bash
git rm supabase/migrations/20250106000000_ai_nutrition_scan.sql
git rm supabase/sql/20250822_ingredient_icons.sql
```

- [ ] **Step 4: Update database docs**

In `docs/DATABASE.md`, keep removed legacy tables only in a short historical note:

```md
Legacy nutrition and inventory tables were removed from the active schema in the cookbook reset. They are not part of fresh setup.
```

Do not list old table structures in current setup.

- [ ] **Step 5: Verify SQL text has no legacy creates**

```bash
rg -n "CREATE TABLE IF NOT EXISTS .*meal_plans|CREATE TABLE IF NOT EXISTS .*ingredient_icons|CREATE TABLE IF NOT EXISTS .*food_logs|food_usda_mapping|food_synonyms|USDA|calories" supabase/sql supabase/migrations docs/DATABASE.md
```

Expected: no current-schema hits. Historical note may mention legacy table names without schema definitions.

---

## Phase 4: Product State And Import Behavior

### Task 4.1: Gate Demo Cookbooks Explicitly

**Files:**

- Modify: `hooks/useCookbooks.ts`
- Modify: `utils/cookbook/sampleCookbook.ts`
- Modify: `env.example`
- Modify: `docs/DEVELOPMENT.md`

- [ ] **Step 1: Add explicit demo flag**

In `hooks/useCookbooks.ts`, replace unconditional non-production injection:

```ts
const cookbooks = [
  ...DEV_COLLECTION_COOKBOOKS,
  ...liveCookbooks.filter((cookbook) =>
    DEV_COLLECTION_COOKBOOKS.every((demoBook) => demoBook.id !== cookbook.id),
  ),
];
```

with:

```ts
const showDemoCookbook = process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK === 'true';
const demoCookbooks = showDemoCookbook ? DEV_COLLECTION_COOKBOOKS : [];
const cookbooks = [
  ...demoCookbooks,
  ...liveCookbooks.filter((cookbook) =>
    demoCookbooks.every((demoBook) => demoBook.id !== cookbook.id),
  ),
];
```

- [ ] **Step 2: Keep production safe**

In `utils/cookbook/sampleCookbook.ts`, keep:

```ts
export const DEV_COLLECTION_COOKBOOKS: Cookbook[] =
  process.env.NODE_ENV === 'production' ? [] : [DEMO_COLLECTION_COOKBOOK];
```

Reason: the environment flag is the UX gate; `NODE_ENV` remains a hard safety fallback.

- [ ] **Step 3: Document the flag**

Add to `env.example`:

```text
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
```

Add to `docs/DEVELOPMENT.md`:

```md
Set `EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=true` to show the static Weeknight Table demo book on the shelf during local UI work.
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck
```

Expected: pass.

---

### Task 4.2: Stop Hiding Parser Deployment Failures

**Files:**

- Modify: `hooks/useCookbookImport.ts`
- Delete local fallback helper if no longer used.

- [ ] **Step 1: Remove fake 404 draft fallback**

In `hooks/useCookbookImport.ts`, delete `localDraftFromPayload`.

Replace:

```ts
let result: ParseResult;
try {
  result = await parseRecipeSource(payload);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('(404)')) {
    throw err;
  }
  result = localDraftFromPayload(payload);
}
```

with:

```ts
const result = await parseRecipeSource(payload);
```

Reason: a missing edge function is a deployment/configuration failure. The user should see a real import error instead of generating an empty cookbook page.

- [ ] **Step 2: Verify import error flow**

Run the app with the parse function unavailable or with an invalid function name temporarily in local code. Submit a source from the add page.

Expected UX:

- user remains on `/(book)/[cookbookId]/add`
- alert title is `Recipe import failed`
- error message includes the failing function/status
- no draft is created

Restore the function name after the manual check.

- [ ] **Step 3: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

---

## Phase 5: UI System Simplification

### Task 5.1: Introduce One Shared Sheet Primitive

**Files:**

- Create: `components/ui/Sheet.tsx`
- Modify: `components/cookbook/AddCookbookSheet.tsx`
- Modify: `components/cookbook/AddPageSheet.tsx`
- Modify: `components/cookbook/NoshAssistantSheet.tsx`

- [ ] **Step 1: Create `Sheet`**

Create `components/ui/Sheet.tsx`:

```tsx
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface SheetProps {
  visible: boolean;
  eyebrow?: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: `${number}%`;
}

export function Sheet({
  visible,
  eyebrow,
  title,
  onClose,
  children,
  maxHeight = '82%',
}: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={[styles.sheet, { maxHeight }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title} numberOfLines={2}>{title}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close sheet">
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(35, 21, 10, 0.42)',
  },
  keyboard: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#D8BE8E',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8BE8E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#806A46',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#3E2C1B',
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 29,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4E1BE',
  },
});
```

- [ ] **Step 2: Refactor `AddPageSheet`**

Use:

```tsx
<Sheet
  visible={visible}
  eyebrow="Add Page"
  title={`Add a page to ${cookbookTitle}`}
  onClose={onClose}
>
  <View style={styles.options}>...</View>
</Sheet>
```

Remove duplicated `Modal`, backdrop, handle, header, and close styles from `AddPageSheet.tsx`.

- [ ] **Step 3: Refactor `AddCookbookSheet`**

Use:

```tsx
<Sheet
  visible={visible}
  eyebrow="Name your book"
  title="Almost there"
  onClose={onClose}
  maxHeight="88%"
>
  ...
</Sheet>
```

Keep its preview/input/create logic local.

- [ ] **Step 4: Refactor `NoshAssistantSheet`**

Use:

```tsx
<Sheet
  visible={visible}
  eyebrow="Ask Nosh"
  title="Chef assistant"
  onClose={onClose}
  maxHeight="82%"
>
  ...
</Sheet>
```

Keep chat-specific content local.

- [ ] **Step 5: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

---

### Task 5.2: Prune Unused UI Primitives

**Files:**

- Keep: `components/ui/Text.tsx`
- Keep: `components/ui/Sheet.tsx`
- Keep: `components/ui/OfflineBanner.tsx`
- Keep: `components/ui/GlobalErrorBoundary.tsx`
- Keep or simplify: `components/ui/Button.tsx`
- Delete if no imports: `components/ui/Card.tsx`
- Delete if no imports: `components/ui/Input.tsx`
- Delete if no imports: `components/ui/Modal.tsx`
- Delete if no imports: `components/ui/ScreenHeader.tsx`
- Delete if no imports: `components/ui/IconButtonSquare.tsx`
- Delete if no imports: `components/ui/Rule.tsx`
- Delete if no imports: `components/ui/Toast.tsx` and `contexts/ToastContext.tsx`
- Modify: `app/_layout.tsx` if `ToastProvider` is removed.

- [ ] **Step 1: Search imports**

```bash
rg -n "components/ui/(Card|Input|Modal|ScreenHeader|IconButtonSquare|Rule|Toast)|ToastProvider|useToast" app components hooks utils contexts
```

- [ ] **Step 2: Delete unused files**

For every file with no imports, delete it with `git rm`.

Example:

```bash
git rm components/ui/Card.tsx components/ui/Input.tsx components/ui/Modal.tsx components/ui/ScreenHeader.tsx components/ui/IconButtonSquare.tsx components/ui/Rule.tsx
```

If `ToastProvider` has no usage beyond the layout, remove it:

```bash
git rm components/ui/Toast.tsx contexts/ToastContext.tsx
```

Then remove from `app/_layout.tsx`:

```tsx
import { ToastProvider } from "@/contexts/ToastContext";
```

and unwrap:

```tsx
<CookbookImportProvider>
  <GlobalErrorBoundary>
    <RootLayoutNav />
  </GlobalErrorBoundary>
</CookbookImportProvider>
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

---

## Phase 6: Book-First UX Polish

### Task 6.1: Make Reader Controls Book-Scoped

**Files:**

- Modify: `components/cookbook/BookReader.tsx`
- Modify: `components/cookbook/NoshAssistantButton.tsx` if spacing conflicts with share/add.
- Modify: `utils/cookbook/share.ts`
- Modify: `app/(book)/[cookbookId]/index.tsx`

- [ ] **Step 1: Show active book title in reader chrome**

In `BookReader.tsx`, replace:

```tsx
<Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
  Nosh
</Text>
```

with:

```tsx
<Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
  {cookbookTitle}
</Text>
```

- [ ] **Step 2: Expose share on recipe pages**

Import `Share2`:

```ts
import { ChevronLeft, Plus, Share2 } from 'lucide-react-native';
```

Use the existing `onShare` prop when `selectedPage` exists:

```tsx
{selectedPage ? (
  <Pressable
    style={styles.floatingShareButton}
    onPress={() => onShare(selectedPage)}
    accessibilityRole="button"
    accessibilityLabel={`Share ${selectedPage.title}`}
  >
    <Share2 size={21} color="#5A4630" />
  </Pressable>
) : null}
```

Add style:

```ts
floatingShareButton: {
  position: 'absolute',
  right: 22,
  bottom: 110,
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 249, 239, 0.86)',
  borderWidth: 1,
  borderColor: 'rgba(90, 70, 48, 0.14)',
  boxShadow: '0 12px 20px rgba(34, 21, 10, 0.18)',
},
```

- [ ] **Step 3: Use the share utility**

In `app/(book)/[cookbookId]/index.tsx`, replace inline `Share.share` with `shareCookbookPage`.

Use:

```ts
import { shareCookbookPage } from '@/utils/cookbook/share';
```

Then:

```ts
const handleShare = (page: CookbookPage) => {
  shareCookbookPage(page).catch((err) => {
    const message = err instanceof Error ? err.message : 'Could not share this page.';
    Alert.alert('Share failed', message);
  });
};
```

Also import `Alert` and remove direct `Share` import.

- [ ] **Step 4: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

Manual check: open sample book, swipe to a recipe page, confirm share button appears and is absent on cover/TOC.

---

### Task 6.2: Redesign Review As Page Proofing

**Files:**

- Modify: `components/cookbook/RecipeReviewForm.tsx`
- Modify: `app/(book)/[cookbookId]/review.tsx`
- Create: `utils/cookbook/draft.ts`
- Create: `__tests__/utils/cookbook/draft.test.ts`

- [ ] **Step 1: Move draft conversion helpers into a tested utility**

Create `utils/cookbook/draft.ts`:

```ts
import type { ParsedRecipeDraft, StructuredIngredient, StructuredRecipe } from '@/types/cookbook';

export function ingredientToLine(ingredient: StructuredIngredient): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
}

export function linesFromText(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ingredientsFromText(
  value: string,
  originalIngredients: StructuredIngredient[],
): StructuredIngredient[] {
  const originalLines = originalIngredients.map(ingredientToLine);
  return linesFromText(value).map((line, index) => {
    const original = originalIngredients[index];
    if (original && line === originalLines[index]) return original;
    return { name: line };
  });
}

export function buildReviewedRecipe(
  draft: ParsedRecipeDraft,
  values: {
    title: string;
    servings: string;
    ingredients: string;
    steps: string;
  },
): StructuredRecipe {
  return {
    ...draft,
    id: draft.id ?? `draft-${Date.now()}`,
    title: values.title.trim(),
    servings: Number(values.servings) || 4,
    ingredients: ingredientsFromText(values.ingredients, draft.ingredients),
    steps: linesFromText(values.steps),
    tags: draft.tags ?? [],
    category: draft.category ?? 'dinner',
  };
}
```

- [ ] **Step 2: Add tests**

Create `__tests__/utils/cookbook/draft.test.ts`:

```ts
import { buildReviewedRecipe, ingredientToLine, linesFromText } from '@/utils/cookbook/draft';

describe('cookbook draft helpers', () => {
  it('formats ingredients without adding empty spaces', () => {
    expect(ingredientToLine({ quantity: '1', unit: 'cup', name: 'flour' })).toBe('1 cup flour');
    expect(ingredientToLine({ name: 'salt to taste' })).toBe('salt to taste');
  });

  it('trims blank lines from multiline input', () => {
    expect(linesFromText(' Mix batter.\\n\\n Bake. ')).toEqual(['Mix batter.', 'Bake.']);
  });

  it('builds a valid reviewed recipe from edited fields', () => {
    const recipe = buildReviewedRecipe(
      {
        title: 'Old Title',
        servings: 2,
        ingredients: [{ quantity: '1', unit: 'cup', name: 'rice' }],
        steps: ['Cook rice.'],
        sourceType: 'text',
      },
      {
        title: 'Rice Bowl',
        servings: '3',
        ingredients: '1 cup rice\\n2 tbsp sauce',
        steps: 'Cook rice.\\nAdd sauce.',
      },
    );

    expect(recipe.title).toBe('Rice Bowl');
    expect(recipe.servings).toBe(3);
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.steps).toEqual(['Cook rice.', 'Add sauce.']);
    expect(recipe.category).toBe('dinner');
  });
});
```

- [ ] **Step 3: Refactor form to use helper**

In `RecipeReviewForm.tsx`, import:

```ts
import { buildReviewedRecipe, ingredientToLine } from '@/utils/cookbook/draft';
```

Remove local helper functions. In `submit`, use:

```ts
await onGenerate(buildReviewedRecipe(draft, { title, servings, ingredients, steps }));
```

- [ ] **Step 4: Update copy to book-first language**

Replace title:

```tsx
Review before spending a credit
```

with:

```tsx
Proof the page
```

Add explanatory copy directly under the title:

```tsx
<Text style={styles.subtitle}>
  Check the recipe before Nosh prints it into your cookbook. A generated page uses 1 credit.
</Text>
```

Change button text:

```tsx
{isGenerating ? 'Printing page' : 'Generate cookbook page - 1 credit'}
```

- [ ] **Step 5: Add confidence context**

In `app/(book)/[cookbookId]/review.tsx`, get `confidence`, `needsReview`, and `reasons` from `useCookbookImport()` and pass them to `RecipeReviewForm`.

Add props:

```ts
confidence?: number;
needsReview?: boolean;
reasons?: string[];
```

Render a small paper note in the form:

```tsx
{typeof confidence === 'number' ? (
  <View style={styles.note}>
    <Text style={styles.noteTitle}>{needsReview ? 'Needs a quick check' : 'Looks ready'}</Text>
    <Text style={styles.noteText}>{Math.round(confidence * 100)}% extraction confidence</Text>
    {reasons?.map((reason) => (
      <Text key={reason} style={styles.reasonText}>{reason}</Text>
    ))}
  </View>
) : null}
```

- [ ] **Step 6: Verify**

```bash
npm test -- --runInBand __tests__/utils/cookbook/draft.test.ts
npm run typecheck
npm run lint
```

Expected: all pass.

---

### Task 6.3: Align Auth And Library Copy With The Cookbook Product

**Files:**

- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/forgot-password.tsx`
- Modify: `app/(book)/library.tsx`
- Modify: `components/cookbook/EmptyShelfState.tsx`
- Modify: `constants/brand.ts`

- [ ] **Step 1: Replace old auth copy**

Use this copy:

```text
Sign in subtitle: Return to your cookbooks
Sign-up subtitle: Start your personal cookbook
Forgot password subtitle: Enter your email and we will send a reset link
```

Remove `kitchen buddy` from auth UI.

- [ ] **Step 2: Update brand constants**

In `constants/brand.ts`, replace `kitchen buddy` positioning with:

```ts
export const NOSH_WELCOME_MESSAGE =
  "I'm Nosh, your chef inside the cookbook. Add recipes from anywhere, then cook from pages that feel like yours.";

export const NOSH_PERSONA = {
  oneLiner: 'A calm, practical AI chef assistant living inside a personal digital cookbook.',
  traits: ['warm', 'practical', 'concise', 'observant', 'cookbook-aware'] as const,
  principles: [
    'Short, useful cooking guidance',
    'Use the current page first, then the rest of the cookbook',
    'Keep the app calm and book-first',
    'Respect allergies and dietary needs strictly',
    'No calorie counting, dieting, or nutrition coaching',
  ],
};
```

- [ ] **Step 3: Quiet the library explanation**

In `app/(book)/library.tsx`, replace the subtitle with:

```tsx
<Text style={styles.subtitle}>
  Choose the cover language for this cookbook. Every page you add will follow the same style.
</Text>
```

- [ ] **Step 4: Quiet the empty shelf explanation**

In `EmptyShelfState.tsx`, replace the subtitle with:

```tsx
<Text style={styles.subtitle}>
  Choose a style, name the book, then add recipes as pages.
</Text>
```

- [ ] **Step 5: Verify no old product copy remains in live UI**

```bash
rg -n "kitchen buddy|nutrition coaching|calorie|dashboard|meal planner|shopping list tab" app components constants hooks utils
```

Expected: no live UI hits, except assistant prompt references to shopping lists as an assistant action.

---

## Phase 7: Account Lifecycle

### Task 7.1: Wire Account Deletion

**Files:**

- Create: `utils/account.ts`
- Modify: `app/(book)/settings.tsx`
- Modify: `hooks/useCookbooks.ts` if cache invalidation is needed.
- Modify: `utils/cookbook/cache.ts` if adding cache clear helpers.

- [ ] **Step 1: Add account API utility**

Create `utils/account.ts`:

```ts
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

export async function deleteAccount(): Promise<void> {
  await callAuthenticatedFunction('delete-account', {});
}
```

- [ ] **Step 2: Add cache clearing helpers**

In `utils/cookbook/cache.ts`, add:

```ts
export async function clearCachedShelf(userId: string): Promise<void> {
  await AsyncStorage.removeItem(shelfKey(userId));
}

export async function clearCachedPages(cookbookIds: string[]): Promise<void> {
  await Promise.all(cookbookIds.map((cookbookId) => AsyncStorage.removeItem(pagesKey(cookbookId))));
}
```

- [ ] **Step 3: Wire settings action**

In `app/(book)/settings.tsx`, import:

```ts
import { deleteAccount } from '@/utils/account';
import { clearCachedPages, clearCachedShelf } from '@/utils/cookbook/cache';
```

Add state:

```ts
const [deletingAccount, setDeletingAccount] = useState(false);
```

Replace the “Coming soon” delete press with:

```ts
onPress: async () => {
  if (!user?.id || deletingAccount) return;
  setDeletingAccount(true);
  try {
    await clearCachedPages(cookbooks.map((cookbook) => cookbook.id));
    await clearCachedShelf(user.id);
    await deleteAccount();
    await signOut();
    router.replace('/(auth)/sign-in');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete account.';
    Alert.alert('Delete account failed', message);
  } finally {
    setDeletingAccount(false);
  }
}
```

Change row label to:

```tsx
label={deletingAccount ? 'Deleting account...' : 'Delete account'}
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

Manual check against a disposable account only: deletion returns to sign-in and old shelf cache does not reappear.

---

### Task 7.2: Complete Password Reset Or Remove Route Claims

**Files:**

- Create: `app/(auth)/reset-password.tsx`
- Modify: `app/(auth)/_layout.tsx`
- Modify: `app/(auth)/forgot-password.tsx` if redirect params need adjustment.
- Modify: docs from Task 2.1 if deciding not to add reset route.

- [ ] **Step 1: Add reset-password screen**

Create `app/(auth)/reset-password.tsx`:

```tsx
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updatePassword() {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      Alert.alert('Password updated', 'You can sign in with your new password.');
      router.replace('/(auth)/sign-in');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update password.';
      setError(message);
      Alert.alert('Reset failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>Choose a new password for your Nosh account.</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="New password"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="Confirm password"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={updatePassword} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.buttonText}>Update password</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  input: {
    minHeight: 52,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
  },
  button: {
    minHeight: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '800',
  },
  error: {
    color: Colors.error,
  },
});
```

- [ ] **Step 2: Register route**

In `app/(auth)/_layout.tsx`, add:

```tsx
<Stack.Screen name="forgot-password" options={{ headerShown: false }} />
<Stack.Screen name="reset-password" options={{ headerShown: false }} />
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

Manual check: request reset email, open deep link, confirm reset page renders and password update succeeds.

---

## Phase 8: Final Production Readiness

### Task 8.1: Dependency Audit

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json` only if removed package has a config plugin entry.

- [ ] **Step 1: Search likely unused packages**

```bash
rg -n "react-native-chart-kit|victory-native|expo-av|expo-camera|expo-clipboard|expo-file-system|expo-image-manipulator|expo-media-library|react-native-view-shot|html-react-parser|i18next|react-i18next|@react-native-community/datetimepicker|@shopify/react-native-skia" app components hooks utils constants types lib contexts
```

- [ ] **Step 2: Remove packages with zero live imports**

Use:

```bash
npm uninstall <package-name> --legacy-peer-deps
```

Only remove one package group at a time, then run:

```bash
npm run typecheck
npx expo-doctor
```

Expected: both pass.

- [ ] **Step 3: Keep packages required by config/plugins**

Do not remove packages listed in `app.json` plugins unless the feature is removed from the app and plugin entry is removed in the same commit.

Current plugin packages verified in audit:

```text
expo-camera
expo-font
expo-image-picker
expo-apple-authentication
expo-localization
expo-router
expo-asset
expo-splash-screen
```

---

### Task 8.2: Final Verification Pass

**Files:** none

- [ ] **Step 1: Run project checks**

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo-doctor
```

Expected: all pass.

- [ ] **Step 2: Run cookbook source searches**

```bash
rg -n "calorie|nutrition dashboard|food log|meal planner|shopping list tab|inventory tab|useMeals|useShoppingList|useMealPlanner" app components hooks utils constants types README.md docs/ARCHITECTURE.md docs/DEVELOPMENT.md CLAUDE.md AGENTS.md
```

Expected: no live-product hits. Assistant prompt references to shopping lists as an in-chat action are acceptable.

- [ ] **Step 3: Manual smoke test**

Run:

```bash
npx expo start --web --port 8081
```

Check:

- signed-out user lands on sign-in
- signed-in user lands on shelf
- empty shelf CTA opens library
- library creates a cookbook
- reader opens created cookbook
- sample cookbook preview still works
- add page opens source sheet
- parser failure shows an error and does not create fake draft
- review page generates when backend is configured
- generated result routes back to the book
- assistant opens on a recipe page
- share button appears only on recipe pages
- settings sign-out works

- [ ] **Step 4: Final git check**

```bash
git status --short
git diff --stat
```

Expected: changes match this plan. No unrelated user files reverted.

---

## Recommended Execution Order

1. Phase 1 first. Do not start broad cleanup until lint and edge-function safety are handled.
2. Phase 2 next. Current docs are misleading enough to slow every later contributor.
3. Phase 3 and Phase 4 can be done in parallel if workers own disjoint files.
4. Phase 5 before Phase 6. Shared sheet cleanup reduces duplicate work in UI polish.
5. Phase 7 before final release branch.
6. Phase 8 last.

---

## Self-Review

Spec coverage:

- Full architecture cleanup: covered by Phases 2, 3, 5.
- UI/UX consistency: covered by Phases 5 and 6.
- Product alignment: covered by Phases 2, 4, 6.
- Production readiness: covered by Phases 1, 7, 8.
- Bugs/security: covered by Phases 1 and 7.
- Developer experience: covered by Phases 1, 2, 3, 8.

No placeholder scan:

- The plan avoids deferred labels and gives exact files, commands, and target code shapes.

Type consistency:

- New helper names are consistent across tasks: `validatePublicHttpUrl`, `assertPublicDnsHostname`, `normalizeBase64Payload`, `buildReviewedRecipe`, `deleteAccount`, `clearCachedShelf`, `clearCachedPages`, and `Sheet`.
