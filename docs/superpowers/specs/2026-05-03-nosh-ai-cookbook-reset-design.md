# Nosh — AI Cookbook Reset Design

> Historical design record. Do not implement from this file. Use `docs/PRODUCT_FLOW.md`, `docs/ARCHITECTURE.md`, and the accepted ADRs for current behavior.

**Date:** 2026-05-03  
**Status:** Approved concept, ready for implementation planning  
**Direction:** Clean product reset inside the existing Expo/Supabase app

## 1. Product Positioning

Nosh should become a personal recipe e-book with an AI chef assistant built in.

The app is the cookbook. Nosh is the chef assistant who lives inside the cookbook, understands every recipe page, and helps the user cook from it.

Core promise:

> Save recipes into a beautiful personal cookbook. Cook them with Nosh, your AI chef assistant.

Recipe import, parsing, and organization are enabling features, not the main brand promise. The product should feel like an e-book that happens to be intelligent, not like a traditional recipe database with a chat feature attached.

## 2. Product Goals

- Give the app a memorable selling point: recipes become beautiful one-page cookbook pages.
- Make the default experience feel like browsing and cooking from a personal recipe book.
- Keep Nosh as a capable chef/cook assistant who understands the whole book and the current page.
- Preserve structured recipe data underneath generated page images so assistant actions remain reliable.
- Support export/share as an image without becoming a public recipe platform.
- Reset the current scattered app shape into a simpler book-first product.

## 3. MVP User Experience

The primary user loop:

1. User chooses a default cookbook visual style during onboarding.
2. User imports a recipe from a link, pasted text, image, screenshot, or video link.
3. The app parses the source into structured recipe data.
4. The app computes extraction confidence.
5. If confidence is high, generation can proceed automatically.
6. If confidence is low, the user reviews and lightly edits parsed recipe data before spending a credit.
7. The app spends 1 credit and generates a fixed one-page cookbook image.
8. The page is saved into the user's cookbook.
9. The user flips through pages like an e-book.
10. The user can open Nosh from the page to ask cooking questions, scale quantities, substitute ingredients, or create a shopping list.
11. The user can export/share the generated page as an image.

The user should feel like they are adding a page to a book, not saving an item to a database.

## 4. Cookbook Style

The user chooses a default cookbook style during onboarding.

The structure of recipe pages should remain consistent for readability, but the visual style can vary by user preference. Examples:

- Clean editorial cookbook
- Warm handwritten family cookbook
- Modern magazine recipe page
- Vintage recipe book
- Soft watercolor kitchen style
- User-described custom style

For V1, the style applies to the whole cookbook. Generated pages should feel like they belong to the same book.

Users can regenerate a page if the image does not look good or does not reflect the recipe. Every successful generation or regeneration costs 1 credit.

## 5. Generated Recipe Pages

V1 uses fixed generated image pages.

Each generated page should include:

- Recipe title
- Servings
- Prep/cook/total time when available
- Ingredients
- Directions
- Food visuals or decorative imagery
- The user's selected cookbook style

The generated page is the presentation layer. Structured recipe data remains the source of truth.

This gives the app its signature magic while keeping Nosh capable and accurate underneath.

Important generation constraints:

- Recipe text must be readable.
- The image should look like a cookbook page, not an ad, poster, or social graphic.
- The layout should be one page for V1.
- If the recipe is too long for one page, the app should show the review screen and warn that the user may need to shorten or simplify before generation.
- Failed technical generations should not consume credits.
- Bad-but-successful generations can be regenerated and cost another credit.
- Page versions should be stored so users can revert later.

## 6. E-Book Navigation

The main app surface is the cookbook reader.

Navigation should feel like an e-book:

- Swipe horizontally to move between recipe pages.
- Use a page-turn animation if feasible; a slide transition is acceptable for V1 if it keeps the reading feeling.
- Show subtle controls for page number, section, table of contents, add page, export, and Nosh.
- Keep Nosh as a floating chef assistant button available from recipe pages.

The cookbook should also have a table of contents/index.

V1 organization:

- Auto-generated sections such as Breakfast, Dinner, Healthy, Desserts, Favorites, and Sides.
- Search by title, ingredient, category, and tag.
- Jump from the table of contents directly to a page.

Manual chapter editing, multiple books, and full PDF export are future features.

## 7. Nosh Assistant

Nosh is the AI chef assistant attached to the cookbook.

Nosh should understand:

- The current recipe page
- The structured recipe data underneath the generated image
- The user's cookbook contents
- The user's cookbook style and preferences
- Relevant prior chat context

Nosh can help with:

- Cooking questions
- Step-by-step guidance
- Ingredient substitutions
- Serving scaling
- Shopping list creation
- Prep planning
- Recipe comparisons
- Questions across the whole cookbook

Shopping list and planning features should be assistant actions in V1, not top-level app pillars.

## 8. App Screens

The reset should simplify the app into a book-first shell.

### Book Reader

Default landing screen. Displays generated recipe pages full-screen or near full-screen with page navigation and a floating Nosh button.

### Table of Contents

Book-style index grouped by auto-sections. Includes search and jump-to-page.

### Add Page / Import

Accepts recipe sources for the first implementation plan:

- URL
- Pasted recipe text
- Image or screenshot
- Video URL

The parser uses OpenRouter as the primary recipe-processing provider across text, links, images, and video URLs. Dedicated legacy media parsers can remain as fallbacks when a provider rejects a specific image or video payload.

Frames the action as preparing a new cookbook page.

### Recipe Review / Light Editor

Used when extraction confidence is low or when the user wants to fix parsed data before generation.

Editable fields:

- Title
- Servings
- Ingredients
- Directions
- Timing

This is not a full Canva-style editor. Its purpose is to prevent bad generated pages and wasted credits.

### Generation Result

Shows the generated page with actions:

- Keep
- Regenerate for 1 credit
- Export/share image
- Ask Nosh

### Nosh Assistant Sheet

Contextual chat sheet opened from the floating Nosh button. The button opens the assistant directly and passes the current page plus the cookbook index so Nosh can answer about the visible recipe and the rest of the book.

### Settings/Profile

Includes:

- Cookbook style
- Credits/subscription
- Account/auth
- Privacy/account deletion

## 9. Technical Architecture

Keep the existing Expo, Supabase, auth, EAS, and bundle identity foundation. Reset the product domains and UI.

New domain layers:

### Cookbook Layer

Owns the user's book, pages, ordering, style, table of contents, and reader navigation.

### Recipe Intelligence Layer

Stores the structured truth underneath each generated page:

- Title
- Servings
- Ingredients
- Steps
- Timing
- Source
- Tags/categories
- Extraction confidence
- Assistant context

### Generation Layer

Turns structured recipe data plus cookbook style into a generated page image.

Responsibilities:

- Prompt payload creation
- Image generation through Edge Functions
- Supabase Storage upload
- Page version records
- Credit spending
- Failure handling

### Assistant Layer

Powers Nosh with context over the current page and the whole cookbook.

### Billing/Credits Layer

Tracks generation credits and subscription limits.

For V1, generation spending should be simple: every successful generation or regeneration costs 1 credit.

## 10. Data Model

Supabase should become the source of truth. Local storage can cache recent book state and images for performance/offline-ish browsing.

Core entities:

### `cookbooks`

One primary cookbook per user in V1.

Fields:

- `id`
- `user_id`
- `title`
- `theme_name`
- `theme_prompt`
- `section_order`
- `created_at`
- `updated_at`

### `recipes`

Structured recipe data.

Fields:

- `id`
- `user_id`
- `title`
- `servings`
- `ingredients`
- `steps`
- `prep_time`
- `cook_time`
- `source_type`
- `source_url`
- `tags`
- `category`
- `confidence`
- `created_at`
- `updated_at`

### `cookbook_pages`

Book-facing page object.

Fields:

- `id`
- `cookbook_id`
- `recipe_id`
- `page_number`
- `section`
- `sort_order`
- `selected_version_id`
- `created_at`
- `updated_at`

### `page_versions`

Generated image attempts.

Fields:

- `id`
- `page_id`
- `image_url`
- `prompt_payload`
- `model`
- `status`
- `credit_cost`
- `error_message`
- `created_at`

### `credit_ledger`

Ledger-style credit events.

Fields:

- `id`
- `user_id`
- `event_type`
- `amount`
- `related_page_version_id`
- `created_at`

The ledger approach makes subscription refills, generation spend, and adjustments traceable.

## 11. Edge Functions

Target backend functions:

### `parse-recipe-source`

Input for the first implementation plan: URL, pasted text, image, screenshot, or video URL.
Output: structured recipe data plus confidence metadata.

### `generate-cookbook-page`

Input: recipe data, cookbook style, layout constraints, user ID.  
Output: stored image URL and page version record.

### `ai-chat`

Input: messages plus current page/book context.  
Output: assistant response and optional structured actions.

### `credits`

Handles credit balance checks and generation spend.

### Export/share

V1 should use native client-side sharing of the stored generated image. A dedicated server-side export function is not part of the first implementation plan.

All model/API keys must stay server-side in Edge Functions.

## 12. Technical Reset Scope

Keep:

- Expo SDK 54 / Expo Router
- EAS build setup
- App config, bundle ID, TestFlight continuity
- Supabase client/auth foundation
- Apple Sign-In and email/password auth after cleanup
- Useful import/parsing code where it can be adapted
- Nosh brand/personality, reframed as chef assistant

Replace:

- Current tab-based app structure
- Meal planner as a top-level product
- Shopping list tab as a top-level product
- Old `Meal`-centered stores as the primary model
- Chat-first landing screen
- Nutrition/health-goal positioning
- Local-only recipe persistence as canonical storage

Before implementation, address the current P0 infrastructure issues:

- Use user session access tokens for authenticated Edge Functions.
- Route image/video import to the correct functions and contracts.
- Fix shared Edge Function helper type errors.
- Add or repair account deletion flow.
- Add Supabase grants/migrations for the new schema.

## 13. MVP Scope

In scope:

- New onboarding step for cookbook style
- One primary cookbook per user
- Import from URL, pasted text, image, screenshot, and video URL
- Structured recipe parsing with confidence score
- Light editor before generation when needed
- One fixed generated recipe page image
- Save generated page into cookbook
- Swipe/page reader navigation
- Table of contents grouped by auto-category
- Floating Nosh assistant with current recipe/book context
- Regenerate page for 1 credit
- Export/share generated page as image
- Settings for cookbook style and account
- Credit balance display and generation spending logic

Out of scope for V1:

- Public gallery or platform
- Multiple cookbooks
- Full Canva-style editing
- Full PDF book export
- Manual chapter management
- Collaborative sharing
- Advanced meal planning
- Nutrition tracking
- Full subscription purchase implementation unless required for launch
- Multi-page recipe spreads
- Multi-source audio file import

## 14. Success Criteria

The MVP succeeds if:

- A user can import a recipe from a source.
- The app can parse it into usable structured data.
- The user can review/fix it when needed.
- The app can generate a beautiful readable cookbook page.
- The page appears in a book-like reader.
- The user can flip through their cookbook.
- Nosh can answer questions about the current page and cookbook.
- The user can export/share the page image.

The experience should be understandable in one sentence:

> It is your personal recipe e-book, with an AI chef who knows every page.

## 15. Future Directions

- Multi-page recipe spreads for complex recipes
- Multiple cookbooks
- Generated cover art
- Manual chapter/section management
- Drag-and-drop page ordering
- Full PDF export
- Public share links
- Recipe page style presets and previews
- Subscription and credit packs
- Assistant-generated shopping list views
- Assistant-guided cooking mode
- Family/shared cookbooks
