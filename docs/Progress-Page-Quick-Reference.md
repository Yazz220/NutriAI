# Progress Page Quick Reference

## 🎯 Data Flow Map

```
User Actions → State Updates → UI Refresh
     ↓              ↓             ↓
  Log Food    loggedMeals    Nutrition Rings
  Add Weight   entries       Weight/BMI Cards
  Set Goals    goals         Goal Displays
  Plan Meal    plannedMeals  Daily Totals
```

---

## 📊 Key Data Sources

| Hook | Storage | Purpose |
|------|---------|---------|
| `useNutrition` | `loggedMeals` (AsyncStorage) | Logged food, goals, daily progress |
| `useWeightTracking` | `weight_entries` (AsyncStorage) | Weight history, goals |
| `useUserProfile` | `userProfile` (AsyncStorage + Supabase) | Core profile data |
| `useMealPlanner` | `plannedMeals` (AsyncStorage) | Planned meals |

---

## 🔧 Key Functions

### `getDailyProgress(date: string)`
Returns complete nutrition data for a date:
- Combines logged + planned meals
- Calculates calories/macros consumed
- Compares to goals
- Returns status (under/met/over)

**Used by:** All progress cards, nutrition rings, trends

---

### `calculateGoalsFromProfile()`
Calculates nutrition goals with 4-layer fallback:
1. Auto-calc (BMR + TDEE) ← Best
2. Manual profile goals
3. Legacy preferences
4. Defaults (2000 cal) ← Last resort

**Triggers:** Profile changes, app startup

---

### `addWeightEntry(weight, date?)`
Adds weight entry and syncs profile:
1. Adds to `entries` array
2. Updates `profile.basics.weightKg`
3. Saves to AsyncStorage
4. Triggers BMI/WeightCard refresh

---

## 🎨 UI Components

| Component | Data | Refresh Trigger |
|-----------|------|-----------------|
| `CompactNutritionRings` | `getDailyProgress(dayISO)` | Logged meals, planned meals, goals |
| `WeightCard` | `weightTracking.getCurrentWeight()` | Weight entries, goals |
| `BMICard` | Weight + Height | Weight, height changes |
| `EnhancedTotalCaloriesCard` | `getDailyProgress()` for range | Logged/planned meals |
| `NutritionTrendsCard` | Historical `getDailyProgress()` | Any nutrition data |

---

## 🐛 Common Issues & Solutions

### Issue: Calories not updating after logging food
**Check:** Is `loggedMeals` state updating?  
**Debug:** Add `console.log('[Food Logged]', loggedMeals)` in `useNutrition`  
**Solution:** Ensure `logCustomMeal()` is called with correct date

---

### Issue: BMI shows "--" despite having weight
**Check:** Is height set in profile?  
**Debug:** `console.log('Height:', profile?.height, 'Weight:', currentWeight?.weight)`  
**Solution:** User must set height in profile settings

---

### Issue: Goals show 2000 cal instead of calculated
**Check:** Is profile complete (age, sex, height, weight)?  
**Debug:** Check `canCalculateFromProfile` value  
**Solution:** User needs to complete onboarding or profile

---

### Issue: Planned meals not showing in totals
**Check:** Are planned meals marked as completed?  
**Debug:** Check `plannedMeal.isCompleted` status  
**Note:** **Uncompleted** planned meals **do** count (by design)

---

## 📅 Date Handling

**Standard:** Use `utils/dateUtils.ts`

```typescript
import { getTodayISO, toISODate } from '@/utils/dateUtils';

// ✅ Correct
const today = getTodayISO();
const dateStr = toISODate(someDate);

// ❌ Avoid
const today = new Date().toISOString().split('T')[0]; // Use utility instead
```

---

## ✨ Recent Improvements

1. **Planned/Logged Indicator** - Shows breakdown when both exist
2. **Weight Sync Detection** - Logs when profile weight changes externally
3. **Better Documentation** - Goal calculation, date handling explained
4. **Date Utilities** - Centralized date formatting functions

---

## 📱 Testing Commands

```bash
# Check TypeScript errors
npx tsc --noEmit

# Run app
npm start

# Clear all AsyncStorage (debugging)
# In app DevMenu: Reload + Clear AsyncStorage
```

---

## 🔍 Debug Flags

Add to `useNutrition.ts` for debugging:

```typescript
const DEBUG = __DEV__; // Enable in development

if (DEBUG) {
  console.log('[Nutrition] Daily Progress:', dailyProgress);
  console.log('[Nutrition] Goals:', calculatedGoals);
  console.log('[Nutrition] Logged Meals:', loggedMeals.length);
}
```

---

## 📚 Related Documentation

- `docs/Progress-Page-Review.md` - Comprehensive architecture review
- `docs/Progress-Page-Fixes.md` - Applied fixes and improvements
- `utils/goalCalculations.ts` - BMR/TDEE calculation logic
- `utils/dateUtils.ts` - Date formatting utilities

---

**Last Updated:** 2025-01-15  
**Status:** ✅ Production Ready
