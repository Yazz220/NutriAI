# Pipeline Architecture Pivot — Decoupled Art + Text

**Date:** 2026-08-20
**Status:** Decided — implementation in progress

## Decision

Nosh's recipe production pipeline is pivoting from a single-image-generation
model to a three-engine architecture that decouples live vector typography
from generative visual artwork.

### What's changing

The legacy pipeline baked an entire cookbook page — typography, layout,
ingredients, steps, and artwork — into a single AI-generated PNG. This had
four compounding failures:

1. **Baked-in text:** Diffusion models mangle long-form typography (fractions, steps).
2. **Non-interactive:** Recipe text was frozen in pixels — unselectable, unscalable, inaccessible.
3. **Costly layouts:** Changing a visual style required a full image re-generation.
4. **Assistant disconnect:** Nosh read raw DB strings while the user saw potentially mismatched image text.

### The new architecture

Three independent engines, each doing one thing well:

1. **Multimodal Extraction (Qwen3.6-35B-A3B):** Ingests URL, text, image, video → structured Recipe Graph
2. **Culinary Reasoning / Nosh Agent (Qwen3.6-35B-A3B):** Multi-turn chat with tool calls that mutate the graph live
3. **Generative Art (Qwen Image 3 Pro):** Isolated, style-conditioned illustrations — no text, ever

The page the user sees is a composite: vector text from the typesetter +
artwork from the generator, layered at render time. Editing a recipe
re-flows text instantly with zero image re-generation cost.

## Models

| Job | Model | OpenRouter ID | Price |
|---|---|---|---|
| Extraction + Nosh brain | Qwen3.6-35B-A3B | `qwen/qwen3.6-35b-a3b` | $0.15/$1.00 per M tokens |
| Page art | Qwen Image 3 Pro | `qwen/qwen-image-3-pro` | ~$0.04/image |

Both models are accessed via OpenRouter. No second provider needed.

**Known gap:** Qwen3.6-35B-A3B does not accept audio input. Voice memo
ingestion requires a speech-to-text pre-processing step. The infrastructure
is built to expect a multimodal model, so swapping to an audio-capable
model later requires no architectural change.

## Edge Function Boundaries

### Legacy → New mapping

| Legacy Function | New Function | Change |
|---|---|---|
| `parse-recipe-source` | `extract-recipe` | One multimodal model handles all input types natively. No more separate image/video fallbacks. |
| `parse-image-recipe` | *(eliminated)* | Qwen3.6 handles images natively. |
| `parse-video-recipe` | *(eliminated)* | Qwen3.6 handles video natively. |
| `generate-cookbook-page` | `generate-page-art` | Generates isolated art only. No text, no full-page PNG. The typesetter renders the page live. |
| `ai-chat` | `nosh-chat` | Adds function calling for Nosh tools (scale, substitute, timer, guide, update). |
| `credits` | `credits` | Unchanged. |
| `delete-account` | `delete-account` | Unchanged. |

### `extract-recipe`

**Purpose:** Take any source (URL, text, image, video) and return a Recipe Graph Draft.

**Request:**
```json
{
  "type": "url" | "text" | "image" | "video",
  "input": "string (URL or text)",
  "imageBase64": "string (for image type)",
  "videoUrl": "string (for video type)"
}
```

**Response:**
```json
{
  "recipeGraph": RecipeGraphDraft,
  "confidence": number,
  "inferredFields": string[],
  "extractionNotes": string[]
}
```

**Secrets:** `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL` (now `qwen/qwen3.6-35b-a3b`)

**Key differences from `parse-recipe-source`:**
- Returns a Recipe Graph (grouped ingredients/steps, provenance, dietary tags) not a flat recipe
- Uses structured output enforcement (JSON schema) not "please respond in JSON"
- No fallback to `parse-image-recipe` / `parse-video-recipe` — the model handles image and video natively
- Tracks `inferredFields` so the page can surface "we guessed the oven temperature" notes

### `generate-page-art`

**Purpose:** Generate an isolated illustration for a cookbook page. No text. No layout. Just art.

**Request:**
```json
{
  "cookbookId": "string",
  "pageId": "string (optional, for re-generation)",
  "recipeGraph": RecipeGraph,
  "styleId": CookbookStyleId,
  "idempotencyKey": "string"
}
```

**Response (success):**
```json
{
  "artAsset": {
    "id": "string",
    "artUrl": "string (Supabase Storage URL)",
    "styleId": "string",
    "model": "qwen/qwen-image-3-pro",
    "status": "ready"
  }
}
```

**Response (processing):**
```json
{
  "status": "processing",
  "requestId": "string"
}
```

**Secrets:** `AI_API_KEY`, `AI_API_BASE`, `ART_MODEL` (now `qwen/qwen-image-3-pro`)

**Key differences from `generate-cookbook-page`:**
- Calls the OpenRouter Image API (`POST /api/v1/images`), not the OpenAI Images API
- The prompt contains NO recipe text — only the dish name, cuisine, and style descriptor
- The output is an illustration asset, not a full-page PNG
- The recipe graph is NOT stored by this function — it's passed in for context only
- Uses the cookbook style preset's `pagePromptDescriptor` and `themePrompt` for style conditioning
- Style reference images can be passed via `input_references` (up to 4)

**Art prompt construction:**
```
[Style descriptor from cookbook preset]
[Theme prompt from cookbook preset]
Illustration of [dish name], [cuisine hint if available].
[Art instructions: "hero food illustration, no text, no words, no letters, no recipe"]
Style references: [up to 4 reference images from the cookbook style preset]
```

### `nosh-chat`

**Purpose:** Multi-turn kitchen chat with tool-calling capability.

**Request:**
```json
{
  "messages": [
    { "role": "system" | "user" | "assistant", "content": "..." }
  ],
  "recipeGraph": RecipeGraph,
  "cookbookContext": {
    "title": "string",
    "styleId": "string",
    "otherRecipes": [{ "title": "string", "category": "string" }]
  },
  "tools": ["scale_servings", "substitute_ingredient", "start_timer", "guide_next_step", "update_page_data"]
}
```

**Response:**
```json
{
  "message": { "role": "assistant", "content": "..." },
  "toolCalls": NoshToolCall[]
}
```

**Secrets:** `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL`

**Key differences from `ai-chat`:**
- Injects the active Recipe Graph as system context (not just profile/inventory)
- Passes tool definitions to the model via function calling
- Returns tool calls that the client executes (scale, substitute, timer, guide, update)
- When `update_page_data` is called, the client applies the patches to the graph and the typesetter re-renders live

**Tool definitions sent to the model:**
- `scale_servings(targetServings: number)` — recalculate all ingredient quantities
- `substitute_ingredient(ingredientName, substituteName, substituteQuantity?, substituteUnit?, reason?)` — swap with culinary awareness
- `start_timer(durationMinutes: number, label?: string)` — client starts a native timer
- `guide_next_step(stepId: string)` — highlight the next step on the page
- `update_page_data(operations: RecipeGraphPatch[])` — JSON-patch mutations to the graph

## Data Model Changes

### New: `nutriai.recipe_graphs` (proposed)

Stores the canonical Recipe Graph. Replaces the flat `recipes` table for new pages.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users` | RLS scope |
| `graph` | jsonb | The full RecipeGraph JSON |
| `created_at`, `updated_at` | timestamptz | |

The `graph` JSONB contains: title, description, servings, times, cuisine,
category, difficulty, ingredientGroups, stepGroups, notes, equipment, tags,
dietaryTags, provenance.

### New: `nutriai.page_art` (proposed)

Stores generated art assets. Replaces `page_versions` for new pages.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `page_id` | uuid → `cookbook_pages` | |
| `art_url` | text | Supabase Storage URL |
| `storage_path` | text | Storage path for cleanup |
| `style_id` | text | CookbookStyleId used |
| `art_prompt` | text | The art-generation prompt |
| `model` | text | e.g., `qwen/qwen-image-3-pro` |
| `status` | text CHECK ∈ {`pending`, `generating`, `ready`, `failed`} | |
| `credit_cost` | integer | |
| `error_message` | text | |
| `created_at` | timestamptz | |

### Modified: `nutriai.cookbook_pages`

The `selected_version_id` column (pointing to `page_versions`) is replaced
by `selected_art_id` (pointing to `page_art`) for new pages. Legacy pages
keep `selected_version_id` until migrated.

### Migration strategy

Legacy pages (with `page_versions` PNGs) remain readable via the old
`imageUrl` path. New pages use the typesetter + art asset path. A migration
script (Phase 6) can optionally re-extract recipe graphs from legacy pages
and generate new art assets, but this is not required for the new pipeline
to function.

## Environment Variables

### Client-safe (`.env`)

```text
EXPO_PUBLIC_AI_MODEL=qwen/qwen3.6-35b-a3b
EXPO_PUBLIC_ART_MODEL=qwen/qwen-image-3-pro
```

### Edge Function secrets (Supabase)

```text
AI_API_KEY          — OpenRouter API key (unchanged)
AI_API_BASE         — https://openrouter.ai/api/v1 (unchanged)
AI_MODEL            — qwen/qwen3.6-35b-a3b (updated)
ART_MODEL           — qwen/qwen-image-3-pro (new)
```

**Removed secrets (Phase 6):**
- `OPENAI_API_KEY` — no longer needed (art goes through OpenRouter)
- `OPENAI_IMAGE_MODEL` — no longer needed
- `GEMINI_API_KEY` — no longer needed (no Gemini fallbacks)

## Implementation Phases

1. **Phase 1 (this spec):** Foundation & data model — types, env, Edge Function boundaries
2. **Phase 2:** New Edge Functions — `extract-recipe`, `generate-page-art`, `nosh-chat`
3. **Phase 3:** Native Typesetter — React Native/Skia page renderer
4. **Phase 4:** Unified Intake UX — single multimodal input, zero-friction flow
5. **Phase 5:** Nosh Agent with Tools — wire tool calls to live page updates
6. **Phase 6:** Legacy Removal — tear out old functions, components, and DB columns
7. **Phase 7:** Documentation Update — update all docs to reflect the new architecture
