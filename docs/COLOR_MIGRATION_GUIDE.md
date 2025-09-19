# NutriAI Color System Migration Guide

## Overview

This guide helps you migrate from the old color system to the new comprehensive NutriAI color palette. The new system is designed specifically for nutrition and wellness apps with better accessibility, consistency, and visual hierarchy.

## 🎨 New Color Philosophy

### Core Principles
- **Natural & Fresh**: Green-based palette promoting health and wellness
- **Warm & Inviting**: Amber accents for energy and motivation  
- **Clean & Clear**: High contrast for excellent readability
- **Accessible**: WCAG 2.1 AA compliant color combinations

### Color Psychology
- **Forest Green** (#2D5A3D): Trust, growth, health, nature
- **Warm Amber** (#F4A261): Energy, vitality, warmth, motivation
- **Clean Whites**: Clarity, freshness, simplicity
- **Soft Grays**: Balance, neutrality, sophistication

## 📋 Migration Mapping

### Primary Colors
```typescript
// OLD → NEW
"#1C2A4B" → Colors.primary ("#2D5A3D")
"#B5EAD7" → Colors.primaryLight ("#4A7C59") 
"#FFCB77" → Colors.secondary ("#F4A261")
```

### Background Colors
```typescript
// OLD → NEW
"#FFF3EC" → Colors.background ("#FAFBFA")
"#FFDCCE" → Colors.card ("#FFFFFF")
"#F3F2EF" → Colors.surfaceMuted ("#F0F4F0")
```

### Text Colors
```typescript
// OLD → NEW
"#1C2A4B" → Colors.text ("#1A1A1A")
"#667085" → Colors.textSecondary ("#4A5A4A")
"#BFC4C9" → Colors.textMuted ("#8A9A8A")
```

### Semantic Colors
```typescript
// OLD → NEW
"#4C805E" → Colors.success ("#27AE60")
"#B97A28" → Colors.warning ("#F39C12")
"#B6543F" → Colors.error ("#E74C3C")
"#2B68A4" → Colors.info ("#3498DB")
```

## 🔄 Component Updates

### 1. Buttons

#### Before:
```typescript
const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: "#1C2A4B",
    color: "#FFFFFF",
  },
});
```

#### After:
```typescript
import { ComponentThemes } from '@/constants/colorThemes';

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: ComponentThemes.buttons.primary.background,
    color: ComponentThemes.buttons.primary.text,
    // Hover state
    '&:hover': {
      backgroundColor: ComponentThemes.buttons.primary.backgroundHover,
    },
  },
});
```

### 2. Cards

#### Before:
```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFDCCE",
    borderColor: "#BFC4C9",
  },
});
```

#### After:
```typescript
import { ComponentThemes } from '@/constants/colorThemes';

const styles = StyleSheet.create({
  card: {
    backgroundColor: ComponentThemes.cards.default.background,
    borderColor: ComponentThemes.cards.default.border,
    shadowColor: ComponentThemes.cards.default.shadow,
  },
});
```

### 3. Progress Indicators

#### Before:
```typescript
const styles = StyleSheet.create({
  progressBar: {
    backgroundColor: "#E5E7EB",
  },
  progressFill: {
    backgroundColor: "#4C805E",
  },
});
```

#### After:
```typescript
import { ComponentThemes } from '@/constants/colorThemes';

const styles = StyleSheet.create({
  progressBar: {
    backgroundColor: ComponentThemes.progress.calories.background,
  },
  progressFill: {
    backgroundColor: ComponentThemes.progress.calories.fill,
  },
});
```

### 4. Charts

#### Before:
```typescript
const chartConfig = {
  color: (opacity = 1) => `rgba(28, 42, 75, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(102, 112, 133, ${opacity})`,
};
```

#### After:
```typescript
import { ChartPalettes } from '@/constants/colorThemes';

const chartConfig = {
  color: (opacity = 1) => `rgba(45, 90, 61, ${opacity})`, // Colors.primary
  labelColor: (opacity = 1) => `rgba(107, 123, 107, ${opacity})`, // Colors.textTertiary
};

// For multi-series charts
const chartColors = ChartPalettes.nutrition; // [protein, carbs, fats, etc.]
```

## 🎯 Nutrition-Specific Colors

### Macronutrients
```typescript
import { Colors } from '@/constants/colors';

const macroColors = {
  protein: Colors.nutrition.protein, // #E74C3C (Red)
  carbs: Colors.nutrition.carbs,     // #F39C12 (Orange)  
  fats: Colors.nutrition.fats,       // #9B59B6 (Purple)
  fiber: Colors.nutrition.fiber,     // #27AE60 (Green)
};
```

### Meal Types
```typescript
const mealColors = {
  breakfast: Colors.nutrition.breakfast, // #F1C40F (Yellow)
  lunch: Colors.nutrition.lunch,         // #E67E22 (Orange)
  dinner: Colors.nutrition.dinner,       // #8E44AD (Purple)
  snack: Colors.nutrition.snack,         // #1ABC9C (Teal)
};
```

### Goal Achievement
```typescript
import { SemanticColors } from '@/constants/colorThemes';

const getGoalColor = (percentage: number) => {
  if (percentage >= 90) return SemanticColors.achievement.excellent;
  if (percentage >= 70) return SemanticColors.achievement.good;
  if (percentage >= 50) return SemanticColors.achievement.fair;
  return SemanticColors.achievement.poor;
};
```

## 🎨 Chart Color Palettes

### Primary Charts
```typescript
import { ChartPalettes } from '@/constants/colorThemes';

// For general data visualization
const colors = ChartPalettes.primary;

// For nutrition-specific charts
const nutritionColors = ChartPalettes.nutrition;

// For progress/achievement charts
const sequentialColors = ChartPalettes.sequential;
```

### Custom Chart Configuration
```typescript
const chartConfig = {
  backgroundGradientFrom: Colors.background,
  backgroundGradientTo: Colors.background,
  color: (opacity = 1) => `rgba(45, 90, 61, ${opacity})`,
  labelColor: (opacity = 1) => Colors.textTertiary,
  propsForBackgroundLines: {
    stroke: Colors.border,
    strokeWidth: 0.5,
  },
};
```

## ♿ Accessibility Considerations

### High Contrast Support
```typescript
import { AccessibilityHelpers } from '@/constants/colorThemes';

// Get high contrast version
const highContrastPrimary = AccessibilityHelpers.getHighContrast('primary');

// Get appropriate text color for background
const textColor = AccessibilityHelpers.getTextColorForBackground(backgroundColor);
```

### Focus Indicators
```typescript
const focusStyle = {
  borderColor: AccessibilityHelpers.focusRing.color,
  borderWidth: AccessibilityHelpers.focusRing.width,
  shadowColor: Colors.alpha.primary[30],
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 4,
};
```

## 🔧 Implementation Steps

### Step 1: Update Imports
```typescript
// Replace old color imports
import { Colors } from '@/constants/colors';
import { ComponentThemes, SemanticColors, ChartPalettes } from '@/constants/colorThemes';
```

### Step 2: Update Component Styles
- Replace hardcoded color values with semantic color tokens
- Use ComponentThemes for consistent component styling
- Apply appropriate hover/focus/disabled states

### Step 3: Update Charts
- Replace chart color configurations with new palette
- Use nutrition-specific colors for food/macro charts
- Ensure proper contrast for data visualization

### Step 4: Test Accessibility
- Verify color contrast ratios meet WCAG 2.1 AA standards
- Test with high contrast mode
- Ensure focus indicators are visible

## 📱 Platform-Specific Considerations

### iOS
- Use `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` for shadows
- Apply `elevation` for Android compatibility

### Android
- Use `elevation` for Material Design shadows
- Consider platform-specific color adaptations

## 🧪 Testing Checklist

- [ ] All components use new color tokens
- [ ] Charts use appropriate color palettes
- [ ] Accessibility contrast ratios are met
- [ ] High contrast mode works properly
- [ ] Focus indicators are visible
- [ ] Dark mode compatibility (if applicable)
- [ ] Color consistency across all screens

## 📚 Resources

- [WCAG 2.1 Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Color Psychology in UI Design](https://blog.adobe.com/en/publish/2017/06/29/psychology-of-color.html)
- [Accessible Color Palettes](https://accessible-colors.com/)

## 🆘 Common Issues & Solutions

### Issue: Colors look different on different devices
**Solution**: Use consistent color profiles and test on multiple devices

### Issue: Chart colors are hard to distinguish
**Solution**: Use ChartPalettes.categorical for maximum distinction

### Issue: Text is hard to read
**Solution**: Use AccessibilityHelpers.getTextColorForBackground()

### Issue: Focus indicators not visible
**Solution**: Apply AccessibilityHelpers.focusRing styles

---

## 💡 Tips for Success

1. **Start with high-impact components** (buttons, cards, navigation)
2. **Test frequently** on different devices and accessibility settings
3. **Use semantic color names** instead of specific color values
4. **Document custom color usage** for team consistency
5. **Consider user preferences** (high contrast, reduced motion)

Happy migrating! 🚀
