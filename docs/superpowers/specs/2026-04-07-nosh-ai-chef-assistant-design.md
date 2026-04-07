# Nosh — AI Chef Assistant Design Spec

**Date:** 2026-04-07
**Branch:** recipe-app
**Approach:** A — Chat Tab + Clean Up (1.5–2 weeks)

---

## 1. Product Vision

Transform RecipeBox into **Nosh** — an AI kitchen buddy that accepts recipes from any format (links, text, images, video), auto-processes and organizes them into a personal recipe library, and acts as an interactive cooking companion.

**Key differentiator:** Unlike recipe-import tools (e.g., Recipe.me), Nosh is a conversational AI assistant. It doesn't just parse — it understands recipes, answers follow-up questions, suggests substitutions, adjusts servings, and gives cooking tips.

---

## 2. Navigation & Tab Structure

**Current:** Home | Recipes | Plan | Shopping | Profile (5 tabs)
**New:** Nosh (Chat) | Recipes | Plan | Shopping | Profile (5 tabs)

### Changes

- **Home tab → Nosh Chat tab** — The current Home screen (quick import CTA + recent recipes + stats cards) is replaced by the Nosh chat interface. This is the default landing tab.
- **Recipes tab** — Redesigned with auto-categories (see Section 4).
- **Plan, Shopping, Profile tabs** — No changes.
- **Per-recipe chat modal** (`RecipeChatModal`) — Stays. When viewing a recipe in the Recipes tab, users can still open a contextual chat about that specific recipe. The main Chat tab is for general conversation + imports.
- **Tab icon:** Chef hat or chat bubble icon, labeled "Nosh".

---

## 3. Chat Tab — The Nosh Experience

### Interface

- Standard vertical chat UI with messages scrolling up.
- Input bar at bottom with: text field, attach button (camera/photo picker for images), link paste detection.
- When a URL is pasted, Nosh auto-detects the format (recipe page, video URL) and begins processing.

### Import Flow — Auto-Process, Auto-Save

1. User sends recipe content (link / text / image / video URL).
2. Nosh shows a brief processing message (e.g., "Ooh, let me check this out! 👨‍🍳").
3. Nosh parses the recipe, auto-assigns a meal category, and **saves immediately** — no confirmation step.
4. Nosh responds with a summary: "Saved! 🍝 **Garlic Butter Pasta** → Dinner. 6 ingredients, 20 min prep, serves 4. What else you got?"
5. Recipe appears in the Recipes tab under the correct category.

### Post-Save — Context-Aware Assistance

After saving, the recipe becomes the active context. Users can immediately follow up:

- **"Make it for 1 person"** → Nosh recalculates quantities and updates the saved recipe.
- **"I don't have heavy cream"** → Nosh suggests substitutions.
- **"What pairs well with this?"** → Nosh suggests sides or drinks.
- **"Is this gluten-free?"** → Nosh checks ingredients against user's dietary profile.
- **"Break down the steps for me"** → Simplified step-by-step walkthrough.
- **"How long will leftovers keep?"** → Storage tips.

When the user sends a new recipe, context shifts to the new one.

### General Chat (Non-Import)

- Cooking questions: "How do I poach an egg?"
- Suggestions: "What's a quick weeknight dinner?"
- Library queries: "What breakfast recipes do I have?"
- Casual food conversation.

### Chat Persistence

- Messages persist locally via AsyncStorage.
- History available when user returns to the tab.
- Not synced to Supabase for MVP.

### First-Open Message

"Hey! I'm Nosh, your kitchen buddy 👨‍🍳 Send me any recipe — a link, a photo, a TikTok — and I'll save it to your collection. Or just ask me anything about cooking!"

---

## 4. Recipes Tab — Organized Library

### Current State

Flat list of saved recipes with user-created folders. Search bar exists but non-functional.

### New Design

**Auto-categorization:** When Nosh processes a recipe, it assigns a meal category based on the recipe content.

**Fixed categories:**
- Breakfast
- Lunch
- Dinner
- Snacks
- Appetizers
- Desserts
- Drinks / Smoothies
- Sides

**Layout:**
- **Top:** Functional search bar — filters by recipe name, ingredient, or tag.
- **Below search:** Horizontal scrolling category chips/pills (All, Breakfast, Lunch, Dinner, etc.).
- **Main area:** Recipe cards in a 2-column grid, filtered by the selected category.
- **Each card shows:** Image (or placeholder), recipe name, prep time, ingredient count.
- **Default view:** "All" category, sorted by most recently added.

**Folders removed:** The `useRecipeFoldersStore` hook and all folder UI components are removed. Categories are auto-assigned by Nosh — users don't manually organize.

---

## 5. Import Sources — Technical Architecture

### URL Import (Already Built)

- Fetch page HTML → extract JSON-LD / microdata / Open Graph.
- AI fallback if no structured data found.
- Existing code: `utils/recipeImport.ts` → `importFromUrl()`.

### Text Import (Already Built)

- AI parses pasted text into structured recipe.
- Existing code: `utils/recipeImport.ts` → `importFromText()`.

### Image Import (New)

- User attaches a photo (recipe card, cookbook page, screenshot).
- Image sent to AI vision API via a new Supabase Edge Function.
- AI extracts recipe text and structures it into the standard recipe format.
- Pattern to follow: existing `ai-nutrition-scan` Edge Function and `utils/visionClient.ts`.
- New Edge Function: `supabase/functions/parse-image-recipe/index.ts`.

### Video Import (New)

- User pastes a TikTok, YouTube, or Instagram Reel URL.
- **Pipeline:**
  1. Nosh detects video URL pattern in chat input.
  2. Request sent to new Edge Function: `supabase/functions/parse-video-recipe/index.ts`.
  3. Edge Function calls a companion download service (lightweight Node.js service on Railway/Fly.io) that uses yt-dlp to download the video file.
  4. Video file sent to **Google Gemini 2.5 Flash** API with a prompt to extract the full recipe — reads on-screen text (OCR), listens to narration, identifies ingredients + steps.
  5. Gemini returns structured recipe JSON.
  6. Edge Function validates against Recipe type schema and returns to client.
  7. For YouTube: Gemini accepts YouTube URLs directly (no download needed).

- **Why Gemini 2.5 Flash:**
  - Native video input — processes both visual frames AND audio simultaneously.
  - Built-in OCR — reads text overlays on screen (critical for TikTok/Reels where recipes are shown as text, not narrated).
  - Cost: ~$0.002 per 30-second video. Negligible at any indie scale.
  - Single API call handles everything — no need to orchestrate Whisper + OCR + LLM separately.

- **Fallback:** If video can't be downloaded (private, geo-restricted, deleted), Nosh asks the user to screenshot the recipe or paste it as text instead.

- **Secrets required (Supabase Function env):**
  - `GEMINI_API_KEY` — Google AI API key for Gemini 2.5 Flash.

### URL Detection Logic

The chat input handler detects content type:
- Matches `youtube.com`, `youtu.be`, `tiktok.com`, `instagram.com/reel` → video pipeline.
- Matches `http://` or `https://` (other domains) → URL import pipeline.
- Contains an attached image → image pipeline.
- Plain text → text import pipeline (if it looks like a recipe) or general chat.

---

## 6. Branding & Personality

### App Identity

- **Name:** Nosh
- **Slug:** nosh
- **Scheme:** nosh (for deep links: `nosh://auth/callback`)
- Update in: `app.json`, splash screen, onboarding screens, `constants/brand.ts`.

### AI Personality — Quirky Home Cook Friend

**Voice characteristics:**
- Casual, enthusiastic, uses food metaphors.
- Short punchy messages — not essays.
- Occasional emojis, not overdone.
- Has opinions but isn't pushy.
- Gets excited about good recipes.
- Gives little unsolicited tips ("Pro tip: toast the garlic in butter on low heat 🧈").

**System prompt update:**
- Remove all nutrition-coach, calorie-tracking, and health-goal references.
- Focus: recipe extraction, cooking knowledge, ingredient substitutions, meal ideas, kitchen tips.
- Persona: "You are Nosh, a quirky and enthusiastic kitchen buddy. You're like a friend who's really into cooking — casual, playful, knowledgeable, and always excited to help."

**Files to update:**
- `constants/brand.ts` — new personality description, remove nutrition references.
- `utils/recipe/contextBuilder.ts` — chef-focused system prompts.
- `utils/aiContext.ts` — general AI context, remove calorie/inventory references.

---

## 7. Cleanup — Remove Vestigial Code

| Item | File(s) | Action |
|------|---------|--------|
| `cookMeal()` inventory alert | `MealDetailModal.tsx` | Remove alert text about inventory deduction. Simplify to mark-as-completed. |
| `checkIngredientsAvailability()` | `useMealsStore.ts`, `useRecipeStore.ts` | Remove functions and all call sites. |
| Weight/height/BMI fields | `useUserProfile.ts`, `useEnhancedUserProfile.ts` | Remove `weight`, `weightKg`, `targetWeightKg`, `bmi` fields. Not collected or displayed. |
| `role: 'coach'` in chat types | `types/index.ts`, chat components | Rename to `role: 'assistant'`. |
| MealDB integration stubs | `useRecipeStore.ts` | Remove `externalRecipes`, `searchResults`, `trendingRecipes` state and unused API functions. |
| Folder system | `useRecipeFoldersStore.ts`, folder components | Remove entirely — replaced by auto-categories. |
| Nutrition enrichment on load | `useMealsStore.ts` calls to `utils/nutrition/compute.ts` | Keep computation (for optional nutrition display on cards), but remove any calorie-tracking UI references. |
| Image/video "not available" placeholders | `ImportRecipeModal.tsx` | Remove placeholders — these modes are now implemented via chat. |

---

## 8. Data Flow

### Recipe Import (Chat → Library)

```
User sends content in Chat tab
        |
        v
Chat input handler detects type (URL / video / image / text)
        |
        v
Routes to appropriate import function:
  - importFromUrl() (existing)
  - importFromText() (existing)
  - parseImageRecipe() Edge Function (new)
  - parseVideoRecipe() Edge Function (new)
        |
        v
AI extracts structured recipe + assigns meal category
        |
        v
useMealsStore.addMeal() saves to AsyncStorage
        |
        v
Recipe appears in Recipes tab under assigned category
        |
        v
Nosh confirms in chat: "Saved! 🍝 Recipe Name → Category"
        |
        v
Recipe becomes active context — user can ask follow-up questions
```

### Category Assignment

The AI prompt for all import pipelines includes:

"Assign this recipe to exactly one category: Breakfast, Lunch, Dinner, Snacks, Appetizers, Desserts, Drinks, or Sides. Base this on the recipe content, ingredients, and typical meal context."

The category is stored as a field on the `Meal` type (new field: `category: MealCategory`).

---

## 9. Type Changes

### New/Modified Types (in `types/index.ts`)

```typescript
// New meal category type
type MealCategory = 
  | 'breakfast' 
  | 'lunch' 
  | 'dinner' 
  | 'snacks' 
  | 'appetizers' 
  | 'desserts' 
  | 'drinks' 
  | 'sides';

// Add to existing Meal type
interface Meal {
  // ... existing fields
  category: MealCategory;  // NEW — auto-assigned by AI on import
}

// Chat message role update
interface RecipeChatMessage {
  role: 'user' | 'assistant';  // Changed from 'coach'
  content: string;
  timestamp: number;
}

// New: Chat message with optional recipe card
interface NoshChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recipeCard?: Meal;          // Attached when Nosh saves a recipe
  isProcessing?: boolean;     // Shows loading state
}
```

---

## 10. New Edge Functions

### `parse-image-recipe`

- **Input:** Base64 image data + user dietary profile.
- **Output:** Structured recipe JSON (title, ingredients, steps, category, prep/cook time, servings).
- **AI provider:** Google Gemini 2.5 Flash (same provider as video import — one API key, consistent behavior).
- **Auth:** JWT verification (existing pattern).

### `parse-video-recipe`

- **Input:** Video URL (TikTok, YouTube, Instagram Reel).
- **Output:** Structured recipe JSON.
- **Pipeline:**
  1. If YouTube URL → pass directly to Gemini 2.5 Flash (no download needed).
  2. If TikTok/Instagram → call companion download service → get video file → send to Gemini.
- **AI provider:** Google Gemini 2.5 Flash.
- **Auth:** JWT verification.
- **Secrets:** `GEMINI_API_KEY`.

### Companion Video Download Service

- Lightweight Node.js service hosted on Railway or Fly.io.
- Single endpoint: `POST /download` — accepts a video URL, returns the video file (or a temporary URL to it).
- Uses yt-dlp (installed as a binary) to download from TikTok/Instagram/YouTube.
- Required because Supabase Edge Functions (Deno runtime) cannot run Python binaries.

---

## 11. What Stays Unchanged

- **Meal Plan tab** — weekly planner, no changes.
- **Shopping List tab** — add items, mark complete, no changes.
- **Profile tab** — dietary prefs, cooking prefs, sign out, no changes (except branding).
- **Onboarding** — 4 steps (welcome, dietary prefs, allergies, restrictions) — update copy to say "Nosh" instead of "RecipeBox".
- **Auth** — Supabase email/password, no changes.
- **Recipe detail view** — existing card/detail screens, add category badge display.
- **Per-recipe chat modal** — stays for contextual recipe help from within the Recipes tab.

---

## 12. Scope Summary

| Work Item | Type | Effort | Priority |
|-----------|------|--------|----------|
| Chat tab — new Nosh chat UI as tab 1 | New screen | Medium | P0 |
| Chat-based import — detect content type, route to pipeline, auto-save | New logic | Medium | P0 |
| Auto-categorization — AI assigns meal category on import | AI prompt update | Small | P0 |
| Recipes tab redesign — category chips, filtered grid, working search | Modify existing | Medium | P0 |
| Branding update — Nosh everywhere (app.json, splash, onboarding, brand constants) | Update | Small | P0 |
| Personality update — new system prompts, chef tone | Update | Small | P0 |
| Image import — new Edge Function with vision API | New backend | Medium | P1 |
| Video import — new Edge Function + Gemini 2.5 Flash + download service | New backend | Large | P1 |
| Remove folders — strip folder UI and hooks | Cleanup | Small | P1 |
| Vestigial code cleanup — inventory refs, weight fields, dead hooks, coach→assistant | Cleanup | Small | P2 |

**Estimated total:** ~1.5–2 weeks.

**P0 = ship-blocking.** Chat tab, recipe categories, branding, personality.
**P1 = core differentiator.** Image/video import, folder removal.
**P2 = polish.** Code cleanup, tech debt.
