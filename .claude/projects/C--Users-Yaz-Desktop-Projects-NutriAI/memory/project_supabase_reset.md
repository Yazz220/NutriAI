---
name: Supabase project paused and unrestorable
description: The original Supabase project "Nourish" was paused since June 2024 and cannot be restored via dashboard — needs a fresh project
type: project
---

The original Supabase project "Nourish" has been paused since 2024-06-23 (over 90 days). It cannot be restored through the Supabase dashboard. Data can be downloaded as backup.

**Why:** Project was inactive for too long. Supabase auto-pauses free-tier projects.

**How to apply:** A new Supabase project must be created. Run `supabase/sql/00_bootstrap.sql` against it (consolidated all tables, RLS, triggers, seed data). Deploy all Edge Functions. Update `.env` with new `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Set Edge Function secrets: `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL`, `FATSECRET_CLIENT_ID`/`SECRET`, `HUGGINGFACE_API_KEY`, `USDA_API_KEY`.
