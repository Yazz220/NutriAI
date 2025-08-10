# NutriAI

NutriAI is a comprehensive mobile application designed to revolutionize your kitchen management experience. From intelligent inventory tracking to smart meal planning and automated shopping lists, NutriAI helps you reduce food waste, save money, and streamline your cooking routine.

## ✨ Features

### 📦 Inventory (Core)
- Smart categorization and expiration tracking with "Expiring Soon" surfacing
- Fast add: manual entry, barcode scan, and camera capture
- Powerful search and filters

### 🍽️ Recipes + Planner (Consolidated)
- Single screen with a top toggle: "Recipes" | "Planner"
- Availability badges: Can Make Now / Missing Few Items
- AI Picks header with proactive suggestions (from `useCoach`)
- Weekly planning integrated directly in the Recipes tab

### 🛒 Shopping List
- Auto-generate from planned recipes and missing ingredients
- "Mark as Purchased" flow prompts for expiry, then moves items to Inventory
- Toast notifications with Undo for safe, reversible actions

### 📊 Nutrition Dashboard
- Daily macro totals vs goals and weekly trend snapshots
- Proactive "Right Now" suggestions
- Conversational assistant via `useCoachChat`

### 🌐 Recipe Import
- Import from URLs (e.g., TikTok/Instagram/websites)
- Client-side parsing via JSON-LD/Open Graph metadata
- Preview before save, with smart follow-ups: "Add to Planner", "Add missing ingredients"

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

### Recipe Providers

- __Default: TheMealDB__
  - Free, no signup required. Test key `'1'` works out of the box.
  - Env: `EXPO_PUBLIC_MEALDB_API_KEY` (use `1` unless you have a Patreon key).
  - The app initializes the recipe provider with TheMealDB automatically in `components/RecipeProviderInitializer.tsx`.
- __Other providers (legacy support)__: Spoonacular, Edamam
  - Kept for compatibility but not used by default. You may adapt `RecipeProviderInitializer.tsx` to initialize a different provider if desired.

Notes:
- The web proxy `EXPO_PUBLIC_RECIPES_PROXY_BASE` is supported for CORS-only scenarios on web. Native apps (iOS/Android) call providers directly.

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
   Or to connect via a tunnel (often more reliable on restricted networks):
   ```sh
   npx expo start --tunnel
   ```

2. Scan the QR code with the Expo Go app on your mobile device.

3. **Getting Started with NutriAI**:
   - **Add Inventory**: Start by adding items to your inventory using manual entry, barcode scanning, or camera capture
   - **Plan Meals**: Use the Recipes tab toggle to switch to Planner and schedule your week
   - **Explore Recipes**: Browse and see availability based on your inventory
   - **Generate Shopping Lists**: Create smart lists from your plan and missing ingredients

## 🎯 Key Workflows

### Adding Inventory Items
1. Tap the "+" button in the Inventory tab
2. Choose your preferred input method (manual, barcode, camera, or voice)
3. Fill in item details including expiration date and category
4. Items automatically appear in your organized inventory

### Planning Meals (in Recipes)
1. Go to the Recipes tab and switch to the "Planner" toggle
2. Tap any day in the weekly view and select meal type (breakfast, lunch, dinner, snack)
3. Add recipes from your library or AI Picks
4. Your plan updates automatically and informs the Shopping List

### Smart Shopping
1. Plan your meals for the week
2. Review or auto-generate your Shopping List from missing ingredients
3. Check off items as you shop; marking as purchased prompts expiry and transfers to Inventory

## 📱 App Structure

NutriAI uses a 4-tab layout focused on core nutrition workflows:

1. **Inventory** — Item management and expiry tracking
2. **Recipes** — Library + Planner (toggle at top)
3. **Shopping List** — Grocery management and checkout to Inventory
4. **Nutrition Dashboard** — Macros, goals, and proactive insights
 
## 📷 Screenshots

Add images or GIFs to showcase core flows:
- Recipes/Planner toggle
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
  ...                    # Routes for screens and modals
components/              # Reusable components (e.g., InventoryItemCard)
hooks/                   # State and AI hooks (e.g., useNutrition, useCoach)
utils/                   # Availability calculations, validation, etc.
constants/               # Colors, spacing, theme tokens
types/                   # TypeScript types and interfaces
```

## 🔧 Development

### Code Organization

The project follows a clean architecture pattern with clear separation of concerns:

- **Components**: Reusable UI components with consistent styling
- **Hooks**: Custom hooks for state management and business logic
- **Utils**: Pure functions for calculations and data transformations
- **Types**: Comprehensive TypeScript definitions for type safety

### Key Design Principles

- **Mobile-First**: Optimized for touch interactions and mobile screen sizes
- **Accessibility**: Built with accessibility best practices
- **Performance**: Efficient rendering and state management
- **User Experience**: Intuitive navigation and clear visual feedback

## 🚀 Next Potential Enhancements

- Batch "Checkout" for shopping list
- "Mark eaten" directly from the planner
- Settings modal for nutrition goals
- Enhanced recipe import with auto-actions
- Visual progress charts in the Nutrition Dashboard

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