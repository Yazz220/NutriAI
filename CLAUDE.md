# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NutriAI is a React Native mobile application (Expo) for comprehensive nutrition and meal management. The app helps users track their inventory, discover recipes, plan meals, manage shopping lists, and monitor nutrition goals with AI-powered coaching.

**Tech Stack:**
- React Native 0.81.4 with Expo ~54.0.0
- Expo Router for file-based navigation
- TypeScript with strict mode
- Supabase backend (`nutriai` schema with RLS)
- Multiple AI providers (OpenRouter, Hugging Face) via Edge Functions
- AsyncStorage for local persistence
- TanStack React Query for server state
- Custom context-based state management

**Node Version:** Use Node v20.19.4 (some native packages require this minimum). Install dependencies with `npm install --legacy-peer-deps` to avoid peer resolution errors.

## Common Commands

### Development
```bash
# Start development server
npm start
# or with tunnel (more reliable on restricted networks)
npx expo start --tunnel

# Platform-specific
npm run android
npm run ios
npm run web
```

### Testing
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Supabase Edge Functions
```powershell
# Deploy a function
supabase functions deploy <function-name> --project-ref <PROJECT_REF>

# Examples:
supabase functions deploy ai-chat --project-ref <PROJECT_REF>
supabase functions deploy fatsecret-token --project-ref <PROJECT_REF>
supabase functions deploy generate-ingredient-icon --project-ref <PROJECT_REF>
```

## Architecture Overview

### State Management Philosophy

The app uses a **context-based state management** pattern with custom hooks wrapping `@nkzw/create-context-hook`. Each domain has its own provider and hook:

- `useInventoryStore` - Inventory items (AsyncStorage + Supabase sync)
- `useRecipeStore` - Saved recipes
- `useRecipeFoldersStore` - Recipe organization folders
- `useShoppingListStore` - Shopping list items
- `useMealPlanner` - Meal planning by date
- `useNutrition` / `useNutritionWithMealPlan` - Nutrition tracking and goals
- `useUserProfile` / `useEnhancedUserProfile` - User profile and onboarding data
- `useAuth` - Supabase authentication state

**Provider Hierarchy:** See [app/_layout.tsx:157-184](app/_layout.tsx#L157-L184) for the nested provider tree. Order matters - auth/profile providers wrap everything.

### Navigation Structure

The app uses Expo Router with file-based routing:

```
app/
  _layout.tsx              # Root layout with all providers
  (auth)/                  # Auth group - sign-in, sign-up
  (onboarding)/            # Onboarding flow - multi-step user setup
  (tabs)/                  # Main app - 4-tab bottom navigation
    index.tsx             # Inventory tab
    recipes.tsx           # Recipes tab
    list.tsx              # Shopping List tab
    coach.tsx             # Coach/Nutrition Dashboard tab
    coach/
      progress-photos.tsx # Progress photos sub-screen
```

**Navigation guards:** [app/_layout.tsx:102-127](app/_layout.tsx#L102-L127) handles redirects based on:
1. Onboarding completion status
2. Authentication state
3. Current route segment

### AI Integration Architecture

**Client-side:** AI calls route through `utils/aiClient.ts`, which supports:
- Direct API calls (OpenRouter) - for prototyping only
- **Recommended:** Proxy mode via Supabase Edge Functions

**Edge Functions (Supabase):**
- `ai-chat` - Secure AI chat proxy with JWT verification
- `ai-nutrition-scan` - Food image analysis (Food-101-93M + USDA data)
- `nutrition-analyze` - Nutrition data analysis
- `parse-recipe` - Recipe import/parsing
- `fatsecret-token` - OAuth2 token broker for FatSecret API
- `generate-ingredient-icon` / `get-ingredient-icon` - Icon generation (Stability AI / Modelslab)

**Context Builders:** AI calls include rich context via:
- `utils/coach/contextBuilder.ts` - Coach chat context
- `utils/recipe/contextBuilder.ts` - Recipe-specific context
- `utils/ai/profileContextBuilder.ts` - User profile context
- `utils/inventoryAwareAiContext.ts` - Inventory-aware recommendations

**Key Pattern:** Never expose API keys client-side. Use `EXPO_PUBLIC_AI_PROXY_BASE` to point to Edge Functions, which hold secrets as Function secrets (not in `.env`).

### Component Organization

```
components/
  ui/                      # Base design system components (Button, Card, Input, Modal, etc.)
  coach/                   # Coach tab components (DayCell, DateCarousel, WeekRings, ChatModal, etc.)
  nutrition/               # Nutrition tracking components
  recipe/                  # Recipe-related components
  recipe-detail/           # Recipe detail view components
  folders/                 # Recipe folder management
  inventory/               # Inventory-specific components
  progress/                # Progress tracking (weight, measurements, photos, BMI)
  onboarding/              # Onboarding flow components
  common/                  # Shared components (IngredientIcon, GlassSurface)
```

**Component Best Practices:**
- Use `React.memo` for performance-critical components (see coach components)
- Extract reusable components early (see Coach tab refactoring in README)
- Prefer `@/` path alias for imports (configured in tsconfig.json and babel.config.js)

### Data Flow: Inventory ↔ Recipes ↔ Shopping List ↔ Meal Plan

1. **Add to Inventory** → Items stored locally (AsyncStorage) and optionally synced to Supabase
2. **Discover Recipes** → Check availability via `utils/recipeAvailability.ts` against inventory
3. **Plan Meals** → `useMealPlanner` stores meals by date/meal type
4. **Generate Shopping List** → Missing ingredients auto-added from planned meals
5. **Mark as Purchased** → Prompts for expiry, then moves item to Inventory (toast with undo)
6. **Log Nutrition** → Completed meals update nutrition tracking via `useNutritionWithMealPlan`

### Supabase Schema & RLS

**Schema:** `nutriai` (strict RLS enabled on all tables)

**Tables:**
- `profiles` - User profiles
- `inventory_items` - Inventory (synced from AsyncStorage)
- `shopping_list_items` - Shopping list
- `meal_plans` - Planned meals by date
- `recipes_saved` - User's saved recipes
- `ai_messages` - Chat history
- `ingredient_icons` - Generated ingredient icons (queued via Edge Functions)

**Client:** `supabase/functions/_shared/supabaseClient.ts` - Supabase client with AsyncStorage auth persistence

**Environment:** Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (copy from `env.example`)

### Type System

**Core Types:** [types/index.ts](types/index.ts) - `InventoryItem`, `Recipe`, `Meal`, `ShoppingListItem`, `UserPreferences`, `NutritionGoals`, etc.

**Path Alias:** `@/` resolves to project root (see `tsconfig.json` paths and `babel-plugin-module-resolver`)

**Strict Mode:** Enabled in tsconfig.json. Follow strict typing conventions.

## Key Workflows & Implementation Patterns

### Coach Tab Architecture

The Coach tab ([app/(tabs)/coach.tsx](app/(tabs)/coach.tsx)) was recently refactored into modular components:

**Key Components:**
- `DayCell` - Individual day with progress rings
- `DateCarousel` - Horizontal date picker with navigation
- `WeekRings` - Week overview with macro progress
- `EnhancedChatInterface` / `EnhancedFloatingChatButton` - AI chat assistant
- `CoachErrorBoundary` - Error handling with dev-friendly reporting

**Date Utilities:** [utils/coach/dateUtils.ts](utils/coach/dateUtils.ts) - `getWeekStartISO`, `formatWeekRange`, `shiftDate`, `shiftWeek`, `isToday`, `getDayLabel`

**Performance:** Uses `React.memo` and `useCallback` to prevent unnecessary re-renders. Follow this pattern when adding new coach components.

### Adding a New Edge Function

1. Create function directory: `supabase/functions/<function-name>/index.ts`
2. Import shared client: `import { supabase } from '../_shared/supabaseClient.ts'`
3. Deploy: `supabase functions deploy <function-name> --project-ref <PROJECT_REF>`
4. Set secrets via Supabase dashboard (Functions → Environment variables)
5. Update client to call function via `supabase.functions.invoke('<function-name>', { body })`

**JWT Verification:** Edge Functions can verify user auth with `Authorization: Bearer <anon_key>` header.

### Recipe Import Flow

**Entry Point:** [components/ImportRecipeModal.tsx](components/ImportRecipeModal.tsx)

**Steps:**
1. User provides URL or pastes text/HTML
2. Parse via `utils/recipeImport.ts` (calls `parse-recipe` Edge Function if URL)
3. Extract nutrition via `utils/recipeNutrition.ts` (USDA lookup)
4. Enrich with `hooks/useRecipeNutritionEnrichment.ts`
5. Save to `useRecipeStore`

**AI Vision Import:** Use `utils/visionClient.ts` for image-based recipe extraction (calls Edge Function with vision model)

### Ingredient Icon Generation

**System:** Queued icon generation via Supabase Edge Functions + Stability AI / Modelslab

**Tables:** `nutriai.ingredient_icons` (see `supabase/sql/20250822_ingredient_icons.sql`)

**Functions:**
- `get-ingredient-icon` - Client calls this to enqueue/poll icon by slug
- `generate-ingredient-icon` - Background worker processes pending icons

**Component:** [components/common/IngredientIcon.tsx](components/common/IngredientIcon.tsx) handles fetching/displaying

**Configuration:** Set provider (`ICON_PROVIDER`), API keys (`STABILITY_API_KEY` / `MODELSLAB_API_KEY`), and S3/storage settings as Supabase Function environment variables.

### Onboarding Flow

**Multi-step wizard:** [app/(onboarding)/](app/(onboarding)/) - welcome → basic-profile → physical-metrics → dietary-preferences → allergies → health-goals → activity-level → calorie-plan

**State Management:**
- `utils/onboardingPersistence.ts` - AsyncStorage persistence
- `contexts/OnboardingContext.tsx` - Completion status check
- `utils/onboardingProfileIntegration.ts` - Final profile creation

**Navigation:** Controlled via `utils/onboardingNavigation.ts` with route validation

**Guards:** [app/_layout.tsx:110-114](app/_layout.tsx#L110-L114) redirects to onboarding if not completed

### Error Handling

**Global Boundary:** [components/ui/GlobalErrorBoundary.tsx](components/ui/GlobalErrorBoundary.tsx) wraps entire app

**Domain Boundaries:**
- `CoachErrorBoundary` - Coach tab
- `NutritionErrorBoundary` - Nutrition components
- Generic `ErrorBoundary` component for reuse

**Toast System:** [contexts/ToastContext.tsx](contexts/ToastContext.tsx) - User-friendly notifications with undo actions

## Development Guidelines

### When Adding Features

1. **Check existing patterns first** - This codebase has established patterns for state, navigation, AI context, etc.
2. **Use path alias** - Import with `@/` not relative paths
3. **Follow component organization** - Place in appropriate subfolder (ui, coach, nutrition, etc.)
4. **Add types** - Extend types in `types/index.ts` or create domain-specific type files
5. **Use context builders for AI** - Don't build prompts inline, use utils
6. **Test with `--legacy-peer-deps`** - When adding dependencies

### When Modifying State

- **AsyncStorage persistence** - Most stores auto-persist to AsyncStorage on change
- **Supabase sync** - Some stores (inventory, meal plans) sync to Supabase tables with RLS
- **User scoping** - Check `useAuth().user?.id` before accessing user-specific data
- **Loading states** - Always handle `isLoading` from stores

### When Working with AI

- **Use Edge Functions** - Don't expose API keys client-side
- **Include context** - Use context builders to give AI rich user/inventory/profile data
- **Handle errors gracefully** - AI calls can fail; show user-friendly messages
- **Streaming** - `createChatCompletionStream` in `utils/aiClient.ts` for chat UX

### When Adding UI Components

- **Design system first** - Check `components/ui/` for existing components
- **Constants** - Use `constants/colors.ts`, `constants/spacing.ts`, `constants/typography.ts`
- **Accessibility** - Add proper labels, test with screen readers
- **Performance** - Use `React.memo` for complex components

### Testing Edge Functions Locally

**PowerShell Example:**
```powershell
$ANON = "<YOUR_ANON_KEY>"
$headers = @{ Authorization = "Bearer $ANON"; apikey = $ANON; "Content-Type" = "application/json" }
$body = @{ messages = @(@{ role = "user"; content = "Test message" }) } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method POST -Uri "https://<PROJECT_REF>.supabase.co/functions/v1/ai-chat" -Headers $headers -Body $body
```

## Important Environment Variables

**Required (copy from `env.example`):**
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

**AI (recommended proxy approach):**
- `EXPO_PUBLIC_AI_PROXY_BASE` - Points to `ai-chat` Edge Function

**Recipe Providers:**
- `EXPO_PUBLIC_FATSECRET_TOKEN_URL` - Points to `fatsecret-token` Edge Function
- `EXPO_PUBLIC_MEALDB_API_KEY` - TheMealDB API key (default: '1')

**Feature Flags:**
- `EXPO_PUBLIC_DEV_BYPASS_AUTH` - Skip auth for development (default: false)
- `EXPO_PUBLIC_ENABLE_AI_PICKS` - Enable AI recommendations (default: true)
- `EXPO_PUBLIC_DEV_RESET_ONBOARDING` - Reset onboarding on app start (default: false)

**Edge Function Secrets (set in Supabase dashboard):**
- `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL` - For ai-chat function
- `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` - For fatsecret-token function
- `STABILITY_API_KEY` or `MODELSLAB_API_KEY` - For ingredient icon generation
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ICON_S3_BUCKET` - For S3 icon storage (optional)

## Common Pitfalls

1. **Missing `--legacy-peer-deps`** - Always use this flag for npm install
2. **Wrong Node version** - Use v20.19.4 to avoid native module issues
3. **Exposing secrets client-side** - Never use `EXPO_PUBLIC_` for API keys; use Edge Functions
4. **Provider order** - The provider hierarchy in `_layout.tsx` is critical; don't reorder
5. **RLS policies** - All Supabase tables require authenticated user; requests will fail without auth
6. **AsyncStorage not awaited** - Always await AsyncStorage operations
7. **State not persisted** - Check that store's useEffect persists to AsyncStorage
8. **Relative imports** - Use `@/` alias, not `../../`
9. **Date handling** - Use ISO strings (`YYYY-MM-DD`) for consistency; see `utils/coach/dateUtils.ts`
10. **Nutrition sync** - `useNutritionWithMealPlan` combines logged meals and planned meals; use this instead of `useNutrition` alone in Coach tab

## Additional Documentation

- **Session Notes:** `docs/Session-Recap.md` - Historical development notes
- **AI Scan Setup:** `docs/AI-Scan-Setup-Guide.md` - Food image scanning setup
- **Video Import:** `docs/Video-Import-Setup.md` - Video recipe import configuration (if present)
- **Supabase SQL:** `supabase/sql/` - Database migrations and schema definitions
