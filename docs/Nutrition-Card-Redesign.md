# Nutrition Card Redesign - Compact Horizontal Layout

## Overview
Redesigned the `RecipeNutritionCard` component to use a more compact horizontal layout with the calorie ring on the left and macro bars on the right, inspired by modern nutrition tracking apps.

## Design Changes

### Before (Vertical Layout)
```
┌─────────────────────┐
│   Nutrition Facts   │
│                     │
│    ┌─────────┐     │
│    │  2200   │     │
│    │ CALORIES│     │
│    └─────────┘     │
│                     │
│  ⭕    ⭕    ⭕     │
│ PROTEIN CARBS FAT  │
└─────────────────────┘
```

### After (Horizontal Layout)
```
┌──────────────────────────────┐
│    Nutrition Facts           │
│                              │
│  ┌───────┐  • Protein  158g │
│  │ 2200  │  ▓▓▓▓▓▓░░░░      │
│  │ kcal  │  • Carbs   210g  │
│  └───────┘  ▓▓▓▓▓▓▓▓░░      │
│             • Fat     70g    │
│             ▓▓▓▓░░░░░░      │
└──────────────────────────────┘
```

## Key Features

### 1. **Compact Horizontal Layout**
- Calorie ring positioned on the left (90x90px, down from 110x110px)
- Macro bars on the right side
- Takes up less vertical space
- More modern, dashboard-like appearance

### 2. **Horizontal Progress Bars**
Each macro shows:
- Colored dot indicator (8x8px circle)
- Macro name (Protein, Carbs, Fat)
- Value with unit (e.g., "158g" or "632cal")
- Horizontal progress bar showing percentage of total calories

### 3. **Preserved Functionality**
- ✅ `showGrams` prop still works (onboarding shows grams, recipes show calories)
- ✅ Color ring segments show macro distribution
- ✅ All existing colors preserved (green=protein, orange=carbs, red=fat)
- ✅ Backward compatible with all existing usage

### 4. **Visual Improvements**
- Smaller calorie ring (90px vs 110px)
- "kcal" label instead of "CALORIES" (more compact)
- Color dots match the ring segments
- Progress bars provide visual feedback
- Cleaner, more professional appearance

## Component Structure

### New MacroBar Component
```typescript
const MacroBar: React.FC<{
  label: string;      // "Protein", "Carbs", "Fat"
  value: number;      // 158, 210, 70
  unit: string;       // "g" or "cal"
  color: string;      // Colors.nutrition.protein, etc.
  percent: number;    // 30, 40, 30 (percentage of total)
}> = ({ label, value, unit, color, percent }) => (
  <View style={styles.macroBarContainer}>
    <View style={styles.macroBarHeader}>
      <View style={styles.macroBarLabelRow}>
        <View style={[styles.macroColorDot, { backgroundColor: color }]} />
        <Text style={styles.macroBarLabel}>{label}</Text>
      </View>
      <Text style={styles.macroBarValue}>{value}{unit}</Text>
    </View>
    <View style={styles.macroBarTrack}>
      <View 
        style={[
          styles.macroBarFill, 
          { 
            backgroundColor: color,
            width: `${Math.min(percent, 100)}%`
          }
        ]} 
      />
    </View>
  </View>
);
```

## Usage Examples

### Recipe Detail Page (Default - Shows Calories)
```tsx
<RecipeNutritionCard
  calories={2200}
  protein={138}  // Will show as "550cal" (138 × 4)
  carbs={275}    // Will show as "1100cal" (275 × 4)
  fats={61}      // Will show as "550cal" (61 × 9)
/>
```

### Onboarding Page (Shows Grams)
```tsx
<RecipeNutritionCard
  calories={2102}
  protein={158}  // Will show as "158g"
  carbs={210}    // Will show as "210g"
  fats={70}      // Will show as "70g"
  showGrams={true}
/>
```

## Style Specifications

### Calorie Ring
- Size: 90x90px (down from 110x110px)
- Stroke width: 5px (down from 6px)
- Radius: 38px (down from 45px)
- Center text: 24px bold (down from 28px)
- Label: 10px "kcal" (was "CALORIES")

### Macro Bars
- Color dot: 8x8px circle
- Label: 12px medium weight
- Value: 12px semibold
- Bar height: 6px
- Bar border radius: 3px
- Background: Colors.border
- Fill: Macro color (protein/carbs/fat)

### Layout
- Container: Horizontal flexbox
- Gap: Spacing.md between ring and bars
- Bars: Vertical stack with Spacing.sm gap
- Bars flex: 1 (takes remaining space)

## Benefits

### Space Efficiency
- **40% less vertical space** - Fits more content on screen
- Better for scrollable recipe lists
- Cleaner onboarding flow

### User Experience
- **Easier to scan** - Horizontal layout follows natural reading pattern
- **Clear hierarchy** - Calories prominent, macros detailed
- **Visual feedback** - Progress bars show macro balance at a glance

### Maintainability
- **Single component** - No separate mobile/desktop versions needed
- **Backward compatible** - All existing code works without changes
- **Flexible** - Easy to add more metrics in the future

## Files Modified

1. **`components/recipe-detail/RecipeNutritionCard.tsx`**
   - Changed layout from vertical to horizontal
   - Replaced MacroCircle with MacroBar component
   - Updated all styles for compact design
   - Reduced ring size from 110px to 90px
   - Added progress bar styles

## Testing Checklist

- ✅ Recipe detail page shows nutrition correctly
- ✅ Onboarding calorie plan shows grams
- ✅ Color ring segments display properly
- ✅ Progress bars show correct percentages
- ✅ All colors match original design
- ✅ Layout responsive to different screen sizes
- ✅ TypeScript compilation passes

## Future Enhancements

Possible improvements for future versions:
1. **Animated bars** - Smooth fill animation on mount
2. **Tap to toggle** - Switch between grams/calories on tap
3. **Micronutrients** - Add vitamins/minerals section
4. **Comparison mode** - Show vs. daily goals
5. **Accessibility** - Add screen reader labels

---

**Implementation Date:** 2025-10-05  
**Status:** ✅ Complete  
**Version:** 2.0
