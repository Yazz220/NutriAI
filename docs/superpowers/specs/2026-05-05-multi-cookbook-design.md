# Multi-Cookbook Shelf + Style Library — Design (2026-05-05)

> Historical design record. The multi-book idea remains, but current behavior is defined by `docs/PRODUCT_FLOW.md`, `docs/ARCHITECTURE.md`, and the accepted ADRs.

## Context

The previous cookbook design ([2026-05-03](./2026-05-03-nosh-ai-cookbook-reset-design.md)) treated each user as having exactly one cookbook. The reader, the page generation flow, and the AI assistant all worked, but the home screen dropped users straight into a single book. The product vision is **a shelf of beautifully styled cookbooks** ("Italian", "Desserts", "Family", etc.), each with its own visual identity. This spec lifts the one-book limit and reframes the home as a shelf.

## Decisions

- **First-run flow:** signed-in users land on an empty `My Cookbooks` shelf with a single CTA. No forced welcome wizard.
- **Sections:** per-book. Each cookbook owns its own `sections` JSONB; default order is the canonical seven (breakfast / lunch / dinner / healthy / desserts / sides / favorites).
- **Book covers:** static templates per style preset. Title is composited locally onto a hand-designed background. No AI generation cost on book creation.
- **Style count for v1:** all 6 — Vintage Garden, Handwritten, Editorial, Watercolor, Rustic, Minimal.

## Surface

```
Sign in
  └─ My Cookbooks shelf
       ├─ Empty state → "Add your first cookbook" CTA → Book Library
       │  └─ Secondary: "Preview a sample cookbook"
       │
       ├─ Add cookbook (FAB) → /(book)/library
       │     └─ Pick style → name → createCookbook → land on the new book
       │
       └─ Tap a book → /(book)/[cookbookId]
             ├─ BookReader (paged horizontal swipe)
             ├─ PageControls: TOC / share / settings
             ├─ NoshAssistantButton (chef chat scoped to active page + book)
             └─ Add page → /(book)/[id]/add → review → generation
```

There is **no persistent bottom navigation**. Closing a book returns to the shelf. Adding a recipe is always inside an active book.

## Style preset system

Six presets in `constants/cookbookStyles.ts`. Each carries:

- `palette`: paper, ink, accent, spine, shelfBackground (3-stop gradient).
- `pagePromptDescriptor`: short string injected into the Gemini page-generation prompt — so a Watercolor book's pages genuinely look watercolor.
- `theme`: legacy `{name, prompt}` for backward compat.

The chosen preset is persisted in `nutriai.cookbooks.cover_style` (CHECK-constrained).

## Data model

Migration `supabase/sql/20260505_multi_cookbook.sql`:

1. Drop `cookbooks_one_per_user_idx`.
2. Add `cover_style TEXT NOT NULL DEFAULT 'handwritten'` with CHECK across the 6 IDs.
3. Add `sections JSONB NOT NULL DEFAULT '[]'`.
4. Backfill existing single-cookbook rows to `handwritten`.
5. Index `(user_id, updated_at DESC)` for shelf listing.
6. Drop legacy calorie-tracker tables (`meal_plans`, `ingredient_icons`, `food_logs`, `food_synonyms`, `food_usda_mapping`).

## Hooks

| Hook | Role |
|---|---|
| `useCookbooks` (provider, top-level) | Lists user's books, creates books, deletes books, exposes credit balance |
| `useCookbook(cookbookId)` | Pages + selection state for one book; mounted inside each `[cookbookId]/*` screen |
| `useCookbookImport` | Recipe parse pipeline (URL/text/image/video) |
| `useNoshAssistant(page, pages, cookbookTitle)` | Chef chat with active-page + book-index context |

The single-book hook is intentionally a parameterized regular hook, not a context. This way each `[cookbookId]/*` screen mounts its own React Query subscription scoped to that book.

## Sample cookbook (offline)

`utils/cookbook/sampleCookbook.ts` defines a static `Cookbook` + 5 recipe pages across breakfast, dinner, desserts, sides. When `useCookbook` is called with `SAMPLE_COOKBOOK_ID`, all Supabase queries short-circuit and the fixture is returned. The shelf and empty-state both surface a "Preview sample" affordance. The BookReader hides Add Page in sample mode and shows a banner.

This unblocks UI iteration when:
- The DB migration hasn't been applied yet
- The chef prompt is being polished
- We don't want to spend Gemini credits during design work

## Out of scope (v1)

- AI-generated covers
- Manual section rename/reorder UI
- Cookbook sharing or gifting
- Cross-book recipe search
- Drag-to-reorder on the shelf

## Verification

1. `npx tsc --noEmit` clean.
2. `npm test` clean (sections, page prompt, cache, confidence suites).
3. Fresh user → empty shelf → "Add your first cookbook" → Book Library → pick Watercolor → name "Desserts" → Add → land on the new book.
4. Open the new book → BookReader shows "Desserts" title + watercolor palette in the gradient.
5. Add Page → URL → review → generate → page appears in the Desserts book only.
6. Add a second cookbook (Editorial style) → confirm pages do not leak between books.
7. Sign out / sign in → shelf hydrates from cache + Supabase consistently.
8. Pre-existing single-cookbook user → their book appears as one cover with `cover_style='handwritten'` after migration.
