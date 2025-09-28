# Contributing to NutriAI

Thanks for your interest in contributing! This guide will help you get set up and aligned with our workflows.

## Prerequisites
- Node.js (LTS)
- npm or yarn
- Expo CLI (via `npx expo`)

## Setup
1. Fork and clone the repo
2. Install dependencies
   ```sh
   npm install --legacy-peer-deps
   ```
3. Copy environment template and fill in values
   ```sh
   cp env.example .env
   # On Windows PowerShell:
   Copy-Item env.example .env
   ```
4. Start the app
   ```sh
   npx expo start
   ```

## Scripts
- Start: `npx expo start`
- iOS: `npx expo run:ios` (requires macOS)
- Android: `npx expo run:android`
- Lint (if configured): `npm run lint`
- Type-check: `npx tsc -noEmit`

## Environment variables
- Expo requires public env vars to be prefixed with `EXPO_PUBLIC_`
- See `env.example`
- Avoid committing real secrets; prefer a backend proxy for AI calls

## Code style
- TypeScript
- Prefer functional components with hooks
- Keep components presentational; move logic to hooks in `hooks/`
- Reusable UI in `components/`
- Pure logic in `utils/`

## Project structure (high-level)
np```
app/              # Expo Router routes (tabs + screens)
components/       # Reusable components
hooks/            # State & AI hooks (useNutrition, useCoachChat)
utils/            # Availability, parsing, validation, etc.
constants/        # Theme tokens (colors, spacing)
types/            # TS interfaces & types
```

## Git & PR workflow
1. Create a feature branch from `main`
2. Make focused commits with clear messages
3. Keep PRs small and scoped
4. Ensure the app builds and runs on a device or simulator
5. Describe changes, screenshots if UI-related, and testing steps

## Areas of focus
- UX polish and accessibility
- Performance (avoid unnecessary re-renders)
- Type safety (strict TS)
- Tests for critical logic in `utils/` where feasible

## AI-related guidelines
- Heuristic suggestions run inside `useCoachChat`; use that hook for coach interactions
- Use `useCoachChat` for conversational UI
- Store global flags/config via `EXPO_PUBLIC_…` env vars
- Do not hardcode API keys; use a secure proxy for production
