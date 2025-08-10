# Backend Setup: Supabase + Edge Functions

This document captures the milestone where NutriAI moved to a secure Supabase backend with an AI proxy Edge Function.

## Overview
- Project: Nourish — https://wckohtwftlwhyldnfpbz.supabase.co
- Schema: `nutriai` (strict RLS on all tables)
- Edge Function: `ai-chat` (JWT verification enabled)
- Frontend: Expo; all client env vars must use `EXPO_PUBLIC_` prefix
- Secrets live only in Supabase Edge Function, not in the app

## Database Schema (nutriai)
- `profiles (user_id PK, display_name, units, goals jsonb, preferences jsonb, created_at)`
- `inventory_items (id, user_id, name, quantity, unit, category, added_date, expiry_date, notes)`
- `shopping_list_items (id, user_id, name, quantity, unit, checked, created_at)`
- `meal_plans (id, user_id, date, meal_type, recipe_id, title, data jsonb, created_at)`
- `recipes_saved (id, user_id, source, title, data jsonb, created_at)`
- `ai_messages (id, user_id, role, content jsonb, created_at)`

RLS policies restrict every table to `auth.uid()`. Use Supabase Auth in the app to read/write.

## Environment
Client `.env` (safe to bundle):
```
EXPO_PUBLIC_SUPABASE_URL=https://wckohtwftlwhyldnfpbz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>

# Optional informational values (no secrets)
EXPO_PUBLIC_AI_PROVIDER=openrouter
EXPO_PUBLIC_AI_API_BASE=https://openrouter.ai/api/v1
EXPO_PUBLIC_AI_MODEL=openai/gpt-oss-20b:free
```

Server secrets (Supabase → Functions → ai-chat → Secrets):
- `AI_API_KEY` = provider key (e.g., OpenRouter)
- `AI_API_BASE` = https://openrouter.ai/api/v1
- `AI_MODEL` = openai/gpt-oss-20b:free

## Edge Function: ai-chat
- Path: `/functions/v1/ai-chat`
- Input: `{ messages: { role: 'system'|'user'|'assistant', content: string }[] }`
- Output: strict JSON
```
{
  "type": "chat",
  "model": string,
  "output": {
    "summary"?: string,
    "suggestions"?: string[],
    "blocks"?: Array<{ kind: "text"|"tip"|"recipe"|"plan", title?: string, content?: string, data?: unknown }>
  }
}
```

## Testing (PowerShell)
```powershell
$ANON = "<YOUR_ANON_KEY>"
$headers = @{ Authorization = "Bearer $ANON"; apikey = $ANON; "Content-Type" = "application/json" }
$body = @{ messages = @(@{ role = "user"; content = "Give me a healthy dinner idea." }) } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method POST -Uri "https://wckohtwftlwhyldnfpbz.supabase.co/functions/v1/ai-chat" -Headers $headers -Body $body | ConvertTo-Json -Depth 8
```

## Frontend Integration
- Install: `npm i @supabase/supabase-js`
- Client: `utils/supabaseClient.ts`
```
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true } });
```
- AI Client: `utils/aiClient.ts`
```
export async function aiChat(messages) {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/ai-chat`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`ai-chat failed: ${res.status}`);
  return res.json();
}
```

## Roadmap (Next)
1) Minimal Auth (magic link) so `auth.uid()` is present for RLS.
2) Profile Sync: `hooks/useUserProfile.ts` ↔ `nutriai.profiles` (keep AsyncStorage as cache).
3) Inventory CRUD: wire to `nutriai.inventory_items` with optimistic UI + pull-to-refresh.
4) AI Chat Renderer: render `output.summary`, `suggestions`, and `blocks`.
5) Hardening: rate limiting, input validation, advisors, indexes.

## Security Checklist
- Do not expose provider keys in `EXPO_PUBLIC_` vars.
- Rotate exposed keys immediately.
- Keep anon key/client vars only in `.env` and CI secrets, never hardcoded.
- Verify RLS with a non-service session regularly.
