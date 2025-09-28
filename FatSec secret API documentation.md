FatSecret API: What to use and how to integrate (research-based)
Docs verified
Auth (OAuth 2.0, Client Credentials): https://platform.fatsecret.com/docs/guides/authentication/oauth2
Token endpoint: POST https://oauth.fatsecret.com/connect/token
Auth: HTTP Basic with ClientID:ClientSecret
Body: grant_type=client_credentials&scope=...
Note: Token requests must be made from a server/proxy with whitelisted IPs (not from the mobile app).
Foods: Search (v3): https://platform.fatsecret.com/docs/v3/foods.search
Food: Get By Id (v4): https://platform.fatsecret.com/docs/v4/food.get
v4 adds images and allergen/dietary flags (access to these may require additional permissions).
Image Recognition (v1): https://platform.fatsecret.com/docs/v1/image.recognition
Feature overview (Vision & NLP): https://platform.fatsecret.com/features/image-recognition-and-nlp
General guides (server.api calling pattern): https://platform.fatsecret.com/docs/guides
Scopes you likely need
basic: Required for foods.search.v3 and food.get.v4.
image-recognition: Required for image.recognition.v1.
nlp: For text parsing (optional). Note: Trials often include only “basic”. Vision/NLP access may require enabling extra scopes. We’ll implement a graceful fallback if vision scope isn’t granted.
API coverage for your use cases
Search Food: foods.search.v3 ? list of foods with IDs; then food.get.v4 ? nutrition details per serving and per 100g.
Take picture ? analyze calories:
If your trial includes vision scope: image.recognition.v1 to get detected items and nutrition.
If not: use on-device classifier to get label(s), then call foods.search.v3 + food.get.v4 to retrieve nutrition.
Call pattern (server-side)
Get token:
POST https://oauth.fatsecret.com/connect/token
Headers: Authorization: Basic base64(client_id:client_secret)
Body: grant_type=client_credentials&scope=basic image-recognition (only include scopes you have)
Call REST:
POST https://platform.fatsecret.com/rest/server.api
Headers: Authorization: Bearer {access_token}
Body (form or querystring): method=foods.search.v3&search_expression=banana&format=json
For details: method=food.get.v4&food_id=...&format=json
For vision: method=image.recognition.v1 with image payload per docs.
Recommended integration plan (accurate, low-risk)
Backend (Supabase Edge Functions)
fatsecret-token: fetch and cache OAuth2 token (Client Credentials). Cache until expiry.
fatsecret-foods-search: accepts { q, page_number, max_results }, injects Bearer token, calls foods.search.v3, returns normalized results.
fatsecret-food-get: accepts { food_id }, calls food.get.v4, returns normalized nutrition (per 100g and per serving).
fatsecret-image-recognition (optional): accepts image, calls image.recognition.v1 if scope enabled; otherwise returns 403 with helpful message.
Security:
Store Client ID/Secret as Supabase function secrets (do not embed in the app).
Ensure your Supabase egress IPs are whitelisted in FatSecret (required for token endpoint).
Client (Expo)
.env
:
EXPO_PUBLIC_FATSECRET_PROXY_BASE=<your supabase functions base>
utils/fatsecretClient.ts:
searchFoods(query, opts) ? calls our fatsecret-foods-search.
getFoodById(foodId) ? calls fatsecret-food-get.
recognizeImage(imageUri) ? calls fatsecret-image-recognition (if available).
Tracking page:
“Take Picture”:
If recognizeImage available, show results ? portion slider ? log.
Else, on-device classify ? call searchFoods with top label ? getFoodById ? portion slider ? log.
“Search Food”:
Directly uses searchFoods + getFoodById, unified UI with portion slider and macros.
Recipe detail:
Recompute nutrition using food.get.v4 mappings for ingredients (more accurate than current heuristic).
Surface consistent calories across recipe detail, photo logs, and search logs.
Reliability and accuracy notes
FatSecret food data is broad and production-grade; nutrition values are standardized.
Image Recognition availability depends on scopes. If unavailable, the on-device label ? FatSecret search fallback preserves UX and accuracy.
v4 foods return richer metadata (images, allergens) if your plan includes them; we’ll degrade gracefully if not.
Validation checklist (to avoid mistakes)
Auth/scopes
Confirm your trial’s scopes. Start with scope=basic to ensure foods.search.v3 and food.get.v4 work.
If image-recognition is not included, skip vision endpoint calls and use fallback path.
Smoke tests (server)
Token fetch works and is cached until expiry.
foods.search.v3 with “banana” returns results.
food.get.v4 for top result returns serving sizes and per-100g macros.
If vision scope enabled: image.recognition.v1 returns detections for a simple test image.
Client QA
Latency from tap ? result < 1.5s on Wi-Fi for search/get flow.
Portion slider scales macros correctly.
Low-confidence or no-results path opens “Search Food” with prefilled query.
Data consistency
The same normalized nutrition is used in:
Photo logs
Search logs
Recipe/cart calculations
What I need from you
Your FatSecret Client ID and Client Secret (not just a single key). Trials use OAuth 2.0 with Client Credentials.
Confirmation whether the trial includes the scopes:
image-recognition (optional)
nlp (optional)
We will always request basic.
Once you confirm scopes and provide Client ID/Secret, I’ll scaffold the Supabase Edge proxy endpoints and the utils/fatsecretClient.ts methods, and wire them into the Tracking and Recipe pages.

Summary: I verified FatSecret’s docs, auth, and endpoints. For your needs, use foods.search.v3 + food.get.v4 via a Supabase proxy (always works with basic scope). If your trial includes image-recognition, we’ll add image.recognition.v1. This plan is accurate, reliable, and integrates cleanly with your current app