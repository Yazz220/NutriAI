# Nosh — Pre-Launch Checklist

> Track progress by checking items off. Work through these in order across sessions.
> Last updated: 2026-04-10

---

## Completed

- [x] Core app transformation — RecipeBox → Nosh (chat tab, branding, personality)
- [x] Chat tab — Nosh AI assistant with import routing
- [x] Recipes tab — category-based library with search and filtering
- [x] Plan tab — cleaned up, intuitive meal planner
- [x] Content detector — routes links, video URLs, images, text to correct pipeline
- [x] Import orchestrator — auto-processes and auto-saves recipes
- [x] Image import Edge Function (parse-image-recipe) — Gemini 2.5 Flash
- [x] Video import Edge Function (parse-video-recipe) — Gemini 2.5 Flash
- [x] Branding — app.json, brand constants, onboarding, persona all updated to Nosh
- [x] Cleanup — removed folders system, vestigial calorie code, dead utils, MealTypeSelector
- [x] Auth screens — forgot password link, updated copy, removed dev guest button
- [x] Type system — MealCategory, NoshChatMessage, coach→assistant rename
- [x] Comprehensive code audit — security review, dead code removal
- [x] Supabase schema — nutriai schema bootstrapped (profiles, meal_plans, ingredient_icons)

---

## Must Do Before Launch (Blocking)

- [ ] Add JWT auth to unprotected Edge Functions (parse-recipe, mealdb-proxy, recipes-search, ai-nutrition-scan, calculate-recipe-nutrition, fatsecret-*, food-nutrition-lookup, generate-ingredient-icon, get-ingredient-icon, nutrition-analyze)
- [ ] Restrict CORS — change `Access-Control-Allow-Origin: *` to app domain on all Edge Functions
- [ ] Set `GEMINI_API_KEY` in Supabase dashboard (Functions → Environment variables)
- [ ] Deploy Edge Functions — `parse-image-recipe` and `parse-video-recipe`
- [ ] Test image import — send a recipe photo through the chat
- [ ] Test video import — send a YouTube/TikTok recipe URL through the chat
- [ ] Test URL import — send a recipe website link through the chat
- [ ] Test text import — paste a recipe in plain text
- [ ] Test AI chat — cooking questions, follow-up questions about saved recipes
- [ ] App Store assets — icon, splash screen, screenshots (5.5" + 6.5"), app description
- [ ] Privacy Policy (required for App Store and Play Store)
- [ ] Terms of Service (required for app stores)
- [ ] Apple Sign-In — required by Apple for App Store if offering third-party auth (use expo-apple-authentication)

## Should Do Before Launch (Important)

- [ ] Rate limiting — configure per-user limits in Supabase dashboard for Edge Functions
- [ ] Error tracking — add Sentry or similar crash reporting
- [ ] Analytics — basic event tracking (recipe imports, chat messages, sign-ups)
- [ ] Deep linking — test `nosh://auth/callback` scheme for magic links / OAuth
- [ ] Push notifications — Expo Push for recipe reminders, meal plan alerts
- [ ] App Store listing — metadata, keywords, category (Food & Drink)
- [ ] EAS Build setup — configure `eas.json` for production builds
- [ ] Test on both iOS and Android — verify all screens render correctly

## Post-Launch / Future Sessions

- [ ] Subscription/pricing — in-app purchases (RevenueCat). Free tier (X recipes/month) + Pro (unlimited + video)
- [ ] Recipe sharing — share with friends or export as PDF
- [ ] Meal plan notifications — "Time to start making dinner!"
- [ ] Recipe suggestions — "Based on your saved recipes, you might like..."
- [ ] Shopping list from meal plan — auto-generate from the week's planned meals
- [ ] Offline mode — cache recipes for offline viewing
- [ ] Recipe editing — allow users to edit imported recipes
- [ ] Multiple servings adjustment — Nosh updates saved recipe quantities
- [ ] Onboarding polish — illustrations, smoother transitions
- [ ] Widget — iOS/Android home screen widget showing today's meal plan
- [ ] Dark mode — color system supports it, just needs a theme toggle
- [ ] Localization — i18n support for multiple languages
