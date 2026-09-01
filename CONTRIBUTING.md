# Contributing to Folio

Folio is a book-first Expo app. Read [AGENTS.md](./AGENTS.md), [CONTEXT.md](./CONTEXT.md), and [docs/PRODUCT_FLOW.md](./docs/PRODUCT_FLOW.md) before changing product behavior.

## Setup

Requirements:

- Node `20.19.4` from `.nvmrc`
- npm
- Expo through `npx expo`
- a Supabase project for backend integration work

```bash
npm install --legacy-peer-deps
Copy-Item env.example .env
npx expo start
```

On macOS or Linux, use `cp env.example .env`.

## Checks

Run all three before opening a pull request:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Reader motion, native sharing, safe areas, large text, and touch behavior also need an iPhone device or development build. Web rendering is not the source of truth for mobile behavior.

## Code conventions

- Use TypeScript strict mode and `@/` imports across folders.
- Keep server state in TanStack React Query.
- Keep shelf and per-book cache work in `utils/cookbook/cache.ts`.
- Keep cookbook logic in `utils/cookbook/` and add focused tests for pure functions.
- Use `constants/colors.ts`, `constants/spacing.ts`, and `constants/cookbookStyles.ts` for shared design values.
- Provider calls and service-role work belong in Supabase Edge Functions.
- Never commit `.env`, provider keys, service-role keys, recipe content, or user source URLs.

## Pipeline rules

- Every URL, text, image, or video source enters `capture-recipe`.
- Screens and Folio tools may start or resume a capture. They must not extract and create a page directly.
- `generate-page-art` generates the complete recipe page with visible text. Do not add an artwork-only generator for new pages.
- The Recipe Graph is the canonical reasoning record. The selected generated image is the page the user reads.
- Cookbook style comes from the persisted cookbook identity. Do not add per-recipe aesthetic choices.
- New capture states are limited to `processing`, `needs_destination`, `needs_attention`, and `ready`.
- The review route and typesetter are compatibility code. Do not copy them into new flows.

The reasons are recorded in [ADR 0002](./docs/adr/0002-single-capture-and-complete-page-generation.md).

## Pull requests

1. Create a focused branch from the intended base.
2. Keep commits scoped and use imperative commit subjects.
3. Include the device and browser checks relevant to the change.
4. Include screenshots or recordings for visual or interaction work.
5. Update the appropriate current document in the same change.

Use [docs/README.md](./docs/README.md) to find the correct documentation owner. Dated files under `docs/superpowers/` are historical records, not implementation instructions.
