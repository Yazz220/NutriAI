# CLAUDE.md

## Project Overview

**Nosh** is a React Native mobile app (Expo) — an AI kitchen buddy that helps users collect, organize, and cook recipes. Users send recipes to Nosh via chat (links, text, images, video) and the AI auto-processes, categorizes, and saves them to a personal recipe library.

**Tech Stack:**
- React Native with Expo ~54.0.0
- Expo Router for file-based navigation
- TypeScript with strict mode
- Supabase backend (`nutriai` schema with RLS)
- Google Gemini 2.5 Flash for image/video recipe extraction
- OpenRouter AI via Edge Functions for chat
- AsyncStorage for local persistence
- TanStack React Query for server state

**Node Version:** v20.19.4. Install dependencies with `npm install --legacy-peer-deps`.

## Commands

### Development
```bash
# Start dev server (connects to Nosh (Dev) app on device)
npx expo start

# Web preview
npx expo start --web --port 8081

# LAN mode (scan QR on same network)
npx expo start --lan
```

### Building & Deployment
```bash
# Development build → "Nosh (Dev)" on device (com.yaz12.nosh.dev)
npx eas-cli build --profile development --platform ios

# Preview/TestFlight → "Nosh" (com.yaz12.nosh)
npx eas-cli build --profile preview --platform ios

# Production → App Store submission
npx eas-cli build --profile production --platform ios

# Submit to App Store
npx eas-cli submit --platform ios
```

### Testing
```bash
npm test
npm run test:watch
```

### Supabase Edge Functions
```bash
supabase functions deploy <function-name> --project-ref <PROJECT_REF>
```

## Architecture

### Navigation (5 tabs)
```
app/
  _layout.tsx              # Root layout with providers + auth/onboarding guards
  (auth)/                  # sign-in, sign-up, forgot-password
  (onboarding)/            # welcome → dietary-preferences → allergies → restrictions
  (tabs)/
    index.tsx             # Nosh Chat tab (default — AI assistant)
    recipes.tsx           # Recipe library (category-based, searchable)
    plan.tsx              # Weekly meal planner
    list.tsx              # Shopping list
    profile.tsx           # User profile & preferences
```

### State Management
Context-based pattern with `@nkzw/create-context-hook`:
- `useMeals` — Saved recipes (AsyncStorage + category field)
- `useShoppingList` — Shopping list items
- `useMealPlanner` — Meal plans by date (AsyncStorage + Supabase sync)
- `useUserProfile` — User profile and onboarding data
- `useAuth` — Supabase authentication state
- `useNoshChat` — Chat messages, import routing, AI conversations

**Provider Hierarchy:** See `app/_layout.tsx` — auth/profile providers wrap everything. Order matters.

### AI Chat Flow
```
User sends content in Chat tab
  → contentDetector.ts detects type (URL, video URL, image, text)
  → importOrchestrator.ts routes to correct pipeline:
      - URL → recipeImport.ts (existing HTML parser)
      - Text → recipeImport.ts (AI text parser)
      - Image → parse-image-recipe Edge Function (Gemini vision)
      - Video → parse-video-recipe Edge Function (Gemini video)
  → AI auto-categorizes recipe (breakfast/lunch/dinner/snacks/etc.)
  → useMeals.addMeal() saves to AsyncStorage
  → Nosh confirms in chat with recipe card
```

### Edge Functions
- `ai-chat` — Secure AI chat proxy (JWT verified)
- `parse-image-recipe` — Image → Gemini 2.5 Flash → structured recipe
- `parse-video-recipe` — Video URL → Gemini 2.5 Flash → structured recipe
- `parse-recipe` — URL/text recipe parsing
- `delete-account` — Account deletion (JWT + service role)

### Dual-Build Setup
Two separate apps on device via `app.config.js` + `APP_VARIANT` env var:

| Profile | App Name | Bundle ID | Scheme |
|---------|----------|-----------|--------|
| development | Nosh (Dev) | com.yaz12.nosh.dev | nosh-dev:// |
| preview/production | Nosh | com.yaz12.nosh | nosh:// |

### Authentication
- Email/password sign-up and sign-in (Supabase Auth)
- Apple Sign-In (`expo-apple-authentication` + `utils/appleAuth.ts`)
- Google OAuth
- Magic link sign-in
- Password reset flow

## Key Files

| File | Purpose |
|------|---------|
| `hooks/useNoshChat.ts` | Chat state, persistence, import routing, AI calls |
| `utils/contentDetector.ts` | Detect input type (URL, video, image, text) |
| `utils/importOrchestrator.ts` | Route imports, auto-categorize, auto-save |
| `constants/brand.ts` | Nosh personality, system prompts, copy strings |
| `constants/colors.ts` | Design system colors |
| `constants/spacing.ts` | Spacing, typography, radii, shadows |
| `types/index.ts` | Core types (Meal, MealCategory, NoshChatMessage) |
| `app.config.js` | Dynamic config for dev/prod bundle IDs |

## Component Organization
```
components/
  ui/              # Design system (Button, Card, Input, Modal, ScreenHeader)
  chat/            # Chat UI (ChatMessageBubble, RecipeCardInline, ChatInput)
  recipe-detail/   # Recipe detail view, serving size, nutrition
  onboarding/      # Onboarding flow components
  common/          # Shared (IngredientIcon, GlassSurface)
```

## Development Guidelines

- **Use `@/` path alias** — not relative imports
- **Use Edge Functions** — never expose API keys client-side
- **Use `React.memo`** for performance-critical components
- **Use `constants/colors.ts`** and `constants/spacing.ts` for styling
- **Always `--legacy-peer-deps`** when installing packages
- **Only modules with config plugins** go in `app.json` plugins array — check for `app.plugin.js` in `node_modules/<pkg>/` before adding

## Environment Variables

**Required (.env):**
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

**Edge Function Secrets (Supabase dashboard):**
- `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL` — For ai-chat
- `GEMINI_API_KEY` — For parse-image-recipe and parse-video-recipe

## Common Pitfalls

1. **Missing `--legacy-peer-deps`** — Always use for npm install
2. **Plugin without config plugin** — Only add to `app.json` plugins if the package has `app.plugin.js`. Others are auto-linked.
3. **Exposing secrets client-side** — Never put API keys in `EXPO_PUBLIC_*`; use Edge Functions
4. **Provider order** — The hierarchy in `_layout.tsx` is critical; don't reorder
5. **RLS policies** — All Supabase tables require authenticated user
6. **Date handling** — Use ISO strings (`YYYY-MM-DD`)
7. **Category on meals** — New meals get auto-categorized; existing meals backfill to 'dinner'

## Documentation

- **Pre-Launch Checklist:** `docs/PRE-LAUNCH-CHECKLIST.md`
- **Design Spec:** `docs/superpowers/specs/2026-04-07-nosh-ai-chef-assistant-design.md`
- **Implementation Plan:** `docs/superpowers/plans/2026-04-07-nosh-ai-chef-assistant.md`
- **Supabase SQL:** `supabase/sql/00_bootstrap.sql`
