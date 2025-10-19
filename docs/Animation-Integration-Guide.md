# Animation Integration Guide

## Overview
This guide explains how to integrate the new animated components to create a dynamic, visually engaging experience when users log food.

## New Animated Components

### 1. AnimatedNumber
**Location**: `components/ui/AnimatedNumber.tsx`

Smoothly animates number changes with spring physics.

```tsx
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

// Basic usage
<AnimatedNumber value={calories} style={styles.calorieText} />

// With formatting
<AnimatedNumber 
  value={protein} 
  format={(v) => v.toFixed(1)}
  suffix="g"
  duration={800}
/>
```

### 2. FoodLoggingSuccess
**Location**: `components/nutrition/FoodLoggingSuccess.tsx`

Shows a celebratory animation when food is successfully logged.

```tsx
import { FoodLoggingSuccess } from '@/components/nutrition/FoodLoggingSuccess';

// Usage in modal
<FoodLoggingSuccess
  visible={showSuccess}
  calories={200}
  protein={15}
  foodName="Grilled Chicken"
  onComplete={() => setShowSuccess(false)}
/>
```

### 3. AnimatedCalorieRing
**Location**: `components/nutrition/AnimatedCalorieRing.tsx`

Enhanced calorie ring with spring animations, glow effects, and celebration when goal is reached.

```tsx
import { AnimatedCalorieRing } from '@/components/nutrition/AnimatedCalorieRing';

// Replace existing calorie ring
<AnimatedCalorieRing
  consumed={1500}
  goal={2000}
  size={200}
  strokeWidth={14}
  showPulse={true}
/>
```

### 4. AnimatedMacroBar
**Location**: `components/nutrition/AnimatedMacroBar.tsx`

Progress bars for macros with shimmer effects, bounce animations, and micro-interactions.

```tsx
import { AnimatedMacroBar } from '@/components/nutrition/AnimatedMacroBar';

// For protein tracking
<AnimatedMacroBar
  label="Protein"
  value={75}
  goal={100}
  color={Colors.primary}
  icon={<ProteinIcon />}
  onPress={() => console.log('Protein details')}
/>
```

## Integration Instructions

### Step 1: Update Coach Tab (Tracking Page)

In `app/(tabs)/coach.tsx`, replace the existing calorie ring:

```tsx
// OLD CODE
<FitnessRing
  size={ringSize}
  stroke={stroke}
  radius={radius}
  circumference={circumference}
  dash={dash}
  pct={ringPct}
/>

// NEW CODE  
import { AnimatedCalorieRing } from '@/components/nutrition/AnimatedCalorieRing';

<AnimatedCalorieRing
  consumed={eaten}
  goal={calorieGoal}
  size={200}
  showPulse={true}
/>
```

### Step 2: Update Macro Display

Replace static macro text with animated bars:

```tsx
import { AnimatedMacroBar } from '@/components/nutrition/AnimatedMacroBar';

// In your macro section
<View style={styles.macroContainer}>
  <AnimatedMacroBar
    label="Protein"
    value={dailyProgress.macros.protein.consumed}
    goal={currentGoals.protein}
    color="#4CAF50"
  />
  <AnimatedMacroBar
    label="Carbs"
    value={dailyProgress.macros.carbs.consumed}
    goal={currentGoals.carbs}
    color="#2196F3"
  />
  <AnimatedMacroBar
    label="Fats"
    value={dailyProgress.macros.fats.consumed}
    goal={currentGoals.fats}
    color="#FF9800"
  />
</View>
```

### Step 3: Update Number Displays

Replace all static number displays with AnimatedNumber:

```tsx
// OLD CODE
<Text>{calories}</Text>

// NEW CODE
<AnimatedNumber value={calories} style={styles.text} />
```

### Step 4: Food Logging Success Animation

Already integrated in `ExternalFoodLoggingModal.tsx`. The success animation automatically shows when food is logged.

## Animation Behaviors

### On Food Log:
1. **Modal Fade Out**: Smooth fade with slide animation
2. **Success Overlay**: Celebratory animation with particles
3. **Number Updates**: All nutrition values smoothly increment
4. **Progress Bars**: Spring animations with shimmer effects
5. **Calorie Ring**: Fills with spring physics, glows when goal reached
6. **Streak Update**: Pulse animation when streak increases

### Visual Feedback Timeline:
- **0-300ms**: Modal begins fade out
- **100-400ms**: Success animation appears
- **200-800ms**: Numbers begin incrementing
- **300-1000ms**: Progress bars animate
- **400-1200ms**: Calorie ring updates
- **2000ms**: Success animation auto-hides

## Best Practices

### 1. Consistent Duration
Use consistent animation durations across components:
- Quick feedback: 200-300ms
- Value changes: 800ms
- Celebration: 1000-2000ms

### 2. Spring Physics
Use spring animations for natural feel:
```tsx
Animated.spring(value, {
  friction: 8,  // Controls "bounciness"
  tension: 40,  // Controls speed
  useNativeDriver: true,
})
```

### 3. Performance
- Always use `useNativeDriver: true` when possible
- Limit simultaneous animations to 5-6
- Use `InteractionManager` for heavy animations

### 4. Accessibility
- Provide option to reduce motion
- Ensure animations don't interfere with screen readers
- Keep text readable during animations

## Customization

### Colors
Update animation colors in components to match your theme:
```tsx
// In AnimatedCalorieRing.tsx
const getColor = () => {
  if (percentage >= 1) return Colors.success;  // Green
  if (percentage >= 0.7) return Colors.warning; // Yellow
  return Colors.primary; // Primary brand color
};
```

### Animation Speed
Adjust animation speed by modifying duration/friction/tension:
```tsx
// Slower animations
Animated.spring(value, {
  friction: 10,  // Higher = slower
  tension: 30,   // Lower = slower
})

// Faster animations
Animated.spring(value, {
  friction: 6,   // Lower = faster
  tension: 100,  // Higher = faster
})
```

### Particle Effects
Customize success particles in `FoodLoggingSuccess.tsx`:
```tsx
// Number of particles
const PARTICLE_COUNT = 8;

// Particle colors
const PARTICLE_COLORS = [Colors.primary, Colors.success, Colors.warning];
```

## Testing

### Manual Testing Checklist:
- [ ] Log food from search - animations play smoothly
- [ ] Log food from scan - success overlay appears
- [ ] Log manual food - numbers increment smoothly
- [ ] Reach daily goal - celebration animation triggers
- [ ] Update streak - card pulses
- [ ] Tap macro bars - micro-interactions work
- [ ] Check performance on older devices
- [ ] Verify no janky animations

### Performance Monitoring:
Use React DevTools Profiler to ensure:
- Animations run at 60 FPS
- No unnecessary re-renders
- Memory usage stays stable

## Troubleshooting

### Animation Jank
If animations stutter:
1. Check `useNativeDriver` is enabled
2. Reduce number of simultaneous animations
3. Simplify animation calculations

### Values Not Updating
If numbers don't animate:
1. Ensure value prop changes
2. Check component re-renders
3. Verify animation listeners

### Memory Leaks
If app slows over time:
1. Clean up animation listeners in useEffect
2. Stop looped animations on unmount
3. Clear animation values when not needed

## Future Enhancements

### Planned Features:
1. **Confetti explosion** when weekly goal reached
2. **Ripple effects** on all touch interactions
3. **Skeleton loading** with shimmer for all data
4. **3D card flips** for meal type selection
5. **Liquid fill** animation for water tracking
6. **Particle trails** following user swipes
7. **Achievement badges** with unlock animations
8. **Sound effects** synchronized with animations

## Support

For issues or questions about animations:
1. Check component PropTypes for all options
2. Review animation examples in `/docs/examples/`
3. Test on physical devices for best performance
4. Use Chrome DevTools for web debugging

---

*These animations create a delightful, responsive experience that makes food logging feel rewarding and engaging.*
