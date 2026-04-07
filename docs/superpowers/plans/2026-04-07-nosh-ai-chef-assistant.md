# Nosh AI Chef Assistant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform RecipeBox into Nosh — a chat-first AI kitchen buddy that auto-imports recipes from links, text, images, and video, auto-categorizes them, and acts as an interactive cooking companion.

**Architecture:** Replace the Home tab with a Nosh Chat tab. Redesign the Recipes tab with category-based filtering. Add two new Supabase Edge Functions for image and video recipe extraction using Gemini 2.5 Flash. Clean up vestigial calorie-tracking code. Rebrand the entire app from RecipeBox to Nosh.

**Tech Stack:** React Native (Expo), TypeScript, Supabase Edge Functions (Deno), Google Gemini 2.5 Flash API, AsyncStorage, Expo Image Picker

**Spec:** `docs/superpowers/specs/2026-04-07-nosh-ai-chef-assistant-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `app/(tabs)/chat.tsx` | Nosh Chat tab — main chat UI, message list, input bar, import orchestration |
| `hooks/useNoshChat.ts` | Chat state management — messages, persistence, AI calls, import routing |
| `utils/contentDetector.ts` | Detect input type (URL, video URL, text, image) and route to correct pipeline |
| `utils/importOrchestrator.ts` | Orchestrate recipe import from any source — calls import functions, adds category, saves |
| `components/chat/ChatMessageBubble.tsx` | Render a single chat message (text or recipe card) |
| `components/chat/RecipeCardInline.tsx` | Inline recipe card shown in chat after successful import |
| `components/chat/ChatInput.tsx` | Chat input bar with text field, attach button, send button |
| `supabase/functions/parse-image-recipe/index.ts` | Edge Function: image → Gemini vision → structured recipe JSON |
| `supabase/functions/parse-video-recipe/index.ts` | Edge Function: video URL → Gemini → structured recipe JSON |

### Modified Files
| File | What Changes |
|------|-------------|
| `types/index.ts` | Add `MealCategory` type, add `category` field to `Meal`, add `NoshChatMessage` type, remove `RecipeFolder`/`RecipeFolderMap` |
| `app/(tabs)/_layout.tsx` | Replace Home tab with Chat tab, update icon |
| `app/(tabs)/recipes.tsx` | Replace folder-based UI with category chips + search + filtered grid |
| `hooks/useMealsStore.ts` | Remove `cookMeal`, `checkIngredientsAvailability`, `getRecommendedMeals`. Add category backfill for existing meals. |
| `hooks/useRecipeChat.ts` | Change `role: 'coach'` to `role: 'assistant'` |
| `constants/brand.ts` | Update all branding from RecipeBox to Nosh, update personality |
| `utils/recipe/contextBuilder.ts` | No changes needed (already chef-focused) |
| `utils/recipeChefPrompt.ts` | Update persona description |
| `app.json` | Update name, slug, scheme, permissions text to Nosh |
| `app/(tabs)/index.tsx` | Delete (replaced by `chat.tsx`) |

### Deleted Files
| File | Why |
|------|-----|
| `hooks/useRecipeFoldersStore.ts` | Folders replaced by auto-categories |
| `components/folders/AddToFolderSheet.tsx` | Folder UI removed |
| `components/folders/CreateFolderSheet.tsx` | Folder UI removed |
| `components/folders/FolderCard.tsx` | Folder UI removed |
| `components/folders/RenameFolderSheet.tsx` | Folder UI removed |
| `components/folders/RecipeFolderCard.tsx` | Folder UI removed |
| `components/folders/AddRecipesModal.tsx` | Folder UI removed |
| `components/folders/AddRecipesSheet.tsx` | Folder UI removed |
| `components/folders/NewFolderModal.tsx` | Folder UI removed |

---

## Task 1: Types — Add MealCategory, NoshChatMessage, Clean Up Folder Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add MealCategory type and update Meal interface**

In `types/index.ts`, add the `MealCategory` type after the `ItemCategory` type (line 21), and add `category` to the `Meal` interface:

```typescript
// After line 21 (after ItemCategory closing semicolon)

export type MealCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snacks'
  | 'appetizers'
  | 'desserts'
  | 'drinks'
  | 'sides';

export const MEAL_CATEGORIES: MealCategory[] = [
  'breakfast', 'lunch', 'dinner', 'snacks', 'appetizers', 'desserts', 'drinks', 'sides',
];

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  appetizers: 'Appetizers',
  desserts: 'Desserts',
  drinks: 'Drinks',
  sides: 'Sides',
};
```

Then add `category?: MealCategory;` to the `Meal` interface (after `sourceUrl?` on line 34). Make it optional so existing meals without a category still load:

```typescript
export interface Meal {
  id: string;
  name: string;
  description: string;
  ingredients: MealIngredient[];
  steps: string[];
  image?: string;
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  sourceUrl?: string;
  category?: MealCategory; // NEW — auto-assigned by Nosh on import
  nutritionPerServing?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}
```

- [ ] **Step 2: Add NoshChatMessage type**

Add at the end of `types/index.ts` (before the re-export line):

```typescript
// Nosh Chat Types
export interface NoshChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recipeCard?: Meal;
  isProcessing?: boolean;
}
```

- [ ] **Step 3: Remove RecipeFolder types**

Delete lines 177-186 from `types/index.ts`:

```typescript
// DELETE these lines:
// export interface RecipeFolder { ... }
// export type RecipeFolderMap = Record<string, RecipeFolder>;
```

- [ ] **Step 4: Change RecipeChatMessage role type in useRecipeChat.ts**

In `hooks/useRecipeChat.ts`, change the `RecipeChatMessage` type (line 11):

```typescript
// Change from:
role: 'user' | 'coach';
// To:
role: 'user' | 'assistant';
```

And update `pushCoach` function name and role (line 56-58):

```typescript
// Change from:
function pushCoach(msg: Omit<RecipeChatMessage, 'id' | 'role'>) {
  setMessages(prev => [...prev, { id: newId(), role: 'coach', source: msg.source || 'ai', ...msg }]);
}
// To:
function pushAssistant(msg: Omit<RecipeChatMessage, 'id' | 'role'>) {
  setMessages(prev => [...prev, { id: newId(), role: 'assistant', source: msg.source || 'ai', ...msg }]);
}
```

Update the two call sites of `pushCoach` to `pushAssistant` (line 90 placeholder and line 103 error handler).

- [ ] **Step 5: Verify the app still compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Fix any type errors from the RecipeFolder removal (other files may import it — check and remove those imports).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts hooks/useRecipeChat.ts
git commit -m "feat: add MealCategory, NoshChatMessage types; remove RecipeFolder; rename coach→assistant"
```

---

## Task 2: Branding — Rebrand from RecipeBox to Nosh

**Files:**
- Modify: `constants/brand.ts`
- Modify: `app.json`
- Modify: `utils/recipeChefPrompt.ts`

- [ ] **Step 1: Update brand.ts**

Replace the entire file `constants/brand.ts`:

```typescript
// Nosh brand constants and voice guidelines
// Centralized place for app-wide naming, voice and copy strings

export const APP_NAME = 'Nosh';
export const APP_SLUG = 'nosh';
export const APP_SCHEME = 'nosh';
export const APP_WEBSITE = 'https://nosh.app'; // placeholder domain

// Chat storage keys
export const CHAT_STORAGE_KEY = 'nosh_chat_history';
export const LEGACY_CHAT_STORAGE_KEY = 'nutriai_chat_history';

// Welcome strings used across onboarding/chat
export const NOSH_WELCOME_TITLE = 'Welcome to Nosh!';
export const NOSH_WELCOME_MESSAGE =
  "I'm your kitchen buddy — send me any recipe (link, photo, TikTok) and I'll save it to your collection. Let's cook!";

// Nosh's first message in chat
export const NOSH_FIRST_MESSAGE =
  "Hey! I'm Nosh, your kitchen buddy 👨‍🍳 Send me any recipe — a link, a photo, a TikTok — and I'll save it to your collection. Or just ask me anything about cooking!";

// Persona, tone, and safety rules (short form for UI and prompts)
export const NOSH_PERSONA = {
  oneLiner:
    'A quirky, enthusiastic AI kitchen buddy — like a friend who\'s really into cooking.',
  traits: ['curious', 'enthusiastic', 'playful', 'warm', 'opinionated-but-kind'] as const,
  principles: [
    'Casual, punchy language; short sentences, not essays',
    'Gets excited about good recipes; celebrates the user',
    'Has opinions but isn\'t pushy ("I\'d add lemon, but that\'s just me!")',
    'Occasional emojis, not overdone',
    'Respect allergies/diets strictly; safety first',
    'Gives unsolicited pro tips when relevant',
  ],
};

// System rules for general chat prompts (long form)
export const NOSH_SYSTEM_RULES = [
  'You are Nosh, a quirky and enthusiastic kitchen buddy. You\'re like a friend who\'s really into cooking — casual, playful, knowledgeable, and always excited to help.',
  'Keep responses short and punchy. 1-3 sentences max unless the user asks for detail.',
  'Use casual language with occasional emojis. Get excited about good recipes.',
  'Have opinions but don\'t be pushy. Share pro tips naturally.',
  'Respect allergies and dietary restrictions strictly. Safety first.',
  'Stay culinary — no medical advice, no calorie counting, no nutrition coaching.',
  'When a recipe is imported, respond with enthusiasm and a brief summary.',
].join('\n');

// Title for structured recipe/chef style prompts
export const NOSH_CHEF_TITLE = 'Nosh — Your Kitchen Buddy';

// Reusable subtitles
export const NOSH_HEADER_SUBTITLE = 'Your AI kitchen buddy';
```

- [ ] **Step 2: Update app.json**

Update `app.json` — change name, slug, scheme, and all permission strings from "RecipeBox" to "Nosh":

```json
{
  "expo": {
    "name": "Nosh",
    "slug": "nosh",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "nosh",
    ...
    "ios": {
      ...
      "bundleIdentifier": "com.nosh.app",
      ...
      "infoPlist": {
        "NSCameraUsageDescription": "Nosh uses your camera to capture recipe images.",
        "NSPhotoLibraryUsageDescription": "Nosh needs access to your photo library to import recipe images.",
        "NSMicrophoneUsageDescription": "Nosh may use the microphone for voice input features.",
        ...
      }
    },
    "android": {
      "package": "com.nosh.app",
      ...
    },
    "plugins": [
      ["expo-camera", {
        "cameraPermission": "Nosh uses your camera to capture recipe images.",
        "microphonePermission": "Nosh may use the microphone for voice input."
      }],
      "expo-font",
      ["expo-image-picker", {
        "photosPermission": "Nosh needs access to your photos to import recipe images."
      }]
    ],
    ...
  }
}
```

- [ ] **Step 3: Update recipeChefPrompt.ts persona line**

In `utils/recipeChefPrompt.ts` line 5, change:

```typescript
// From:
'You are Nosh\'s Kitchen Companion - a helpful sous-chef for this recipe.',
// To:
'You are Nosh — a quirky, enthusiastic kitchen buddy helping with this recipe.',
```

- [ ] **Step 4: Commit**

```bash
git add constants/brand.ts app.json utils/recipeChefPrompt.ts
git commit -m "feat: rebrand from RecipeBox to Nosh — update brand constants, app config, persona"
```

---

## Task 3: Content Detector — Route Input to the Right Pipeline

**Files:**
- Create: `utils/contentDetector.ts`

- [ ] **Step 1: Create contentDetector.ts**

```typescript
/**
 * Detects the type of content the user sent in chat and routes to the
 * correct import pipeline.
 */

export type ContentType = 'video_url' | 'recipe_url' | 'image' | 'text';

const VIDEO_PATTERNS = [
  /(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/i,
  /tiktok\.com\//i,
  /instagram\.com\/(?:reel|p)\//i,
  /facebook\.com\/.*\/videos\//i,
];

const URL_PATTERN = /https?:\/\/[^\s]+/i;

/**
 * Determine what kind of content the user submitted.
 *
 * @param text     – the chat message text
 * @param hasImage – whether an image attachment is included
 */
export function detectContentType(text: string, hasImage: boolean): ContentType {
  if (hasImage) return 'image';

  const trimmed = text.trim();

  // Check for video URLs first (more specific than generic URL)
  for (const pattern of VIDEO_PATTERNS) {
    if (pattern.test(trimmed)) return 'video_url';
  }

  // Check for any URL
  if (URL_PATTERN.test(trimmed)) return 'recipe_url';

  // Everything else is text
  return 'text';
}

/**
 * Extract the first URL from a string.
 */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

/**
 * Check if text looks like it might contain recipe content
 * (has ingredients-like words or step-like structure).
 */
export function looksLikeRecipe(text: string): boolean {
  const lower = text.toLowerCase();
  const recipeSignals = [
    /\d+\s*(cup|tbsp|tsp|oz|lb|g|ml|tablespoon|teaspoon)/i,
    /ingredient/i,
    /step\s*\d/i,
    /preheat|sauté|simmer|bake|fry|chop|dice|mix|stir|fold/i,
    /serves?\s*\d/i,
    /prep\s*time|cook\s*time/i,
  ];
  const matches = recipeSignals.filter(r => r.test(lower));
  return matches.length >= 2;
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/contentDetector.ts
git commit -m "feat: add content detector for routing chat input to import pipelines"
```

---

## Task 4: Import Orchestrator — Process Any Recipe Source and Auto-Save

**Files:**
- Create: `utils/importOrchestrator.ts`

- [ ] **Step 1: Create importOrchestrator.ts**

This module ties together the existing import functions with new image/video pipelines. It auto-assigns a category and returns a ready-to-save `Meal`.

```typescript
/**
 * Import orchestrator — processes recipe content from any source,
 * auto-assigns a category, and returns a Meal ready to save.
 */

import { Meal, MealCategory, MealIngredient } from '@/types';
import { importRecipe } from '@/utils/recipeImport';
import { createChatCompletion, ChatMessage } from '@/utils/aiClient';
import { ContentType, extractUrl, looksLikeRecipe } from '@/utils/contentDetector';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export interface ImportResult {
  success: boolean;
  meal?: Meal;
  error?: string;
  /** If the content wasn't a recipe, the AI should respond conversationally */
  isConversation?: boolean;
}

/**
 * Main entry: detect content type and process accordingly.
 */
export async function orchestrateImport(
  text: string,
  contentType: ContentType,
  imageBase64?: string,
): Promise<ImportResult> {
  try {
    switch (contentType) {
      case 'recipe_url':
        return await importFromUrl(text);
      case 'video_url':
        return await importFromVideoUrl(text);
      case 'image':
        if (!imageBase64) return { success: false, error: 'No image data provided' };
        return await importFromImage(imageBase64);
      case 'text':
        if (looksLikeRecipe(text)) {
          return await importFromText(text);
        }
        return { success: false, isConversation: true };
      default:
        return { success: false, isConversation: true };
    }
  } catch (err: any) {
    console.error('[ImportOrchestrator] Error:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to process recipe' };
  }
}

// ---------------------------------------------------------------------------
// URL Import (delegates to existing recipeImport.ts)
// ---------------------------------------------------------------------------
async function importFromUrl(text: string): Promise<ImportResult> {
  const url = extractUrl(text);
  if (!url) return { success: false, error: 'Could not find a URL in the message' };

  const imported = await importRecipe(url, 'url', { useAI: true });
  if (!imported) return { success: false, error: 'Could not extract a recipe from that link' };

  const category = await categorizeRecipe(imported.title || '', imported.ingredients?.map((i: any) => i.name || i.original || '') || []);

  const meal = importedToMeal(imported, category);
  return { success: true, meal };
}

// ---------------------------------------------------------------------------
// Text Import (delegates to existing recipeImport.ts)
// ---------------------------------------------------------------------------
async function importFromText(text: string): Promise<ImportResult> {
  const imported = await importRecipe(text, 'text', { useAI: true });
  if (!imported) return { success: false, error: 'Could not parse a recipe from that text' };

  const category = await categorizeRecipe(imported.title || '', imported.ingredients?.map((i: any) => i.name || i.original || '') || []);

  const meal = importedToMeal(imported, category);
  return { success: true, meal };
}

// ---------------------------------------------------------------------------
// Image Import (calls parse-image-recipe Edge Function)
// ---------------------------------------------------------------------------
async function importFromImage(imageBase64: string): Promise<ImportResult> {
  const res = await callEdgeFunction('parse-image-recipe', { image: imageBase64 });
  if (!res.success) return { success: false, error: res.error || 'Failed to extract recipe from image' };
  return { success: true, meal: res.meal };
}

// ---------------------------------------------------------------------------
// Video Import (calls parse-video-recipe Edge Function)
// ---------------------------------------------------------------------------
async function importFromVideoUrl(text: string): Promise<ImportResult> {
  const url = extractUrl(text);
  if (!url) return { success: false, error: 'Could not find a video URL' };

  const res = await callEdgeFunction('parse-video-recipe', { url });
  if (!res.success) return { success: false, error: res.error || 'Failed to extract recipe from video' };
  return { success: true, meal: res.meal };
}

// ---------------------------------------------------------------------------
// Shared: Call an Edge Function
// ---------------------------------------------------------------------------
async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; meal?: Meal; error?: string }> {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${functionName}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { success: false, error: `Edge function error (${res.status}): ${errText.slice(0, 200)}` };
  }

  const data = await res.json();
  if (!data.name && !data.title) {
    return { success: false, error: 'No recipe found in response' };
  }

  // Normalize Edge Function response to Meal
  const meal: Meal = {
    id: Date.now().toString(),
    name: data.title || data.name || 'Untitled Recipe',
    description: data.description || '',
    ingredients: normalizeIngredients(data.ingredients || []),
    steps: data.steps || data.instructions || [],
    image: data.image || undefined,
    tags: data.tags || [],
    prepTime: data.prepTime || data.prep_time || 0,
    cookTime: data.cookTime || data.cook_time || 0,
    servings: data.servings || 1,
    category: data.category || 'dinner',
    sourceUrl: data.sourceUrl || data.source_url || undefined,
    nutritionPerServing: data.nutritionPerServing || undefined,
  };

  return { success: true, meal };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeIngredients(ingredients: any[]): MealIngredient[] {
  return ingredients.map((ing: any) => ({
    name: ing.name || ing.original || 'Unknown',
    quantity: typeof ing.quantity === 'number' ? ing.quantity : (typeof ing.amount === 'number' ? ing.amount : 1),
    unit: ing.unit || '',
    optional: !!ing.optional,
  }));
}

function importedToMeal(imported: any, category: MealCategory): Meal {
  return {
    id: Date.now().toString(),
    name: imported.title || imported.name || 'Untitled Recipe',
    description: imported.description || '',
    ingredients: normalizeIngredients(imported.ingredients || []),
    steps: imported.instructions || imported.steps || [],
    image: imported.image || undefined,
    tags: imported.tags || imported.categories || [],
    prepTime: imported.prepTime || imported.prepTimeMinutes || 0,
    cookTime: imported.cookTime || imported.cookTimeMinutes || 0,
    servings: imported.servings || 1,
    category,
    sourceUrl: imported.sourceUrl || imported.source || undefined,
    nutritionPerServing: imported.nutrition || undefined,
  };
}

/**
 * Use AI to categorize a recipe into a MealCategory.
 */
async function categorizeRecipe(title: string, ingredientNames: string[]): Promise<MealCategory> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You categorize recipes. Respond with ONLY one word from this list: breakfast, lunch, dinner, snacks, appetizers, desserts, drinks, sides. Nothing else.',
      },
      {
        role: 'user',
        content: `Recipe: "${title}". Ingredients: ${ingredientNames.slice(0, 10).join(', ')}. Category?`,
      },
    ];
    const response = await createChatCompletion(messages);
    const cat = response.trim().toLowerCase() as MealCategory;
    const valid: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'appetizers', 'desserts', 'drinks', 'sides'];
    return valid.includes(cat) ? cat : 'dinner';
  } catch {
    return 'dinner'; // safe fallback
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/importOrchestrator.ts
git commit -m "feat: add import orchestrator — routes any content to correct pipeline, auto-categorizes"
```

---

## Task 5: Nosh Chat Hook — State, Persistence, AI Calls

**Files:**
- Create: `hooks/useNoshChat.ts`

- [ ] **Step 1: Create useNoshChat.ts**

```typescript
/**
 * useNoshChat — manages the main Nosh chat state.
 *
 * Handles: message history, AsyncStorage persistence, AI calls,
 * import orchestration, and active recipe context.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NoshChatMessage, Meal } from '@/types';
import { createChatCompletion, ChatMessage } from '@/utils/aiClient';
import { detectContentType } from '@/utils/contentDetector';
import { orchestrateImport, ImportResult } from '@/utils/importOrchestrator';
import { useMeals } from '@/hooks/useMealsStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { buildAIContext } from '@/utils/aiContext';
import { NOSH_SYSTEM_RULES, NOSH_FIRST_MESSAGE, CHAT_STORAGE_KEY } from '@/constants/brand';

const MAX_HISTORY = 100; // max messages to persist

export function useNoshChat() {
  const [messages, setMessages] = useState<NoshChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Meal | null>(null);
  const { addMeal, meals } = useMeals();
  const { profile } = useUserProfile();
  const idSeq = useRef(0);
  const loaded = useRef(false);

  const newId = () => `nosh-${Date.now()}-${idSeq.current++}`;

  // Load messages from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as NoshChatMessage[];
          setMessages(parsed.filter(m => !m.isProcessing)); // remove stale processing states
        } else {
          // First-time: show welcome message
          setMessages([{
            id: newId(),
            role: 'assistant',
            content: NOSH_FIRST_MESSAGE,
            timestamp: Date.now(),
          }]);
        }
      } catch (e) {
        console.warn('[NoshChat] Failed to load history', e);
      } finally {
        loaded.current = true;
      }
    })();
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (!loaded.current) return;
    const toSave = messages.slice(-MAX_HISTORY).filter(m => !m.isProcessing);
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave)).catch(console.warn);
  }, [messages]);

  // ----- Message helpers -----

  function pushMessage(msg: Omit<NoshChatMessage, 'id' | 'timestamp'>): string {
    const id = newId();
    setMessages(prev => [...prev, { ...msg, id, timestamp: Date.now() }]);
    return id;
  }

  function updateMessage(id: string, updates: Partial<NoshChatMessage>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }

  // ----- Build system prompt -----

  function buildSystemPrompt(): string {
    const parts = [NOSH_SYSTEM_RULES];

    // Add user profile context
    const userCtx = buildAIContext({ profile });
    if (userCtx) parts.push(`\nUSER PROFILE:\n${userCtx}`);

    // Add active recipe context
    if (activeRecipe) {
      const ingList = activeRecipe.ingredients.map(i => `- ${i.quantity} ${i.unit} ${i.name}`).join('\n');
      const stepList = activeRecipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      parts.push(`\nACTIVE RECIPE (user may ask follow-up questions about this):`);
      parts.push(`Title: ${activeRecipe.name}`);
      parts.push(`Category: ${activeRecipe.category || 'uncategorized'}`);
      parts.push(`Servings: ${activeRecipe.servings}`);
      parts.push(`Prep: ${activeRecipe.prepTime}min | Cook: ${activeRecipe.cookTime}min`);
      parts.push(`Ingredients:\n${ingList}`);
      parts.push(`Steps:\n${stepList}`);
    }

    // Add saved recipe awareness
    if (meals.length > 0) {
      const recipeList = meals.slice(0, 20).map(m => `- ${m.name} (${m.category || 'uncategorized'})`).join('\n');
      parts.push(`\nUSER'S SAVED RECIPES (${meals.length} total):\n${recipeList}`);
    }

    return parts.join('\n');
  }

  // ----- Send message -----

  const sendMessage = useCallback(async (text: string, imageBase64?: string) => {
    const hasImage = !!imageBase64;
    const contentType = detectContentType(text, hasImage);
    const isImport = contentType !== 'text' || (contentType === 'text' && hasImage);

    // Add user message
    pushMessage({ role: 'user', content: text });

    if (isImport || (contentType === 'text' && (await shouldTryImport(text)))) {
      // ----- Import flow -----
      const processingId = pushMessage({
        role: 'assistant',
        content: getProcessingMessage(contentType),
        isProcessing: true,
      });

      try {
        const result = await orchestrateImport(text, contentType, imageBase64);

        if (result.success && result.meal) {
          // Auto-save to meals store
          const savedId = addMeal(result.meal);
          const savedMeal = { ...result.meal, id: savedId };
          setActiveRecipe(savedMeal);

          // Update processing message with success
          const summary = buildSaveSummary(savedMeal);
          updateMessage(processingId, {
            content: summary,
            recipeCard: savedMeal,
            isProcessing: false,
          });
        } else if (result.isConversation) {
          // Not a recipe — handle as regular chat
          updateMessage(processingId, { content: '', isProcessing: false });
          setMessages(prev => prev.filter(m => m.id !== processingId));
          await sendChatMessage(text);
        } else {
          // Import failed
          updateMessage(processingId, {
            content: result.error || "Hmm, I couldn't extract a recipe from that. Try sending a direct link, pasting the recipe text, or snapping a photo of it 📸",
            isProcessing: false,
          });
        }
      } catch (err: any) {
        updateMessage(processingId, {
          content: "Oops, something went wrong! Try again or paste the recipe as text instead 🙏",
          isProcessing: false,
        });
      }
    } else {
      // ----- Regular chat -----
      await sendChatMessage(text);
    }
  }, [activeRecipe, meals, profile]);

  // ----- Regular AI chat -----

  async function sendChatMessage(text: string) {
    const processingId = pushMessage({
      role: 'assistant',
      content: '…',
      isProcessing: true,
    });

    try {
      setIsTyping(true);
      const systemPrompt = buildSystemPrompt();
      const recentMessages = messages.slice(-10);

      const aiMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: text },
      ];

      const response = await createChatCompletion(aiMessages);
      updateMessage(processingId, {
        content: response.trim(),
        isProcessing: false,
      });
    } catch (err: any) {
      console.warn('[NoshChat] AI error', err?.message);
      updateMessage(processingId, {
        content: "Sorry, I'm having trouble thinking right now. Try again in a sec! 🤔",
        isProcessing: false,
      });
    } finally {
      setIsTyping(false);
    }
  }

  // ----- Clear chat -----

  const clearChat = useCallback(async () => {
    const welcome: NoshChatMessage = {
      id: newId(),
      role: 'assistant',
      content: NOSH_FIRST_MESSAGE,
      timestamp: Date.now(),
    };
    setMessages([welcome]);
    setActiveRecipe(null);
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([welcome]));
  }, []);

  return {
    messages,
    isTyping,
    activeRecipe,
    sendMessage,
    clearChat,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProcessingMessage(type: string): string {
  switch (type) {
    case 'video_url': return "Ooh, a cooking video! Let me watch this and grab the recipe 🎬👨‍🍳";
    case 'recipe_url': return "Nice link! Let me pull that recipe out for you 🔗";
    case 'image': return "Let me take a look at that photo 📸👨‍🍳";
    default: return "Let me check this out! 👨‍🍳";
  }
}

function buildSaveSummary(meal: Meal): string {
  const emoji = getCategoryEmoji(meal.category);
  const catLabel = meal.category ? meal.category.charAt(0).toUpperCase() + meal.category.slice(1) : 'Recipes';
  const ingCount = meal.ingredients?.length || 0;
  const time = (meal.prepTime || 0) + (meal.cookTime || 0);
  const timeStr = time > 0 ? `, ${time} min` : '';
  const servStr = meal.servings > 0 ? `, serves ${meal.servings}` : '';

  return `Saved! ${emoji} **${meal.name}** → ${catLabel}. ${ingCount} ingredients${timeStr}${servStr}. What else you got?`;
}

function getCategoryEmoji(category?: string): string {
  const map: Record<string, string> = {
    breakfast: '🥞', lunch: '🥗', dinner: '🍝', snacks: '🍿',
    appetizers: '🥟', desserts: '🍰', drinks: '🥤', sides: '🥦',
  };
  return map[category || ''] || '🍽️';
}

/**
 * Quick heuristic: should we try importing this plain text as a recipe?
 */
async function shouldTryImport(text: string): Promise<boolean> {
  // Import the function dynamically to avoid circular imports at module level
  const { looksLikeRecipe } = await import('@/utils/contentDetector');
  return looksLikeRecipe(text);
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useNoshChat.ts
git commit -m "feat: add useNoshChat hook — chat state, persistence, import routing, AI conversations"
```

---

## Task 6: Chat UI Components

**Files:**
- Create: `components/chat/ChatMessageBubble.tsx`
- Create: `components/chat/RecipeCardInline.tsx`
- Create: `components/chat/ChatInput.tsx`

- [ ] **Step 1: Create ChatMessageBubble.tsx**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NoshChatMessage } from '@/types';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import RecipeCardInline from './RecipeCardInline';

interface Props {
  message: NoshChatMessage;
  onRecipePress?: (meal: NoshChatMessage['recipeCard']) => void;
}

export default React.memo(function ChatMessageBubble({ message, onRecipePress }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.isProcessing ? (
          <Text style={[styles.text, styles.processingText]}>{message.content}</Text>
        ) : (
          <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
            {message.content}
          </Text>
        )}
        {message.recipeCard && (
          <RecipeCardInline
            meal={message.recipeCard}
            onPress={() => onRecipePress?.(message.recipeCard)}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleUser: {
    backgroundColor: Colors.secondary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textUser: {
    color: '#fff',
  },
  textAssistant: {
    color: Colors.text,
  },
  processingText: {
    color: Colors.lightText,
    fontStyle: 'italic',
  },
});
```

- [ ] **Step 2: Create RecipeCardInline.tsx**

```typescript
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Meal, MEAL_CATEGORY_LABELS } from '@/types';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface Props {
  meal: Meal;
  onPress?: () => void;
}

export default React.memo(function RecipeCardInline({ meal, onPress }: Props) {
  const totalTime = (meal.prepTime || 0) + (meal.cookTime || 0);
  const categoryLabel = meal.category ? MEAL_CATEGORY_LABELS[meal.category] : undefined;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {meal.image ? (
        <Image source={{ uri: meal.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{meal.name}</Text>
        <View style={styles.meta}>
          {categoryLabel && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
          )}
          {totalTime > 0 && <Text style={styles.metaText}>{totalTime} min</Text>}
          <Text style={styles.metaText}>{meal.ingredients?.length || 0} ingredients</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginTop: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 72,
    height: 72,
  },
  imagePlaceholder: {
    backgroundColor: Colors.gray?.[100] || '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  categoryBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
  },
});
```

- [ ] **Step 3: Create ChatInput.tsx**

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Send, ImagePlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface Props {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const caption = text.trim() || 'Extract the recipe from this image';
      onSend(caption, result.assets[0].base64);
      setText('');
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.attachBtn} onPress={handleImagePick} disabled={disabled}>
        <ImagePlus size={22} color={Colors.lightText} />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Paste a recipe link, or ask me anything..."
        placeholderTextColor={Colors.lightText}
        multiline
        maxLength={4000}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={Platform.OS !== 'web'}
      />

      <TouchableOpacity
        style={[styles.sendBtn, canSend && styles.sendBtnActive]}
        onPress={handleSend}
        disabled={!canSend}
      >
        <Send size={20} color={canSend ? '#fff' : Colors.lightText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray?.[200] || '#e0e0e0',
  },
  sendBtnActive: {
    backgroundColor: Colors.secondary,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add components/chat/
git commit -m "feat: add chat UI components — message bubbles, inline recipe cards, input bar"
```

---

## Task 7: Chat Tab Screen

**Files:**
- Create: `app/(tabs)/chat.tsx`
- Delete: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create chat.tsx**

```typescript
import React, { useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNoshChat } from '@/hooks/useNoshChat';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { NoshChatMessage } from '@/types';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

export default function ChatScreen() {
  const { messages, isTyping, sendMessage } = useNoshChat();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const handleSend = useCallback((text: string, imageBase64?: string) => {
    sendMessage(text, imageBase64);
    // Scroll to bottom after a tick
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [sendMessage]);

  const renderMessage = useCallback(({ item }: { item: NoshChatMessage }) => (
    <ChatMessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: NoshChatMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.messageList, { paddingTop: Spacing.md }]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />

      <ChatInput onSend={handleSend} disabled={isTyping} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messageList: {
    paddingBottom: Spacing.md,
  },
});
```

- [ ] **Step 2: Delete index.tsx**

Delete `app/(tabs)/index.tsx` — the Home tab is replaced by the Chat tab.

```bash
git rm app/(tabs)/index.tsx
```

- [ ] **Step 3: Update _layout.tsx — replace Home tab with Chat tab**

In `app/(tabs)/_layout.tsx`, make these changes:

1. Remove the `DashboardIcon` import (line 4). Add a chat icon import — use the `MessageCircle` icon from lucide-react-native:

```typescript
// Remove this line:
// import DashboardIcon from '@/assets/icons/Dashboard.svg';

// Add:
import { MessageCircle } from 'lucide-react-native';
```

2. In the `tabBarIcon` function, replace the `index` case (lines 50-54) with the `chat` case:

```typescript
if (route.name === 'chat') return (
  <View style={wrapStyle}>
    <MessageCircle size={size * 0.5} color={iconColor} strokeWidth={focused ? 2.5 : 2} />
  </View>
);
```

3. Replace the `index` Tabs.Screen (line 79) with:

```typescript
<Tabs.Screen name="chat" options={{ title: 'Nosh' }} />
```

- [ ] **Step 4: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/chat.tsx app/(tabs)/_layout.tsx
git commit -m "feat: add Nosh Chat tab replacing Home — chat-first recipe import experience"
```

---

## Task 8: Recipes Tab — Category-Based Library

**Files:**
- Modify: `app/(tabs)/recipes.tsx`

- [ ] **Step 1: Rewrite recipes.tsx with categories**

This is a significant rewrite. The new Recipes tab has:
- Functional search bar filtering by recipe name or ingredient
- Horizontal category chips (All, Breakfast, Lunch, etc.)
- 2-column grid of recipe cards filtered by selected category
- No folders — all folder imports and UI removed

Replace the entire file. Key structural elements:

1. **State:** `selectedCategory` (string, default 'all'), `searchQuery` (string).
2. **Filtered meals:** Filter `meals` by category (if not 'all') and by search query (match name or ingredient names).
3. **Category chips:** Horizontal ScrollView with pressable chips. "All" plus each `MEAL_CATEGORIES` entry. Show count per category.
4. **Recipe grid:** FlatList with `numColumns={2}`, rendering compact recipe cards.
5. **No folder imports** — remove all `useRecipeFolders`, `CreateFolderSheet`, `RenameFolderSheet`, `AddToFolderSheet` references.
6. **Keep:** ImportRecipeModal (FAB to import), MealDetailModal (tap a recipe card to view details).

The existing file is 931 lines. The rewrite should be under 300 lines since we're removing all folder logic, the Discover tab, and external recipe handling.

Core filtering logic:

```typescript
const filteredMeals = useMemo(() => {
  let result = meals;

  // Filter by category
  if (selectedCategory !== 'all') {
    result = result.filter(m => m.category === selectedCategory);
  }

  // Filter by search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.ingredients?.some(i => i.name.toLowerCase().includes(q))
    );
  }

  // Sort by most recent first
  return [...result].reverse();
}, [meals, selectedCategory, searchQuery]);
```

Category chips with counts:

```typescript
const categoryCounts = useMemo(() => {
  const counts: Record<string, number> = { all: meals.length };
  MEAL_CATEGORIES.forEach(cat => {
    counts[cat] = meals.filter(m => m.category === cat).length;
  });
  return counts;
}, [meals]);
```

- [ ] **Step 2: Remove all folder component imports and usage**

Ensure no references to:
- `useRecipeFolders` / `useRecipeFoldersStore`
- `CreateFolderSheet`, `RenameFolderSheet`, `AddToFolderSheet`
- `FolderCard`, `RecipeFolderCard`
- Any folder state variables

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/recipes.tsx
git commit -m "feat: redesign Recipes tab — category chips, search, filtered grid (replaces folders)"
```

---

## Task 9: Clean Up — Remove Folders, Vestigial Code

**Files:**
- Delete: `hooks/useRecipeFoldersStore.ts`
- Delete: all files in `components/folders/`
- Modify: `hooks/useMealsStore.ts`

- [ ] **Step 1: Delete folder files**

```bash
git rm hooks/useRecipeFoldersStore.ts
git rm -r components/folders/
```

- [ ] **Step 2: Clean up useMealsStore.ts**

Remove `cookMeal`, `checkIngredientsAvailability`, and `getRecommendedMeals` functions (lines 190-239) and their entries in the return object (lines 248-250).

The return object should become:

```typescript
return {
  meals,
  isLoading,
  addMeal,
  updateMeal,
  removeMeal,
  resetMeals,
  setMeals,
};
```

- [ ] **Step 3: Remove folder references from _layout.tsx provider tree**

Check `app/_layout.tsx` — if `RecipeFoldersProvider` is in the provider hierarchy, remove it and its import.

- [ ] **Step 4: Search for remaining broken imports**

```bash
grep -r "useRecipeFolders\|RecipeFolderCard\|FolderCard\|CreateFolderSheet\|AddToFolderSheet\|RenameFolderSheet\|cookMeal\|checkIngredientsAvailability\|getRecommendedMeals" --include="*.ts" --include="*.tsx" -l
```

Fix any remaining references.

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove folder system, vestigial inventory code, clean up meals store"
```

---

## Task 10: Edge Function — Image Recipe Import

**Files:**
- Create: `supabase/functions/parse-image-recipe/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
/**
 * parse-image-recipe Edge Function
 *
 * Accepts a base64 image, sends it to Google Gemini 2.5 Flash for
 * recipe extraction (OCR + understanding), returns structured recipe JSON.
 *
 * Required secrets:
 *   GEMINI_API_KEY — Google AI API key
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Analyze this image and extract the recipe.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "Recipe Name",
  "description": "Brief description",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "ingredients": [
    {"name": "ingredient name", "quantity": 1, "unit": "cup"}
  ],
  "steps": ["Step 1 text", "Step 2 text"],
  "tags": ["tag1", "tag2"],
  "category": "dinner",
  "image": null
}

For category, use exactly one of: breakfast, lunch, dinner, snacks, appetizers, desserts, drinks, sides.
If you cannot determine a field, use reasonable defaults. Quantities should be numbers.
If the image does not contain a recipe, return: {"error": "No recipe found in image"}`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError) return authError;

    if (!GEMINI_API_KEY) {
      return jsonError('Gemini API not configured', 503);
    }

    const body = await req.json();
    const { image } = body as { image: string };

    if (!image) {
      return jsonError('image (base64) is required', 400);
    }

    // Call Gemini Vision API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiBody = {
      contents: [{
        parts: [
          { text: RECIPE_EXTRACTION_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: image,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('[parse-image-recipe] Gemini error', geminiRes.status, errText.slice(0, 500));
      return jsonError(`Gemini API error (${geminiRes.status})`, 502);
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON response
    let recipe;
    try {
      recipe = JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        recipe = JSON.parse(jsonMatch[1]);
      } else {
        return jsonError('Failed to parse recipe from image', 422);
      }
    }

    if (recipe.error) {
      return jsonError(recipe.error, 422);
    }

    // Normalize field names for client
    const normalized = {
      title: recipe.title || 'Untitled Recipe',
      name: recipe.title || 'Untitled Recipe',
      description: recipe.description || '',
      servings: recipe.servings || 1,
      prepTime: recipe.prep_time || recipe.prepTime || 0,
      cookTime: recipe.cook_time || recipe.cookTime || 0,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || recipe.instructions || [],
      tags: recipe.tags || [],
      category: recipe.category || 'dinner',
      image: recipe.image || null,
    };

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[parse-image-recipe] error', err);
    return jsonError('Internal error', 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/parse-image-recipe/
git commit -m "feat: add parse-image-recipe Edge Function — Gemini vision recipe extraction"
```

---

## Task 11: Edge Function — Video Recipe Import

**Files:**
- Create: `supabase/functions/parse-video-recipe/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
/**
 * parse-video-recipe Edge Function
 *
 * Accepts a video URL (YouTube, TikTok, Instagram Reel), sends it to
 * Google Gemini 2.5 Flash for recipe extraction, returns structured JSON.
 *
 * For YouTube: passes URL directly to Gemini (no download needed).
 * For TikTok/Instagram: uses Gemini's file upload via URL fetch.
 *
 * Required secrets:
 *   GEMINI_API_KEY — Google AI API key
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Watch this cooking video carefully.

Read ALL text shown on screen (ingredients, measurements, steps, titles).
Listen to ALL narration and spoken instructions.
Extract the complete recipe.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "ingredients": [
    {"name": "ingredient name", "quantity": 1, "unit": "cup"}
  ],
  "steps": ["Step 1 text", "Step 2 text"],
  "tags": ["cuisine-type", "meal-type"],
  "category": "dinner",
  "source_url": "original video URL"
}

For category, use exactly one of: breakfast, lunch, dinner, snacks, appetizers, desserts, drinks, sides.
If quantities are shown for multiple servings, keep them as-is and set servings accordingly.
If you cannot determine a field, use reasonable defaults. Quantities should be numbers.
If the video does not contain a recipe, return: {"error": "No recipe found in video"}`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError) return authError;

    if (!GEMINI_API_KEY) {
      return jsonError('Gemini API not configured', 503);
    }

    const body = await req.json();
    const { url } = body as { url: string };

    if (!url) {
      return jsonError('url is required', 400);
    }

    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);

    let recipe;

    if (isYouTube) {
      // YouTube: pass URL directly to Gemini (supported natively)
      recipe = await extractWithYouTubeUrl(url);
    } else {
      // TikTok/Instagram: try to fetch video and upload to Gemini Files API
      recipe = await extractWithVideoDownload(url);
    }

    if (!recipe) {
      return jsonError('Could not extract recipe from video', 422);
    }

    if (recipe.error) {
      return jsonError(recipe.error, 422);
    }

    // Normalize for client
    const normalized = {
      title: recipe.title || 'Untitled Recipe',
      name: recipe.title || 'Untitled Recipe',
      description: recipe.description || '',
      servings: recipe.servings || 1,
      prepTime: recipe.prep_time || recipe.prepTime || 0,
      cookTime: recipe.cook_time || recipe.cookTime || 0,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || recipe.instructions || [],
      tags: recipe.tags || [],
      category: recipe.category || 'dinner',
      sourceUrl: recipe.source_url || url,
      image: recipe.image || null,
    };

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[parse-video-recipe] error', err);
    return jsonError('Internal error', 500);
  }
});

// ---------------------------------------------------------------------------
// YouTube — pass URL directly to Gemini
// ---------------------------------------------------------------------------
async function extractWithYouTubeUrl(url: string): Promise<any> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const geminiBody = {
    contents: [{
      parts: [
        { text: RECIPE_EXTRACTION_PROMPT },
        {
          file_data: {
            file_uri: url,
            mime_type: 'video/*',
          },
        },
      ],
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[parse-video-recipe] Gemini YouTube error', res.status, errText.slice(0, 500));
    // Fall back to download approach
    return extractWithVideoDownload(url);
  }

  return parseGeminiResponse(await res.json());
}

// ---------------------------------------------------------------------------
// Generic video — download then upload to Gemini Files API
// ---------------------------------------------------------------------------
async function extractWithVideoDownload(url: string): Promise<any> {
  // Step 1: Upload to Gemini Files API using the URL
  // Gemini can fetch URLs directly via the Files API
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;

  // First, try fetching the video
  let videoResponse: Response;
  try {
    videoResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Nosh/1.0)',
      },
      redirect: 'follow',
    });
  } catch (fetchErr) {
    console.error('[parse-video-recipe] Failed to fetch video URL', fetchErr);
    // Fallback: try text-based extraction by asking Gemini about the URL
    return extractTextFallback(url);
  }

  if (!videoResponse.ok || !videoResponse.body) {
    return extractTextFallback(url);
  }

  const videoBlob = await videoResponse.arrayBuffer();
  const contentType = videoResponse.headers.get('content-type') || 'video/mp4';

  // Upload to Gemini Files API
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-Goog-Upload-Protocol': 'raw',
    },
    body: videoBlob,
  });

  if (!uploadRes.ok) {
    console.error('[parse-video-recipe] Gemini upload error', uploadRes.status);
    return extractTextFallback(url);
  }

  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri;

  if (!fileUri) {
    return extractTextFallback(url);
  }

  // Step 2: Generate content with uploaded file
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const geminiBody = {
    contents: [{
      parts: [
        { text: RECIPE_EXTRACTION_PROMPT },
        {
          file_data: {
            file_uri: fileUri,
            mime_type: contentType,
          },
        },
      ],
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  if (!res.ok) {
    console.error('[parse-video-recipe] Gemini generate error', res.status);
    return extractTextFallback(url);
  }

  return parseGeminiResponse(await res.json());
}

// ---------------------------------------------------------------------------
// Text fallback — ask Gemini to reason about the URL without video
// ---------------------------------------------------------------------------
async function extractTextFallback(url: string): Promise<any> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const geminiBody = {
    contents: [{
      parts: [{
        text: `I have a cooking video at this URL: ${url}

I couldn't download the video directly. Based on the URL and any metadata you can infer, please try to identify what recipe this might be about. If you can determine the recipe, return it as JSON.

${RECIPE_EXTRACTION_PROMPT}

If you truly cannot determine the recipe from the URL alone, return: {"error": "Could not access video. Try pasting the recipe as text or sending a screenshot instead."}`,
      }],
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  if (!res.ok) return { error: 'Could not process video. Try pasting the recipe as text.' };
  return parseGeminiResponse(await res.json());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseGeminiResponse(json: any): any {
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1]); } catch {}
    }
    return { error: 'Failed to parse recipe from video response' };
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/parse-video-recipe/
git commit -m "feat: add parse-video-recipe Edge Function — Gemini 2.5 Flash video recipe extraction"
```

---

## Task 12: Update Onboarding Copy & Final Polish

**Files:**
- Modify: Onboarding screen files (welcome screen)
- Modify: `utils/aiContext.ts` (remove inventory references)

- [ ] **Step 1: Update onboarding welcome copy**

Find the welcome screen in `app/(onboarding)/` and replace "RecipeBox" with "Nosh" in any title, subtitle, or body text. Use the constants from `constants/brand.ts`:

```typescript
import { NOSH_WELCOME_TITLE, NOSH_WELCOME_MESSAGE } from '@/constants/brand';
```

- [ ] **Step 2: Clean up aiContext.ts**

The file is already clean (only 20 lines, no inventory/calorie references). No changes needed.

- [ ] **Step 3: Verify full app compilation**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any remaining type errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: update onboarding copy to Nosh, final polish pass"
```

---

## Task 13: Deploy Edge Functions

- [ ] **Step 1: Set Gemini API key as Supabase secret**

The user must set `GEMINI_API_KEY` in the Supabase dashboard under Functions → Environment variables.

- [ ] **Step 2: Deploy parse-image-recipe**

```bash
supabase functions deploy parse-image-recipe --project-ref <PROJECT_REF>
```

- [ ] **Step 3: Deploy parse-video-recipe**

```bash
supabase functions deploy parse-video-recipe --project-ref <PROJECT_REF>
```

- [ ] **Step 4: Test image import**

Send a photo of a recipe to the chat and verify it's parsed and saved.

- [ ] **Step 5: Test video import**

Send a YouTube cooking video URL to the chat and verify recipe extraction.

- [ ] **Step 6: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: edge function deployment fixes from testing"
```
