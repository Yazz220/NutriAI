# Multi-Cookbook Implementation Plan (2026-05-05)

> Historical implementation record. Do not execute this plan against the current branch.

Plan paired with [`specs/2026-05-05-multi-cookbook-design.md`](../specs/2026-05-05-multi-cookbook-design.md).

## Order of work

1. **DB migration** — `supabase/sql/20260505_multi_cookbook.sql`. Applied via Supabase Dashboard → SQL Editor (the agent sandbox blocks the apply_migration call from this session).
2. **Types** — `types/cookbook.ts`: add `CookbookStyleId`, `CookbookSectionEntry`, extend `Cookbook` with `coverStyle` + `sections`.
3. **Style presets** — new `constants/cookbookStyles.ts` with 6 presets.
4. **API layer** — `utils/cookbook/api.ts`: replace `getOrCreateCookbook` with `listCookbooks`, `getCookbook`, `createCookbook`, `deleteCookbook`, `updateCookbookSections`. `mapCookbook` reads `cover_style` + `sections`.
5. **Cache** — `utils/cookbook/cache.ts`: shelf-level cache (`saveCachedShelf`, `loadCachedShelf`) + per-book pages cache (`saveCachedPages`, `loadCachedPages`).
6. **Hooks**
   - New `hooks/useCookbooks.ts` — provider for the shelf.
   - Refactor `hooks/useCookbook.ts` to a parameterized hook taking `cookbookId`.
   - Adapt `hooks/useNoshAssistant.ts` to take cookbook title for chat context.
7. **Sections** — `utils/cookbook/sections.ts`: add `normalizeSections`, `resolveCookbookSections(cookbook, pages)`, `groupPagesBySection(pages, sectionEntries?)`.
8. **Prompt wiring** — `utils/cookbook/pagePrompt.ts`: resolve descriptor from `cookbook.coverStyle`.
9. **Routes** — restructure `app/(book)/`:
   - New `index.tsx` = My Cookbooks shelf.
   - New `library.tsx` = Book Library.
   - Move existing screens under `[cookbookId]/`: `index`, `toc`, `add`, `review`, `generation/[pageId]`.
10. **Components**
    - New: `BookCover`, `CookbookShelf`, `BookLibraryGrid`, `AddCookbookSheet`, `EmptyShelfState`.
    - Adapt: `BookReader` reads style + title from active book; `NoshAssistantButton` / `NoshAssistantSheet` accept cookbook title; `TableOfContents` accepts per-book section entries.
    - Delete: old `CookbookStylePicker.tsx`.
11. **Provider order** — `app/_layout.tsx`: replace `CookbookProvider` with `CookbooksProvider`.
12. **Sample cookbook (offline)** — `utils/cookbook/sampleCookbook.ts`. `useCookbook` short-circuits when `cookbookId === SAMPLE_COOKBOOK_ID`. BookReader hides Add Page + shows banner. Shelf and EmptyShelfState surface "Preview sample".
13. **Settings page** — `app/(book)/settings.tsx`: account email, cookbook count, generation credit balance, Sign out, Delete account placeholder.
14. **Verify** — `npx tsc --noEmit` and `npm test` both clean. Walk the flow in browser preview.

## Files touched (final shape)

### Created
- `constants/cookbookStyles.ts`
- `hooks/useCookbooks.ts`
- `components/cookbook/BookCover.tsx`
- `components/cookbook/CookbookShelf.tsx`
- `components/cookbook/BookLibraryGrid.tsx`
- `components/cookbook/AddCookbookSheet.tsx`
- `components/cookbook/EmptyShelfState.tsx`
- `app/(book)/library.tsx`
- `app/(book)/[cookbookId]/_layout.tsx`
- `app/(book)/[cookbookId]/index.tsx`
- `app/(book)/[cookbookId]/toc.tsx`
- `app/(book)/[cookbookId]/add.tsx`
- `app/(book)/[cookbookId]/review.tsx`
- `app/(book)/[cookbookId]/generation/[pageId].tsx`
- `utils/cookbook/sampleCookbook.ts`
- `supabase/sql/20260505_multi_cookbook.sql`

### Rewritten / heavily edited
- `app/(book)/index.tsx` — shelf
- `app/(book)/_layout.tsx`
- `app/(book)/settings.tsx`
- `app/_layout.tsx` — provider swap
- `components/cookbook/BookReader.tsx`
- `components/cookbook/NoshAssistantButton.tsx`
- `components/cookbook/NoshAssistantSheet.tsx`
- `components/cookbook/TableOfContents.tsx`
- `hooks/useCookbook.ts`
- `hooks/useNoshAssistant.ts`
- `types/cookbook.ts`
- `utils/cookbook/api.ts`
- `utils/cookbook/cache.ts`
- `utils/cookbook/pagePrompt.ts`
- `utils/cookbook/sections.ts`
- `__tests__/utils/cookbook/cache.test.ts`

### Deleted
- `app/(book)/{add,review,toc}.tsx` (moved under `[cookbookId]/`)
- `app/(book)/generation/` (moved under `[cookbookId]/generation/`)
- `components/cookbook/CookbookStylePicker.tsx` (replaced by `BookLibraryGrid`)

## Verification (final)

- `npx tsc --noEmit` → EXIT 0
- `npm test` → 4 suites, 9 tests, all passing
- Browser preview at `localhost:8081`:
  - Empty shelf → CTA appears
  - "Preview sample" pill renders 5-page sample book without DB writes
  - Real shelf: tapping a book opens BookReader with title + style gradient
  - Settings page renders email, cookbook count, credit balance, sign-out

## Known follow-ups

- Apply `20260505_multi_cookbook.sql` to the production Supabase project (sandbox-blocked from this agent session).
- Polish the chef chat system prompt.
- Replace static cover decorations with real artwork per style.
- Add per-book section editor UI (data layer is ready).
