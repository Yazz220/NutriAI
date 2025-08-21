# NutriAI

NutriAI is a comprehensive mobile application designed to revolutionize your kitchen management experience. From intelligent inventory tracking to smart meal planning and automated shopping lists, NutriAI helps you reduce food waste, save money, and streamline your cooking routine.

## ✨ Features

### 📦 Inventory (Core)
- Smart categorization and expiration tracking with "Expiring Soon" surfacing
- Fast add: manual entry, barcode scan, and camera capture
- Powerful search and filters
- **Enhanced Folder System**: Create folders to organize recipes with multi-select functionality
- **Improved Modal UX**: Better empty states and streamlined "Add Recipes" flow

### 🧠 Coach Dashboard
- **Enhanced Architecture**: Modular component structure with extracted reusable components (`DayCell`, `DateCarousel`, `WeekRings`, `ChatModal`, `CoachErrorBoundary`)
- **Performance Optimized**: React.memo and useCallback optimizations for smooth interactions
- **Improved Error Handling**: Comprehensive error boundaries with development-friendly error reporting
- **Visual Dashboard**: Calorie ring, macros, meal rows, and intuitive day/week navigation
- **Smart Planning**: Plan meals inline per day (Breakfast/Lunch/Dinner/Snack) using the + button
- **AI Assistant**: Floating chat assistant for "Plan my day/week" and shopping list actions
- **Component Library**: Reusable date utilities and performance-optimized components

### 🛒 Shopping List
- Auto-generate from planned recipes and missing ingredients
- "Mark as Purchased" flow prompts for expiry, then moves items to Inventory
- Toast notifications with Undo for safe, reversible actions
- One-tap "Add Missing Ingredients" from the recipe page action bar

### 📊 Nutrition Dashboard
- Daily macro totals vs goals and weekly trend snapshots
- Proactive "Right Now" suggestions
- Conversational assistant via `useCoachChat`

### 🌐 Recipe Import
- **Enhanced Video Import**: Improved React Native compatibility and error handling
- **Better STT Integration**: Optimized audio processing for YouTube Shorts and videos
- **Robust Error Recovery**: User-friendly error messages and fallback options
- Import from URLs (e.g., TikTok/Instagram/websites)
- Client-side parsing via JSON-LD/Open Graph metadata
- Full-screen preview before saving, with inline editing of title/description/ingredients/steps
- "Improve with AI" button to refine parsed content (deterministic, user-controlled)
- Save actions: "Save" and "Save & Add to Folder" (with folder selection)
- Smart follow-ups: "Add to Plan", "Add missing ingredients"
- Centralized, versioned prompts with deterministic AI (temperature=0, top_p=0)
- Strict policies: conservative | verbatim | enrich; default is conservative (no guessing)
- Abstain logic on insufficient evidence (video thresholds: ≥70% for ingredients/steps)
- Telemetry for provenance: policy, support rates, evidence sizes, abstain reasons

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS version recommended)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device.

### Installation

1. Clone the repository to your local machine:
   ```sh
   git clone <YOUR_REPOSITORY_URL>
   ```
2. Navigate into the project directory:
   ```sh
   cd NutriAI
   ```
3. Install the required NPM packages. If you encounter peer dependency issues, you may need to use the `--legacy-peer-deps` flag.
   ```sh
   npm install --legacy-peer-deps
   ```

### Environment Setup

1. Create your `.env` from the template
   ```sh
   # macOS/Linux
   cp env.example .env
   # Windows PowerShell
   Copy-Item env.example .env
   ```
2. Edit `.env`
   - Expo public vars must be prefixed with `EXPO_PUBLIC_`
   - Prefer using a backend proxy for AI calls instead of embedding secrets
   - See `env.example` for placeholders (AI, Firebase/AWS, feature flags)
   - For recipes, NutriAI now defaults to TheMealDB provider. Add:
     ```env
     # TheMealDB uses a free public key '1' by default
     EXPO_PUBLIC_MEALDB_API_KEY=1
     # Optional (usually not needed for TheMealDB, but available for web CORS workarounds)
     EXPO_PUBLIC_RECIPES_PROXY_BASE=
     ```

## 🍳 Recipe Import Pipeline (Prompts, Policies, Abstain, Telemetry)

NutriAI standardizes all import flows (text, image, video, URL JSON‑LD, reconciliation) through a centralized prompt registry and deterministic AI settings.

- __Centralized Prompts__: `utils/promptRegistry.ts` generates system prompts with versioning and per‑flow policies.
- __Deterministic AI__: `utils/aiClient.ts:createChatCompletionDeterministic()` uses temperature=0, top_p=0 for reproducible outputs.
- __Policies__:
  - __conservative__ (default): No hallucinations or invention. Only evidence‑supported items.
  - __verbatim__: Map JSON‑LD/Open Graph exactly to our schema. No enrichment.
  - __enrich__: Allows AI to enhance if explicitly enabled.
- __Abstain Logic__: If evidence is insufficient, the importer returns an "abstain" outcome instead of guessing.
  - For video/shorts, import requires ≥0.7 support for both ingredients and steps.
- __Reconciliation__: A final AI pass can remove unsupported items and annotate notes.
- __Telemetry__: `utils/importTelemetry.ts` keeps a ring buffer of recent abstains, and provenance includes:
  - `policy`, `extractionMethod`, `supportRates` (ingredient, step)
  - `evidenceSizes` (caption/transcript/ocr) and `confidence`

### UI: ImportRecipeModal

- Paste a URL or text, or attach an image/video.
- If a social video URL is detected, use "Transcribe Video" for best results.
- If a video file is attached, a "Transcribe Attached Video" button is shown.
- Preview modal supports inline editing and an optional "Improve with AI" step powered by `utils/aiRecipeParser.ts`.
- Save options include "Save" and "Save & Add to Folder"; the latter opens the folder picker.
- Preview shows provenance badges (policy, extraction method, confidence, support, evidence sizes).
- Dev helper: "View Telemetry" reveals full provenance JSON and recent abstain events (for debugging/audit).

### Environment Variables (Import Pipeline)

Add to `.env` (client‑safe):

```env
# Centralized import policy. One of: conservative | verbatim | enrich
EXPO_PUBLIC_IMPORT_POLICY=conservative

# Allow AI enrichment during import (false recommended for reliability)
EXPO_PUBLIC_IMPORT_ALLOW_ENRICH=false

# Evidence thresholds for video/shorts imports (0.0 - 1.0)
EXPO_PUBLIC_IMPORT_MIN_ING_SUPPORT=0.7
EXPO_PUBLIC_IMPORT_MIN_STEP_SUPPORT=0.7

# Telemetry level (basic|verbose). Verbose logs evidence sizes & support rates
EXPO_PUBLIC_IMPORT_TELEMETRY=basic
```

### Security

- Avoid placing provider secrets in `EXPO_PUBLIC_…` variables for production. Route AI/STT via a backend proxy (e.g., Supabase Edge Functions) and store secrets there.
- If you previously added `EXPO_PUBLIC_AI_API_KEY` for local testing, rotate the key and remove it from the client build before shipping.

### Recipe Providers

- __Default: TheMealDB__
  - Free, no signup required. Test key `'1'` works out of the box.
  - Env: `EXPO_PUBLIC_MEALDB_API_KEY` (use `1` unless you have a Patreon key).
  - The app initializes the recipe provider with TheMealDB automatically in `components/RecipeProviderInitializer.tsx`.
- __Other providers (legacy support)__: Spoonacular, Edamam
  - Kept for compatibility but not used by default. You may adapt `RecipeProviderInitializer.tsx` to initialize a different provider if desired.

Notes:
- The web proxy `EXPO_PUBLIC_RECIPES_PROXY_BASE` is supported for CORS-only scenarios on web. Native apps (iOS/Android) call providers directly.

### 📷 Dataset-backed Recipes (S3 Images)

If you use a local dataset (e.g., Epicurious CSV + images), you can host the images on S3 and point the app to HTTPS URLs.

__Assumptions__
- Table: `public.recipes`
- Columns: `image_path` holds the base filename (no extension), `image_url` is what the UI reads, optional `image` as a staging column
- Bucket: `nutriai-recipe-images-prod`

__Populate S3 HTTPS URLs into `image`__
```sql
alter table public.recipes add column if not exists image text;

update public.recipes
set image = 'https://nutriai-recipe-images-prod.s3.amazonaws.com/' || image_path || '.jpg'
where image_path is not null
  and (image is null or image = '');
```

__Make the UI use S3 immediately (copy to `image_url`)__
```sql
update public.recipes
set image_url = image
where image is not null;
```

__Optional: Switch to a CDN later (CloudFront)__
Only do this after your CDN domain works in the browser for a sample image.
```sql
update public.recipes
set image_url = replace(
  image_url,
  'https://nutriai-recipe-images-prod.s3.amazonaws.com/',
  'https://YOUR_CDN_DOMAIN/'
)
where image_url like 'https://nutriai-recipe-images-prod.s3.amazonaws.com/%';
```

__Rollback (if images stop appearing)__
```sql
update public.recipes
set image_url = 'https://nutriai-recipe-images-prod.s3.amazonaws.com/' || image_path || '.jpg'
where image_path is not null;
```

__CDN Checklist__
- Origin → S3 bucket `nutriai-recipe-images-prod.s3.amazonaws.com`
- Private bucket: set up OAC (Origin Access Control) and bucket policy to allow CloudFront
- Behavior: allow GET/HEAD; caching/compression on
- Test: `https://YOUR_CDN_DOMAIN/<image_path>.jpg` returns 200

__Troubleshooting__
- 403/404 on CDN: origin or bucket policy misconfigured, or propagation not complete (allow 5–15 min)
- Wrong domain in SQL: verify the exact prefix you replaced
- Content-Type: S3 objects should have `image/jpeg`

### Recipe Store Architecture

- The recipes feature shares a single store via `hooks/useRecipeStore.ts` using a React Context provider: `RecipeStoreProvider`.
- The app root wraps the tree with `RecipeStoreProvider` in `app/_layout.tsx` so all recipe components use the same instance.
- `components/RecipeProviderInitializer.tsx` is mounted in `app/(tabs)/recipes.tsx` to initialize the provider (defaults to TheMealDB) and warm trending recipes on first load.

## 🧭 Milestone: Supabase Backend & AI Proxy

We have integrated Supabase as the backend with a dedicated `nutriai` schema (strict RLS) and deployed an `ai-chat` Edge Function that securely proxies AI calls.

What this enables:
- Secure AI calls without exposing provider keys in the app
- Per-user data isolation via RLS on `nutriai.*` tables
- Easy backend evolution (models, rate limits, validation) without shipping new app builds

### Supabase (Nourish) configuration
- Project URL: `https://wckohtwftlwhyldnfpbz.supabase.co`
- Schema: `nutriai`
- Tables: `profiles`, `inventory_items`, `shopping_list_items`, `meal_plans`, `recipes_saved`, `ai_messages`
- Edge Function: `ai-chat` (JWT verification enabled)

### Client environment (Expo)
Add to `.env` (client-safe):
```
EXPO_PUBLIC_SUPABASE_URL=https://wckohtwftlwhyldnfpbz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>

# Optional informational values (no secrets)
EXPO_PUBLIC_AI_PROVIDER=openrouter
EXPO_PUBLIC_AI_API_BASE=https://openrouter.ai/api/v1
EXPO_PUBLIC_AI_MODEL=openai/gpt-oss-20b:free
```

### Server secrets (Supabase → Functions → ai-chat → Secrets)
- `AI_API_KEY` = your provider key (e.g., OpenRouter)
- `AI_API_BASE` = https://openrouter.ai/api/v1
- `AI_MODEL` = openai/gpt-oss-20b:free

### Test the ai-chat Edge Function
PowerShell (Windows):
```powershell
$ANON = "<YOUR_ANON_KEY>"
$headers = @{ Authorization = "Bearer $ANON"; apikey = $ANON; "Content-Type" = "application/json" }
$body = @{ messages = @(@{ role = "user"; content = "Give me a healthy dinner idea." }) } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method POST -Uri "https://wckohtwftlwhyldnfpbz.supabase.co/functions/v1/ai-chat" -Headers $headers -Body $body | ConvertTo-Json -Depth 8
```

### Frontend usage
- Use `utils/supabaseClient.ts` to access Supabase.
- Call `utils/aiClient.ts: aiChat(messages)` to get structured JSON for the chat/coach UI.

### Security notes
- Do not put AI keys in `EXPO_PUBLIC_` env vars. Keep them as Supabase Function secrets.
- RLS is enabled on all tables—reads/writes require an authenticated user.

## 🏃‍♀️ Usage

1. Start the development server:
   ```sh
   npx expo start
   ```
   Or 
   ```sh
   npx expo start --tunnel
   ```
   to connect via a tunnel (often more reliable on restricted networks):
   ```sh
  Let's start working on the project. Start by reading its details. 
   ```

2. Scan the QR code with the Expo Go app on your mobile device.

3. **Getting Started with NutriAI**:
   - **Add Inventory**: Start by adding items to your inventory using manual entry, barcode scanning, or camera capture
   - **Plan Meals**: Open the Coach tab and use the + buttons on each meal row, or ask the coach to "Plan my day/week"
   - **Explore Recipes**: Browse and see availability based on your inventory
   - **Generate Shopping Lists**: Create smart lists from your plan and missing ingredients

## 🎯 Key Workflows

### Adding Inventory Items
1. Tap the "+" button in the Inventory tab
2. Choose your preferred input method (manual, barcode, camera, or voice)
3. Fill in item details including expiration date and category
4. Items automatically appear in your organized inventory

### Planning Meals (Coach Dashboard)
1. Go to the Coach tab
2. Use the left/right arrows to pick a day
3. Tap + on Breakfast/Lunch/Dinner/Snack, select a recipe and servings
4. Or ask the coach: "Plan my day" or "Plan my week"
5. Your plan updates automatically and informs the Shopping List

### Smart Shopping
1. Plan your meals for the week
2. From any recipe page, tap "Add missing (N)" in the action bar to send missing ingredients to the Shopping List
3. Review or auto-generate your Shopping List from planned meals and missing ingredients
4. Check off items as you shop; marking as purchased prompts expiry and transfers to Inventory

## 📱 App Structure

NutriAI uses a 4-tab layout focused on core nutrition workflows:

1. **Inventory** — Item management and expiry tracking
2. **Recipes** — Library and discovery
3. **Shopping List** — Grocery management and checkout to Inventory
4. **Nutrition Dashboard** — Macros, goals, and proactive insights
 
## 📷 Screenshots

Add images or GIFs to showcase core flows:
- Coach dashboard planning
- Mark as Purchased flow with expiry prompt
- Nutrition Dashboard with macros and trends

Place files under `docs/images/` and reference here, for example:

```md
![Recipes Toggle](docs/images/recipes-toggle.png)
![Purchased Flow](docs/images/mark-purchased.gif)
![Nutrition Dashboard](docs/images/nutrition-dashboard.png)
```

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) with file-based routing
- **State Management**: Custom hooks with [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for persistence
- **UI Components**: Custom component library with consistent design system
- **Icons**: [Lucide React Native](https://lucide.dev/) for beautiful, consistent iconography
- **Camera/Audio**: [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/) and [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)
- **Languages**: [TypeScript](https://www.typescriptlang.org/) for type safety and better developer experience

## 🏗️ Project Structure (High-Level)

```
app/
  (tabs)/                # Bottom tab navigation (4 tabs)
    coach.tsx           # Main coach dashboard with refactored components
    recipes.tsx         # Recipe library with folder integration
    ...                 # Other tab screens
components/
  ui/                    # Base UI components (Button, Card, etc.)
  coach/                 # Coach-specific components
    DayCell.tsx         # Individual day component with progress rings
    DateCarousel.tsx    # Horizontal date picker with navigation
    WeekRings.tsx       # Week overview with macro progress rings
    ChatModal.tsx       # AI chat interface modal
    CoachErrorBoundary.tsx # Error handling for coach features
    index.ts            # Export interface
  folders/              # Folder management components
    AddRecipesModal.tsx # Multi-select recipe addition to folders
    CreateFolderSheet.tsx # Enhanced folder creation with empty states
    ...                 # Other folder components
  onboarding/           # Onboarding flow components
  recipe-detail/        # Recipe detail view components
  ...                   # Other component categories
hooks/                   # State and AI hooks (e.g., useNutrition, useCoach)
utils/
  coach/                # Coach-specific utilities
    dateUtils.ts        # Date manipulation and formatting
  providers/            # External service providers
  ...                   # Other utility modules
constants/               # Colors, spacing, theme tokens
types/                   # TypeScript types and interfaces
docs/                   # Documentation including Video-Import-Setup.md
```

### 🎯 Coach Architecture Enhancements

The Coach tab has been refactored with a modular architecture for better maintainability:

**Component Organization:**
- **Separation of Concerns**: Each component has a single responsibility
- **Performance Optimization**: React.memo and useCallback prevent unnecessary re-renders
- **Error Resilience**: CoachErrorBoundary catches and handles errors gracefully
- **Reusable Utilities**: Shared date utilities reduce code duplication

**Key Improvements:**
- **Reduced Bundle Size**: Extracted components can be code-split if needed
- **Better Testing**: Individual components can be unit tested in isolation
- **Enhanced Developer Experience**: Cleaner imports and better organization
- **Improved Performance**: Optimized rendering and state management
- **Error Recovery**: Graceful error handling with user-friendly messages

## 🔧 Development

### Code Organization

The project follows a clean architecture pattern with clear separation of concerns:

- **Components**: Reusable UI components with consistent styling
- **Hooks**: Custom hooks for state management and business logic
- **Utils**: Pure functions for calculations and data transformations
- **Types**: Comprehensive TypeScript definitions for type safety

### Key Design Principles

- **Mobile-First**: Optimized for touch interactions and mobile screen sizes
- **Accessibility**: Built with accessibility best practices and proper ARIA labels
- **Performance**: Efficient rendering with React.memo, useCallback, and optimized state management
- **User Experience**: Intuitive navigation, clear visual feedback, and responsive design
- **Modularity**: Component-based architecture with separation of concerns
- **Error Resilience**: Comprehensive error boundaries and graceful error recovery
- **Type Safety**: Full TypeScript implementation with strict typing

## 🚀 Recent Enhancements & Future Roadmap

### ✅ Major Completed Enhancements

#### 🗂️ Folder Management System
- **AddRecipesModal**: Multi-select interface for adding recipes to folders from library
- **Enhanced CreateFolderSheet**: Improved empty states with "Add Recipes" buttons
- **Better UX Flow**: Streamlined folder creation and recipe organization
- **Visual Improvements**: Consistent styling and better mobile responsiveness

#### 🎬 Video Import System Overhaul
- **React Native Compatibility**: Fixed browser-specific API dependencies
- **Enhanced Error Handling**: User-friendly error messages and recovery options
- **Improved STT Integration**: Better audio processing and format support
- **Robust Error Recovery**: Graceful fallbacks for failed imports
- **Environment Configuration**: Proper setup documentation and configuration

#### 🧠 Coach Tab Architecture Revolution
- **Modular Components**: Extracted `DayCell`, `DateCarousel`, `WeekRings`, `ChatModal`, `CoachErrorBoundary`
- **Performance Optimization**: React.memo, useCallback, and optimized rendering
- **Component Library**: Reusable coach-specific components with TypeScript interfaces
- **Error Handling**: Comprehensive error boundaries with development-friendly reporting
- **Date Utilities**: Shared utilities for date manipulation and formatting
- **Clean Architecture**: Better separation of concerns and maintainability

#### 🔧 Technical Improvements
- **Code Organization**: Reduced main component size from 1644 to manageable chunks
- **Type Safety**: Full TypeScript implementation with strict interfaces
- **Performance**: Optimized re-rendering and state management
- **Developer Experience**: Better imports, cleaner structure, easier testing
- **Error Resilience**: Graceful error handling throughout the application

### 🚀 Next Potential Enhancements

- Batch "Checkout" for shopping list
- "Mark eaten" directly from the planner
- Settings modal for nutrition goals
- Enhanced recipe import with auto-actions
- Visual progress charts in the Nutrition Dashboard
- Loading states and skeleton screens for better UX
- Offline state handling and data synchronization
- Advanced error recovery mechanisms

## 📚 Documentation

- Session Recap: `docs/Session-Recap.md`
- Contributing Guide: `CONTRIBUTING.md`

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/) for rapid cross-platform development
- Icons provided by [Lucide](https://lucide.dev/)
- Inspired by the need to reduce food waste and improve kitchen efficiency