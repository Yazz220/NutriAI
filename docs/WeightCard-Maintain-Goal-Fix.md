# WeightCard Maintain Goal Fix

**Date:** January 2025  
**Issue:** WeightCard not properly handling "maintain weight" goal type

## Problem Description

When users selected "maintain weight" as their goal in the Profile page, the WeightCard in the Progress tab would:
1. Not show a weight goal even though one was set
2. Display "Add a weight goal to see your progress here" message
3. Not provide appropriate feedback for maintaining current weight
4. Show confusing progress bar when target equals current weight

## Root Cause Analysis

### Issue 1: Goal Detection Logic
**File:** `components/progress/WeightCard.tsx` (line 34)

```typescript
// OLD - BROKEN
const hasGoal = goalStartWeight != null && goalTargetWeight != null && goalStartWeight !== goalTargetWeight;
```

**Problem:** When `goalType` is "maintain", the target weight often equals the start weight (or current weight). The condition `goalStartWeight !== goalTargetWeight` would evaluate to `false`, making the card think no goal exists.

### Issue 2: Weight Goal Sync Missing Goal Type
**File:** `hooks/useWeightTracking.ts` (line 90-111)

```typescript
// OLD - INCOMPLETE
const target = enhanced.profile?.targetWeight;
if (typeof target === 'number' && target > 0) {
  // Only syncs if explicit target exists
}
```

**Problem:** For "maintain" goals, users might not set an explicit `targetWeight` in their profile. The hook would never create a weight goal, leaving the card empty.

### Issue 3: Inappropriate Progress Bar
The progress bar visualization (start → target) doesn't make sense for "maintain" goals where the objective is to stay at current weight, not move toward a different weight.

## Solutions Implemented

### Fix 1: Improved Goal Detection
**File:** `components/progress/WeightCard.tsx`

```typescript
// NEW - FIXED
// A goal exists if we have both start and target weights (even if they're equal for 'maintain')
const hasGoal = goalStartWeight != null && goalTargetWeight != null;

// Determine goal direction with tolerance for maintain (within 0.5kg is considered maintain)
const goalDirection = hasGoal && goalStartWeight != null && goalTargetWeight != null
  ? Math.abs(goalTargetWeight - goalStartWeight) < 0.5
    ? 'maintain'
    : goalTargetWeight > goalStartWeight
      ? 'gain'
      : 'lose'
  : null;
```

**Impact:**
- ✅ Recognizes maintain goals even when target equals start
- ✅ Uses 0.5kg tolerance to handle floating-point precision
- ✅ Properly categorizes goal direction

### Fix 2: Smart Weight Goal Sync
**File:** `hooks/useWeightTracking.ts`

```typescript
// NEW - SMART SYNC
const goalType = enhanced.profile?.goalDirection || profile?.goals?.goalType;
const explicitTarget = enhanced.profile?.targetWeight;
const current = entries.length > 0 ? entries[0].weight : (profile?.basics?.weightKg ?? undefined);

// For 'maintain' goal without explicit target, use current weight as target
const target = (goalType === 'maintain' && !explicitTarget) ? current : explicitTarget;

if (typeof target === 'number' && target > 0) {
  const shouldUpdate = !goal || goal.targetWeight !== target;
  if (shouldUpdate) {
    console.log('[WeightTracking] Syncing weight goal:', { goalType, target, current });
    // Create/update goal...
  }
}
```

**Impact:**
- ✅ Automatically uses current weight as target for maintain goals
- ✅ Syncs when goal type changes (lose → maintain → gain)
- ✅ Logs sync operations for debugging
- ✅ Updates existing goals instead of only creating new ones

### Fix 3: Maintain-Specific UI
**File:** `components/progress/WeightCard.tsx`

```typescript
// Different subtitle messaging for maintain
if (goalDirection === 'maintain') {
  const variance = Math.abs(currentWeight - targetWeight);
  if (variance < 1.0) {
    subtitle = `Maintaining at ${targetWeight.toFixed(1)} kg. Keep it up! 💪`;
  } else if (currentWeight > targetWeight) {
    subtitle = `${variance.toFixed(1)} kg above target. Stay mindful to maintain ${targetWeight.toFixed(1)} kg.`;
  } else {
    subtitle = `${variance.toFixed(1)} kg below target. Keep consistent to maintain ${targetWeight.toFixed(1)} kg.`;
  }
}

// Different visual for maintain vs lose/gain
{goalDirection === 'maintain' ? (
  <View style={styles.maintainIndicator}>
    <Text style={styles.maintainLabel}>Target: {formatKg(targetWeight)}</Text>
    <Text style={styles.maintainCurrent}>Current: {formatKg(currentWeight)}</Text>
    {currentWeight != null && Math.abs(currentWeight - targetWeight) < 1.0 && (
      <Text style={styles.maintainSuccess}>✓ Within range</Text>
    )}
  </View>
) : (
  // Progress bar for lose/gain
)}
```

**Impact:**
- ✅ Shows target and current weight clearly for maintain goals
- ✅ Displays "✓ Within range" when maintaining successfully (±1kg)
- ✅ Provides encouraging feedback for staying on track
- ✅ Uses appropriate visual (indicator vs progress bar)

## Before vs After

### Before (Broken)
```
User selects "Maintain weight" in Profile
  ↓
No explicit targetWeight set
  ↓
useWeightTracking: No goal created (target is undefined)
  ↓
WeightCard: hasGoal = false (no target)
  ↓
Shows: "Add a weight goal to see your progress here"
```

### After (Fixed)
```
User selects "Maintain weight" in Profile
  ↓
goalType = 'maintain', targetWeight may be undefined
  ↓
useWeightTracking: Uses current weight as target
  ↓
WeightCard: hasGoal = true, goalDirection = 'maintain'
  ↓
Shows: "Maintaining at 70.0 kg. Keep it up! 💪"
       Target: 70.0 kg
       Current: 70.0 kg
       ✓ Within range
```

## Testing Scenarios

### Scenario 1: Maintain Goal (No Explicit Target)
1. Go to Profile → Edit Goal
2. Select "Maintain weight"
3. Set calories/macros but leave target weight empty
4. Save and go to Progress tab
5. **Expected:** WeightCard shows maintain goal with current weight as target

### Scenario 2: Maintain Goal (With Explicit Target)
1. Go to Profile → Edit Goal
2. Select "Maintain weight"
3. Set target weight to 70kg
4. Save and go to Progress tab
5. **Expected:** WeightCard shows "Maintaining at 70.0 kg"

### Scenario 3: Switch Between Goals
1. Start with "Lose weight" (target 65kg)
2. Progress tab shows progress bar: 70kg → 65kg
3. Switch to "Maintain weight"
4. Progress tab updates to maintain indicator
5. Switch to "Gain weight" (target 75kg)
6. Progress tab shows progress bar: 70kg → 75kg

### Scenario 4: Maintain Within Range
1. Set maintain goal at 70kg
2. Current weight is 70.5kg (within ±1kg)
3. **Expected:** Shows "✓ Within range" with green checkmark

### Scenario 5: Maintain Out of Range
1. Set maintain goal at 70kg
2. Current weight is 72kg (outside ±1kg)
3. **Expected:** Shows "2.0 kg above target. Stay mindful to maintain 70.0 kg."

## Files Modified

1. **hooks/useWeightTracking.ts**
   - Added goal type awareness
   - Smart target weight derivation for maintain goals
   - Enhanced logging for debugging

2. **components/progress/WeightCard.tsx**
   - Fixed goal detection logic
   - Added maintain-specific UI
   - Improved subtitle messaging
   - Added maintain indicator styles

## Technical Details

### Goal Type Mapping
```typescript
'lose-weight' → goalType: 'lose' → targetWeight < currentWeight
'maintain-weight' → goalType: 'maintain' → targetWeight ≈ currentWeight (±0.5kg)
'gain-weight' → goalType: 'gain' → targetWeight > currentWeight
```

### Maintain Range Tolerance
- **Goal direction detection:** ±0.5kg (prevents floating-point issues)
- **Success indicator:** ±1.0kg (realistic maintenance range)
- **Warning messages:** >1.0kg variance

### Data Flow
```
Profile Edit → setHealthGoals() → savePartial('goals')
    ↓
React Query invalidation + refetch
    ↓
useWeightTracking detects goalType change
    ↓
Creates/updates WeightGoal with smart target
    ↓
WeightCard renders appropriate UI
```

## Performance Impact

- **Minimal:** One additional check for goal type
- **Better UX:** Eliminates confusion for maintain goals
- **Logging:** Helps debug sync issues in production

## Future Enhancements

1. **Weight Range Visualization** - Show acceptable range (e.g., 69-71kg) for maintain goals
2. **Trend Analysis** - Weekly average to smooth daily fluctuations
3. **Maintenance Streak** - Track consecutive days within range
4. **Smart Notifications** - Alert when drifting outside maintain range
5. **Goal History** - Show how long user has been maintaining

## Related Issues Fixed

This fix also improves:
- Goal switching reliability (lose ↔ maintain ↔ gain)
- Weight goal persistence across app restarts
- Progress tab consistency with Profile settings
- User confidence in goal tracking accuracy

## Conclusion

The WeightCard now properly handles all three goal types:
- ✅ **Lose:** Shows progress bar from start to target
- ✅ **Maintain:** Shows current vs target with range indicator
- ✅ **Gain:** Shows progress bar from start to target

Users can confidently switch between goals and see appropriate, encouraging feedback in the Progress tab.
