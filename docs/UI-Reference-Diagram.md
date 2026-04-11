# Nosh App UI Reference Diagram

## App Structure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NOSH APP                                 │
│                    (Mobile React Native)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   AUTH FLOW                               │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐           │  │
│  │  │ Sign In  │ →  │ Sign Up  │ →  │ Forgot   │           │  │
│  │  │          │    │          │    │ Password │           │  │
│  │  └──────────┘    └──────────┘    └──────────┘           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 ONBOARDING FLOW                          │  │
│  │  ┌──────────┐ → ┌──────────┐ → ┌──────────┐ → ┌──────┐  │  │
│  │  │ Welcome  │   │ Health   │   │ Dietary  │   │ Cook │  │  │
│  │  │ Screen   │   │ Goals    │   │ Prefs    │   │ Prefs│  │  │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              MAIN APP (5-TAB NAVIGATION)                   │  │
│  │  ┌────────┬────────┬────────┬────────┬────────┐         │  │
│  │  │ Nosh   │Recipes │  Plan  │  List  │Profile │         │  │
│  │  │(Chat)  │        │        │        │        │         │  │
│  │  └────────┴────────┴────────┴────────┴────────┘         │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. AUTH FLOW

### Sign In Screen (`app/(auth)/sign-in.tsx`)
```
┌─────────────────────────────────────┐
│         SIGN IN                      │
├─────────────────────────────────────┤
│                                     │
│  [ Logo/Brand ]                      │
│                                     │
│  Email Input                        │
│  ┌─────────────────────────────┐   │
│  │ Enter your email            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Password Input                     │
│  ┌─────────────────────────────┐   │
│  │ Enter your password         │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Sign In Button ]                  │
│                                     │
│  Forgot Password?                   │
│                                     │
│  Don't have an account? Sign Up     │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Email input field
- Password input field (secure)
- Sign In button (primary action)
- Forgot Password link
- Sign Up navigation link

---

### Sign Up Screen (`app/(auth)/sign-up.tsx`)
```
┌─────────────────────────────────────┐
│         SIGN UP                      │
├─────────────────────────────────────┤
│                                     │
│  [ Logo/Brand ]                      │
│                                     │
│  Name Input                         │
│  ┌─────────────────────────────┐   │
│  │ Enter your name             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Email Input                        │
│  ┌─────────────────────────────┐   │
│  │ Enter your email            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Password Input                     │
│  ┌─────────────────────────────┐   │
│  │ Create a password           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Create Account Button ]           │
│                                     │
│  Already have an account? Sign In    │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Name input field
- Email input field
- Password input field (secure)
- Create Account button (primary action)
- Sign In navigation link

---

### Forgot Password Screen (`app/(auth)/forgot-password.tsx`)
```
┌─────────────────────────────────────┐
│      FORGOT PASSWORD                 │
├─────────────────────────────────────┤
│                                     │
│  [ Logo/Brand ]                      │
│                                     │
│  Enter your email to reset password │
│                                     │
│  Email Input                        │
│  ┌─────────────────────────────┐   │
│  │ Enter your email            │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Send Reset Link Button ]          │
│                                     │
│  Back to Sign In                    │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Email input field
- Send Reset Link button (primary action)
- Back to Sign In navigation link

---

## 2. ONBOARDING FLOW

### Welcome Screen (`app/(onboarding)/welcome.tsx`)
```
┌─────────────────────────────────────┐
│                                     │
│         [ LARGE NOSH GIF ]           │
│         (Animated Logo)             │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│      [ GET STARTED Button ]          │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Large animated Nosh logo (GIF)
- Get Started button (primary action)
- Progress indicator (hidden on welcome screen)

---

### Health Goals Screen (`app/(onboarding)/health-goals.tsx`)
```
┌─────────────────────────────────────┐
│  What goal do you have in mind?     │
│  [ Progress: 1/5 ]                   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Icon]  Lose Weight       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Icon]  Build Muscle      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Icon]  Eat Healthier     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Icon]  Save Money        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Icon]  Save Time         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Icon]  Try New Recipes   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ BEHIND THE QUESTION ] [ More ]   │
│                                     │
├─────────────────────────────────────┤
│      [ CONTINUE Button ]            │
└─────────────────────────────────────┘
```

**Elements:**
- Header title
- Progress indicator (1/5)
- 6 goal option cards (selectable)
- "Behind the Question" educational feature
- Continue button (primary action)

---

### Dietary Preferences Screen (`app/(onboarding)/dietary-preferences.tsx`)
```
┌─────────────────────────────────────┐
│  Tell us about your dietary needs   │
│  [ Progress: 2/5 ]                   │
├─────────────────────────────────────┤
│                                     │
│  Allergies                          │
│  ┌─────────────────────────────┐   │
│  │ [ ] Gluten                  │   │
│  │ [ ] Dairy                   │   │
│  │ [ ] Nuts                    │   │
│  │ [ ] Shellfish               │   │
│  │ [ ] Soy                     │   │
│  │ [ ] Eggs                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Dietary Restrictions               │
│  ┌─────────────────────────────┐   │
│  │ [ ] Vegetarian              │   │
│  │ [ ] Vegan                   │   │
│  │ [ ] Keto                    │   │
│  │ [ ] Paleo                   │   │
│  │ [ ] Low Carb                │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ BEHIND THE QUESTION ] [ More ]   │
│                                     │
├─────────────────────────────────────┤
│      [ CONTINUE Button ]            │
└─────────────────────────────────────┘
```

**Elements:**
- Header title
- Progress indicator (2/5)
- Allergies section (checkboxes)
- Dietary restrictions section (checkboxes)
- "Behind the Question" educational feature
- Continue button (primary action)

---

### Cooking Preferences Screen (`app/(onboarding)/cooking-preferences.tsx`)
```
┌─────────────────────────────────────┐
│  What's your cooking style?         │
│  [ Progress: 3/5 ]                   │
├─────────────────────────────────────┤
│                                     │
│  Cooking Experience                 │
│  ┌─────────────────────────────┐   │
│  │ ○ Beginner                 │   │
│  │ ○ Intermediate             │   │
│  │ ○ Advanced                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  Time Available                     │
│  ┌─────────────────────────────┐   │
│  │ ○ < 30 minutes             │   │
│  │ ○ 30-60 minutes            │   │
│  │ ○ > 60 minutes             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Preferred Cuisine Types            │
│  ┌─────────────────────────────┐   │
│  │ [ ] Italian                │   │
│  │ [ ] Mexican                │   │
│  │ [ ] Asian                  │   │
│  │ [ ] Mediterranean          │   │
│  │ [ ] American                │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│      [ CONTINUE Button ]            │
└─────────────────────────────────────┘
```

**Elements:**
- Header title
- Progress indicator (3/5)
- Cooking experience (radio buttons)
- Time available (radio buttons)
- Preferred cuisine types (checkboxes)
- Continue button (primary action)

---

### Basic Profile Screen (`app/(onboarding)/basic-profile.tsx`)
```
┌─────────────────────────────────────┐
│  Let's get to know you              │
│  [ Progress: 4/5 ]                   │
├─────────────────────────────────────┤
│                                     │
│  Name                               │
│  ┌─────────────────────────────┐   │
│  │ Enter your name             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Age                                │
│  ┌─────────────────────────────┐   │
│  │ Enter your age              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Gender                             │
│  ┌─────────────────────────────┐   │
│  │ ○ Male                     │   │
│  │ ○ Female                   │   │
│  │ ○ Other                    │   │
│  │ ○ Prefer not to say        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Weight (lbs)                       │
│  ┌─────────────────────────────┐   │
│  │ Enter your weight           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Height (ft/in)                     │
│  ┌─────────────────────────────┐   │
│  │ Enter your height           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ BEHIND THE QUESTION ] [ More ]   │
│                                     │
├─────────────────────────────────────┤
│      [ CONTINUE Button ]            │
└─────────────────────────────────────┘
```

**Elements:**
- Header title
- Progress indicator (4/5)
- Name input field
- Age input field
- Gender selection (radio buttons)
- Weight input field
- Height input field
- "Behind the Question" educational feature
- Continue button (primary action)

---

### Onboarding Completion Screen (`app/(onboarding)/completion.tsx`)
```
┌─────────────────────────────────────┐
│                                     │
│         [ SUCCESS ICON ]            │
│                                     │
│  You're all set!                    │
│                                     │
│  Your profile is ready.            │
│  Start exploring recipes and        │
│  planning your meals.              │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│      [ START EXPLORING Button ]      │
└─────────────────────────────────────┘
```

**Elements:**
- Success icon/illustration
- Completion message
- Start Exploring button (primary action)

---

## 3. MAIN APP SCREENS

### Tab Navigation Bar
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [ SCREEN CONTENT ]                   │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐   │
│  │  💬     │  🍳     │  📅     │  🛒     │  👤     │   │
│  │  Nosh   │Recipes  │  Plan   │  List   │Profile  │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Tab Icons:**
- Nosh (Chat): Message circle icon
- Recipes: Recipe page icon
- Plan: Calendar icon
- List: Shopping list icon
- Profile: Personal information icon

---

### 1. NOSH (Chat) Screen (`app/(tabs)/index.tsx`)
```
┌─────────────────────────────────────┐
│  NOSH                    [Screen]  │  ← ScreenHeader
├─────────────────────────────────────┤
│                                     │
│  [ Chat Messages Area ]             │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │  ┌─────────────────────┐    │   │
│  │  │ 👤 User message     │    │   │
│  │  │ (right-aligned)      │    │   │
│  │  └─────────────────────┘    │   │
│  │                             │   │
│  │  ┌─────────────────────┐    │   │
│  │  │ 🤖 Assistant msg    │    │   │
│  │  │ (left-aligned)       │    │   │
│  │  └─────────────────────┘    │   │
│  │                             │   │
│  │  [ Recipe Card Inline ]      │   │
│  │  (if recipe suggested)       │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [📎] [ Input Field ] [ ➤ Send ]    │  ← ChatInput
└─────────────────────────────────────┘
```

**Elements:**
- ScreenHeader with title "Nosh"
- Chat messages area (scrollable)
  - User messages (right-aligned, orange background)
  - Assistant messages (left-aligned, gray background)
  - Recipe card inline (when recipe suggested)
- ChatInput bar
  - Image attach button (📎)
  - Text input field
  - Send button (➤)

**Interactions:**
- Type messages to AI coach
- Attach images for recipe analysis
- Tap recipe cards to view details
- Auto-scroll to latest message

---

### 2. RECIPES Screen (`app/(tabs)/recipes.tsx`)
```
┌─────────────────────────────────────┐
│  🍳 RECIPES               [Screen]  │  ← ScreenHeader
├─────────────────────────────────────┤
│  🔍 [ Search recipes or ingredients ]│  ← SearchBar
├─────────────────────────────────────┤
│  [All (12)] [Breakfast (3)] [Lunch] │  ← Category Chips
│  [Dinner (5)] [Snack (1)] [Dessert] │  (horizontal scroll)
├─────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐ │
│  │ [Image/Icon] │  │ [Image/Icon] │ │
│  │ [Category]   │  │ [Category]   │ │
│  │ Recipe Name  │  │ Recipe Name  │ │
│  │ ⏱ 45m 5ingr │  │ ⏱ 30m 8ingr │ │
│  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ [Image/Icon] │  │ [Image/Icon] │ │
│  │ [Category]   │  │ [Category]   │ │
│  │ Recipe Name  │  │ Recipe Name  │ │
│  │ ⏱ 60m 12ingr│  │ ⏱ 25m 6ingr │ │
│  └──────────────┘  └──────────────┘ │
│  [ 2-column grid continues... ]      │
│                                     │
│                    [ ➕ FAB ]       │  ← Floating Action Button
└─────────────────────────────────────┘
```

**Elements:**
- ScreenHeader with title "Recipes" and icon
- Search bar with clear button
- Category filter chips (horizontal scroll)
  - All, Breakfast, Lunch, Dinner, Snack, Dessert
  - Shows count per category
- Recipe cards (2-column grid)
  - Recipe image or placeholder icon
  - Category badge
  - Recipe name (2 lines max)
  - Time and ingredient count
  - Tap to view details
  - Long-press for menu (Edit/Delete)
- Floating Action Button (➕) for import
- Empty state when no recipes

**Interactions:**
- Search recipes by name or ingredients
- Filter by category
- Tap recipe card to view details
- Long-press for edit/delete options
- Tap FAB to import recipes
- Pull to refresh

---

### Recipe Detail Modal (`components/MealDetailModal.tsx`)
```
┌─────────────────────────────────────┐
│  [Recipe Name]            [ ✕ ]     │
├─────────────────────────────────────┤
│  [ Large Recipe Image ]              │
├─────────────────────────────────────┤
│  ⏱ 45m  |  👥 4 servings  |  📝 12  │
│                                     │
│  Description text...                 │
│                                     │
│  INGREDIENTS                        │
│  ┌─────────────────────────────┐   │
│  │ ☐ 2 cups flour              │   │
│  │ ☐ 1 tsp salt                │   │
│  │ ☐ 1/2 cup sugar             │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                     │
│  INSTRUCTIONS                       │
│  1. Preheat oven to 350°F           │
│  2. Mix dry ingredients...          │
│  3. Add wet ingredients...          │
│  ...                                │
│                                     │
│  [ ADD TO SHOPPING LIST ]           │
│  [ ADD TO MEAL PLAN ]               │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Recipe name with close button
- Large recipe image
- Metadata (time, servings, ingredients count)
- Description
- Ingredients list (checkboxes)
- Instructions (numbered steps)
- Add to Shopping List button
- Add to Meal Plan button

---

### Import Recipe Modal (`components/ImportRecipeModal.tsx`)
```
┌─────────────────────────────────────┐
│  Import Recipe           [ ✕ ]      │
├─────────────────────────────────────┤
│  Choose import method:              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📄 Paste Text Recipe       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🔗 Paste URL               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📷 Upload Photo            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🎥 Upload Video            │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Text Area for content ]          │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │ Paste your recipe here...   │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│      [ IMPORT Button ]               │
└─────────────────────────────────────┘
```

**Elements:**
- Modal title with close button
- 4 import method options (Text, URL, Photo, Video)
- Text area for pasting content
- Import button

---

### 3. PLAN Screen (`app/(tabs)/plan.tsx`)
```
┌─────────────────────────────────────┐
│  📅 PLAN                  [Screen]   │  ← ScreenHeader
├─────────────────────────────────────┤
│  [ < ]  Jan 15 - Jan 21  [ > ]      │  ← Week Navigation
├─────────────────────────────────────┤
│  ┌────┬────┬────┬────┬────┬────┬────┐│  ← Day Selector
│  │Mon │Tue │Wed │Thu │Fri │Sat │Sun ││
│  │ 15 │ 16 │ 17 │ 18 │ 19 │ 20 │ 21 ││
│  │  ● │    │  ● │    │  ● │    │    ││
│  └────┴────┴────┴────┴────┴────┴────┘│
│     ↑ Selected (highlighted)         │
├─────────────────────────────────────┤
│  BREAKFAST                          │
│  ┌─────────────────────────────┐   │
│  │ [Img] Oatmeal with berries  │   │  ← Planned Meal Card
│  │ 2 servings        [ ✕ ]     │   │
│  └─────────────────────────────┘   │
│                                     │
│  LUNCH                              │
│  ┌─────────────────────────────┐   │
│  │ [ + ] Add meal              │   │  ← Empty Card
│  └─────────────────────────────┘   │
│                                     │
│  DINNER                             │
│  ┌─────────────────────────────┐   │
│  │ [Img] Grilled chicken salad │   │
│  │ 4 servings        [ ✕ ]     │   │
│  └─────────────────────────────┘   │
│                                     │
│  SNACK                              │
│  ┌─────────────────────────────┐   │
│  │ [ + ] Add meal              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- ScreenHeader with title "Plan" and icon
- Week navigation arrows with date range
- Day selector strip (7 days)
  - Day name (Mon, Tue, etc.)
  - Date number
  - Dot indicator if meals planned
  - Selected day highlighted
- Meal slots for selected day
  - Breakfast, Lunch, Dinner, Snack
  - Planned meal card (with image, name, servings, remove button)
  - Empty card (dashed border, + button to add)
- Tap planned meal to view recipe details
- Tap empty card to add meal

**Interactions:**
- Navigate weeks with arrows
- Select day from strip
- Tap planned meal to view details
- Tap X to remove meal
- Tap empty card to add meal
- Tap meal card to view recipe

---

### Meal Plan Modal (`components/MealPlanModal.tsx`)
```
┌─────────────────────────────────────┐
│  Plan: DINNER            [ ✕ ]      │
├─────────────────────────────────────┤
│  Date: January 17, 2026             │
│                                     │
│  Select a recipe:                   │
│  ┌─────────────────────────────┐   │
│  │ [Img] Recipe 1              │   │
│  │ Recipe Name                 │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ [Img] Recipe 2              │   │
│  │ Recipe Name                 │   │
│  └─────────────────────────────┘   │
│  [ Recipe list continues... ]       │
│                                     │
│  Servings:                          │
│  ┌─────────────────────────────┐   │
│  │ [ - ] 4 [ + ]              │   │
│  └─────────────────────────────┘   │
│                                     │
│      [ SAVE Button ]                │
│      [ DELETE Button ]              │  ← (if editing)
└─────────────────────────────────────┘
```

**Elements:**
- Modal title with meal type
- Date display
- Recipe selection list
  - Recipe image
  - Recipe name
- Servings counter (+/-)
- Save button
- Delete button (if editing existing meal)

---

### 4. SHOPPING LIST Screen (`app/(tabs)/list.tsx`)
```
┌─────────────────────────────────────┐
│  🛒 SHOPPING LIST         [Screen]  │  ← ScreenHeader
├─────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┐     │  ← Quick Stats
│  │ 🛒      │ ✅      │ ⏰      │     │
│  │ Total   │ Completed│Remaining│     │
│  │ Items   │         │         │     │
│  │   12    │   8     │   4     │     │
│  └─────────┴─────────┴─────────┘     │
│  (tap to filter)                    │
├─────────────────────────────────────┤
│  [ Add Item ] [ Export ] [ Clear ]  │  ← Action Buttons
├─────────────────────────────────────┤
│  REMAINING (4) ▼                    │  ← Section Header
│  ─────────────────────────────────── │
│  ☐ Milk                             │
│  ─────────────────────────────────── │
│  ☐ Eggs                             │
│  ─────────────────────────────────── │
│  ☐ Bread                            │
│  ─────────────────────────────────── │
│  ☐ Butter                           │
│  ─────────────────────────────────── │
│                                     │
│  COMPLETED (8) ▼                    │  ← Section Header
│  ─────────────────────────────────── │
│  ☑ Flour                            │
│  ─────────────────────────────────── │
│  ☑ Sugar                            │
│  ─────────────────────────────────── │
│  [ Collapsed items... ]              │
│                                     │
│  [ Empty State when no items ]      │
│  "Your shopping list is empty"       │
│  "Add items manually or generate     │
│   from a recipe"                    │
│  [ Add Items Button ]                │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- ScreenHeader with title "Shopping List" and icon
- Quick stats row (3 pills)
  - Total Items (tap to show all)
  - Completed (tap to show completed)
  - Remaining (tap to show remaining)
- Action buttons row
  - Add Item button
  - Export button
  - Clear Completed button (shows when items completed)
- Sectioned list
  - Remaining section (expandable)
  - Completed section (collapsible)
- Shopping list items
  - Checkbox (tap to toggle)
  - Item name
  - Quantity (if specified)
  - Category badge (if specified)
- Empty state
  - Message
  - Add Items button

**Interactions:**
- Tap stat pills to filter list
- Tap checkbox to mark item complete
- Tap section header to collapse/expand
- Tap Add Item to open modal
- Tap Export to share list
- Tap Clear Completed to remove checked items

---

### Add to List Modal (`components/AddToListModal.tsx`)
```
┌─────────────────────────────────────┐
│  Add Item                [ ✕ ]      │
├─────────────────────────────────────┤
│  Item name                          │
│  ┌─────────────────────────────┐   │
│  │ Enter item name             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Quantity                           │
│  ┌─────────────────────────────┐   │
│  │ 1                           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Category                           │
│  ┌─────────────────────────────┐   │
│  │ Produce ▼                   │   │
│  └─────────────────────────────┘   │
│  (Produce, Dairy, Meat, etc.)       │
│                                     │
│      [ ADD Button ]                 │
└─────────────────────────────────────┘
```

**Elements:**
- Modal title with close button
- Item name input
- Quantity input
- Category dropdown
- Add button

---

### Export Shopping Modal (`components/ExportShoppingModal.tsx`)
```
┌─────────────────────────────────────┐
│  Export Shopping List    [ ✕ ]      │
├─────────────────────────────────────┤
│  Choose export format:              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📄 Copy as Text            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📋 Copy as Checklist        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📱 Share                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Preview area ]                   │
│  ┌─────────────────────────────┐   │
│  │ Shopping List:              │   │
│  │ - Milk                       │   │
│  │ - Eggs                       │   │
│  │ - Bread                      │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                     │
│      [ EXPORT Button ]               │
└─────────────────────────────────────┘
```

**Elements:**
- Modal title with close button
- Export format options
- Preview area
- Export button

---

### 5. PROFILE Screen (`app/(tabs)/profile.tsx`)
```
┌─────────────────────────────────────┐
│                                     │
│         [ Avatar Circle ]           │
│         (User icon)                 │
│                                     │
│         John Doe                    │
│         john@example.com            │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ ❤️  Dietary Preferences  →  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 👨‍🍳 Cooking Preferences →  │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 🚪 Sign Out            →     │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Hero profile card
  - Avatar circle with user icon
  - Display name
  - Email address
- Preferences section
  - Dietary Preferences (tap to edit)
  - Cooking Preferences (tap to edit)
- Account section
  - Sign Out (red text)

**Interactions:**
- Tap Dietary Preferences to open edit sheet
- Tap Cooking Preferences to open edit sheet
- Tap Sign Out to logout (with confirmation)

---

### Dietary Preferences Sheet (`components/profile/DietaryPreferencesSection.tsx`)
```
┌─────────────────────────────────────┐
│  ════════════════════════════════   │  ← Sheet Handle
├─────────────────────────────────────┤
│  Dietary Preferences     [ ← Back ] │
├─────────────────────────────────────┤
│  ALLERGIES                          │
│  ┌─────────────────────────────┐   │
│  │ [ ] Gluten                  │   │
│  │ [ ] Dairy                   │   │
│  │ [ ] Nuts                    │   │
│  │ [ ] Shellfish               │   │
│  │ [ ] Soy                     │   │
│  │ [ ] Eggs                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  DIETARY RESTRICTIONS               │
│  ┌─────────────────────────────┐   │
│  │ [ ] Vegetarian              │   │
│  │ [ ] Vegan                   │   │
│  │ [ ] Keto                    │   │
│  │ [ ] Paleo                   │   │
│  │ [ ] Low Carb                │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│      [ SAVE CHANGES Button ]         │
└─────────────────────────────────────┘
```

**Elements:**
- Sheet handle (drag indicator)
- Header with back button
- Allergies section (checkboxes)
- Dietary restrictions section (checkboxes)
- Save Changes button

---

### Cooking Preferences Sheet (`components/profile/CookingPreferencesSection.tsx`)
```
┌─────────────────────────────────────┐
│  ════════════════════════════════   │  ← Sheet Handle
├─────────────────────────────────────┤
│  Cooking Preferences    [ ← Back ]   │
├─────────────────────────────────────┤
│  COOKING EXPERIENCE                 │
│  ┌─────────────────────────────┐   │
│  │ ○ Beginner                 │   │
│  │ ○ Intermediate             │   │
│  │ ○ Advanced                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  TIME AVAILABLE                     │
│  ┌─────────────────────────────┐   │
│  │ ○ < 30 minutes             │   │
│  │ ○ 30-60 minutes            │   │
│  │ ○ > 60 minutes             │   │
│  └─────────────────────────────┘   │
│                                     │
│  PREFERRED CUISINE TYPES            │
│  ┌─────────────────────────────┐   │
│  │ [ ] Italian                │   │
│  │ [ ] Mexican                │   │
│  │ [ ] Asian                  │   │
│  │ [ ] Mediterranean          │   │
│  │ [ ] American                │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│      [ SAVE CHANGES Button ]         │
└─────────────────────────────────────┘
```

**Elements:**
- Sheet handle (drag indicator)
- Header with back button
- Cooking experience (radio buttons)
- Time available (radio buttons)
- Preferred cuisine types (checkboxes)
- Save Changes button

---

## DESIGN SYSTEM REFERENCE

### Colors (`constants/colors.ts`)
- **Primary**: Teal/green tones
- **Secondary**: Warm squash orange
- **Surface**: Light gray/white cards
- **Text**: Dark gray for readability
- **Background**: Off-white/light gray
- **Border**: Subtle gray borders
- **Semantic**: Success (green), Error (red), Warning (yellow)

### Typography (`constants/typography.ts`)
- **Font Family**: Soria (serif) for display, Manrope (sans) for body
- **Headings**: h1, h2, h3 (larger, bolder)
- **Body**: body, bodySmall (readable sizes)
- **Caption**: caption (small, secondary text)

### Spacing (`constants/spacing.ts`)
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **xxl**: 32px

### Components
- **ScreenHeader**: Consistent header with title, icon, optional subtitle
- **Button**: Primary, secondary, outline variants
- **Card**: Rounded corners, subtle shadows
- **Input**: Rounded borders, consistent padding
- **Modal**: Slide-up sheets with handle

### Patterns
- **Safe Areas**: All screens respect device safe areas
- **Keyboard Avoidance**: Input fields handle keyboard properly
- **Loading States**: Skeleton loaders or spinners
- **Empty States**: Helpful messages with action buttons
- **Error Handling**: Toast notifications for feedback

---

## NAVIGATION FLOW

```
Auth Flow
  ↓
Onboarding Flow
  ↓
Main App (5 Tabs)
  ├── Nosh (Chat)
  │   ├── Chat messages
  │   ├── Recipe cards (inline)
  │   └── Recipe Detail Modal
  │
  ├── Recipes
  │   ├── Recipe Grid
  │   ├── Recipe Detail Modal
  │   ├── Import Recipe Modal
  │   └── Edit Recipe Modal
  │
  ├── Plan
  │   ├── Week/Day Selector
  │   ├── Meal Slots
  │   ├── Meal Plan Modal
  │   └── Recipe Detail Modal
  │
  ├── Shopping List
  │   ├── Quick Stats
  │   ├── Item List
  │   ├── Add Item Modal
  │   └── Export Modal
  │
  └── Profile
      ├── Dietary Preferences Sheet
      ├── Cooking Preferences Sheet
      └── Sign Out
```


---

*This diagram represents the current state of the Nosh app as of April 2026. For the most up-to-date implementation, refer to the source code in the repository.*
