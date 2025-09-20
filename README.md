# Nosh

Nosh is a comprehensive mobile application designed to revolutionize your kitchen management experience. From intelligent inventory tracking to smart meal planning and automated shopping lists, Nosh helps you reduce food waste, save money, and streamline your cooking routine.

## ✨ Features

### 📦 Inventory (Core)
- Smart categorization and fast item entry
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
  - **AI Assistant**: Floating chat assistant for "Plan my day/week" and shopping list actions. Note: AI chat is contextual and available from the Coach (floating assistant) and from each Recipe's "Ask AI" button rather than a separate tab.
- **Component Library**: Reusable date utilities and performance-optimized components

### 🛒 Shopping List
- Auto-generate from planned recipes and missing ingredients
- "Mark as Purchased" flow moves items to Inventory
- Toast notifications with Undo for safe, reversible actions
- One-tap "Add Missing Ingredients" from the recipe page action bar

### 📊 Nutrition Dashboard
- Daily macro totals vs goals and weekly trend snapshots
- Proactive "Right Now" suggestions
- Conversational assistant via `useCoachChat`

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS version recommended)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device.

### Developer notes

If you're contributing or setting up the project locally, we recommend using nvm (nvm-windows on Windows) to manage Node versions. The project is verified with Node v20.19.4 — some native packages require this minimum. Example (Windows PowerShell with nvm-windows):

```powershell
# install (if needed) and use the matching Node version
nvm install 20.19.4
nvm use 20.19.4
node -v
```

When installing dependencies, use the legacy peer deps flag to avoid peer resolution errors encountered with newer npm defaults:

```powershell
npm install --legacy-peer-deps
```

These steps will reduce EBADENGINE warnings and help ensure native modules like Skia install cleanly.

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

### FatSecret Integration (Recipes)

We use FatSecret as the primary external recipe/food provider. To keep credentials secure, the app requests a short‑lived OAuth2 access token from a Supabase Edge Function instead of storing secrets client‑side.

1. Create the token broker function

   The repository includes `supabase/functions/fatsecret-token/index.ts`. Deploy it to your Supabase project and set two function secrets:

   - `FATSECRET_CLIENT_ID`
   - `FATSECRET_CLIENT_SECRET`

   Deploy (PowerShell):

   ```powershell
   supabase functions deploy fatsecret-token --project-ref <PROJECT_REF>
   ```

2. Configure client environment

   In your `.env`, set the public token URL so the app can request an access token:

   ```env
   EXPO_PUBLIC_FATSECRET_TOKEN_URL=https://<PROJECT_REF>.supabase.co/functions/v1/fatsecret-token
   ```

   Do NOT set `FATSECRET_CLIENT_ID` or `FATSECRET_CLIENT_SECRET` in the client. Keep them only in Supabase Function secrets.

3. Run the app

   ```powershell
   npm run start
   ```
   npx expo start --tunnel

   The Recipes → Discover tab will load results via FatSecret. If the function or secrets are missing, discovery will show an empty state and log an error in the console.

## 🧭 Milestone: Supabase Backend & AI Proxy

We have integrated Supabase as the backend with a dedicated `nutriai` schema (strict RLS) and deployed an `ai-chat` Edge Function that securely proxies AI calls.

What this enables:
- Secure AI calls without exposing provider keys in the app
- Per-user data isolation via RLS on `nutriai.*` tables
- Easy backend evolution (models, rate limits, validation) without shipping new app builds

### Supabase (Nosh) configuration
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

### 🧩 Ingredient Icon Generation (Edge Functions)

Generate simple black‑and‑white outline icons for ingredients and store the images in S3 (preferred) or Supabase Storage.

__Schema & Functions__
- Schema/table: `nutriai.ingredient_icons` (see `supabase/sql/20250822_ingredient_icons.sql` for DDL, indexes, RLS, triggers).
- Edge Functions:
  - `get-ingredient-icon` — enqueue/poll helper used by the app to create or fetch the latest icon by `slug`.
  - `generate-ingredient-icon` — worker that processes rows with `status = 'pending'`, generates the PNG, uploads, and updates the row to `ready`.

__Functions Environment (set in Supabase → Project → Functions → Environment variables)__
- Provider selection
  - `ICON_PROVIDER` = `stability` (default) | `modelslab`
  - Stability: `STABILITY_API_KEY`
  - Modelslab: `MODELSLAB_API_KEY`, `MODELSLAB_MODEL_ID` (e.g., `imagen-3`), optional `MODELSLAB_ENDPOINT` (default `https://modelslab.com/api/v7/images/text-to-image`)
- Storage (pick one)
  - S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ICON_S3_BUCKET`, optional `ICON_S3_PUBLIC_BASE`, `ICON_S3_USE_PUBLIC_READ=true`
  - Supabase Storage fallback: optional `ICON_BUCKET` (default `ingredient-icons`)
- Optional: `ICON_MODEL` (for bookkeeping; e.g., `stable-image-core` or `imagen-3`)
- Prompt versioning: `ICON_PROMPT_VERSION` (default `2`) — bump to force regeneration with stricter prompt (transparent background; no text, numbers, UI frames/bars)

__Deploy__
```powershell
supabase functions deploy generate-ingredient-icon --project-ref <PROJECT_REF>
supabase functions deploy get-ingredient-icon --project-ref <PROJECT_REF>
```

__Test (PowerShell)__
```powershell
$ErrorActionPreference = "Stop"
$BASE = "https://<PROJECT_REF>.supabase.co"
$ANON = "<ANON_JWT>"
$SERVICE = "<SERVICE_JWT>"
$Slug = "yellow-onion"

# 1) Enqueue (anon)
Invoke-RestMethod -Method Get -Uri "$BASE/functions/v1/get-ingredient-icon?slug=$Slug&display_name=Yellow%20Onion" `
  -Headers @{ apikey=$ANON; Authorization="Bearer $ANON" } | ConvertTo-Json -Depth 10

# 2) Run worker (service)
Invoke-RestMethod -Method Post -Uri "$BASE/functions/v1/generate-ingredient-icon" `
  -Headers @{ apikey=$SERVICE; Authorization="Bearer $SERVICE" } | ConvertTo-Json -Depth 10

Start-Sleep -Seconds 3

# 3) Poll (anon)
Invoke-RestMethod -Method Get -Uri "$BASE/functions/v1/get-ingredient-icon?slug=$Slug" `
  -Headers @{ apikey=$ANON; Authorization="Bearer $ANON" } | ConvertTo-Json -Depth 10

# 4) Inspect last_error (service)
Invoke-RestMethod -Method Get `
  -Uri "$BASE/rest/v1/ingredient_icons?slug=eq.$Slug&select=slug,status,fail_count,last_error,updated_at&order=updated_at.desc&limit=1" `
  -Headers @{ apikey=$SERVICE; Authorization="Bearer $SERVICE"; "Accept-Profile"="nutriai"; "Content-Profile"="nutriai" } |
  ConvertTo-Json -Depth 10
```

__Troubleshooting__
- “Missing STABILITY_API_KEY” → set Functions env and redeploy.
- “Modelslab response missing image output … subscription …” → choose a model allowed by your plan or switch `ICON_PROVIDER` back to `stability`.
- S3 `AccessDenied`/`NoSuchBucket` → verify bucket, region, credentials; optionally set `ICON_S3_PUBLIC_BASE`.
- `processed: 0` after POST → no rows with `status='pending'`; reset row to pending and retry.

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

2. Scan the QR code with the Expo Go app on your mobile device.

3. **Getting Started with Nosh**:
   - **Add Inventory**: Start by adding items to your inventory using manual entry, barcode scanning, or camera capture
   - **Plan Meals**: Open the Coach tab and use the + buttons on each meal row, or ask the coach to "Plan my day/week"
   - **Explore Recipes**: Browse and see availability based on your inventory
   - **Generate Shopping Lists**: Create smart lists from your plan and missing ingredients

### ✅ Testing the Onboarding Flow

The onboarding experience is integrated with routing and persistence. If onboarding is not completed, the app automatically routes to `app/(onboarding)/`.

1. Start the app
   ```powershell
   npx expo start --tunnel
   ```
   Scan the QR with Expo Go on your device.

2. Walk through the steps
   - Welcome → Health Goals → Basic Profile → Dietary Preferences → Pantry Setup → AI Coach Intro → Completion
   - Progress is persisted locally. You can close/reopen the app and resume.

3. Complete onboarding
   - On the final screen, pick an auth option (Sign up/Sign in/Guest) and tap "Start Tracking!".
   - Your profile is mapped and saved, and onboarding is marked completed.

4. Reset onboarding for testing (developer-only)
   - In `.env`, set:
     ```env
     EXPO_PUBLIC_DEV_RESET_ONBOARDING=true
     ```
     Then restart the dev server.
   - A small "Reset onboarding (dev)" link appears on the completion screen. Tap it to clear onboarding storage and restart the flow (reload the app afterward).

Troubleshooting:
- If you completed onboarding but want to see it again without the dev link, you can also clear app storage from your device settings (Expo Go) or reinstall Expo Go.

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
4. Check off items as you shop; marking as purchased transfers to Inventory

## 📱 App Structure

Nosh uses a 4-tab layout focused on core nutrition workflows:

1. **Inventory** — Item management and categorization
2. **Recipes** — Library and discovery
3. **Shopping List** — Grocery management and checkout to Inventory
4. **Nutrition Dashboard** — Macros, goals, and proactive insights
 
## 📷 Screenshots

Add images or GIFs to showcase core flows:
- Coach dashboard planning
- Mark as Purchased flow
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