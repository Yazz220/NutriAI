# Calorie & Macro Calculation Implementation

## Overview
This document explains how Nosh calculates accurate, research-backed calorie and macronutrient recommendations for users during onboarding and throughout their journey.

## Scientific Foundation

### Mifflin-St Jeor Equation
We use the **Mifflin-St Jeor equation**, proven more accurate than older formulas like Harris-Benedict and widely used by successful apps like MyFitnessPal.

**For Men:**
```
BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
```

**For Women:**
```
BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
```

**For Other/Prefer Not to Say:**
```
BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 78
(Average of male and female formulas)
```

## Activity Level Multipliers (TDEE)

After calculating BMR, we multiply by activity factors to get Total Daily Energy Expenditure (TDEE):

| Activity Level | Multiplier | Description |
|----------------|------------|-------------|
| Sedentary | 1.2 | Little to no exercise (desk job, minimal movement) |
| Lightly Active | 1.375 | Light exercise 1-3 days/week |
| Moderately Active | 1.55 | Moderate exercise 3-5 days/week |
| Very Active | 1.725 | Hard exercise 6-7 days/week |
| Extremely Active | 1.9 | Very hard exercise & physical job or 2x/day training |

**Source:** Research studies on TDEE calculation accuracy; MyFitnessPal standards

## Goal-Based Calorie Adjustments

### Weight Loss
- **Deficit:** -500 calories/day
- **Expected Rate:** 0.5-1 lb/week
- **Safety Minimums:** 
  - Men: 1500 calories
  - Women: 1200 calories
- **Rationale:** Safe, sustainable deficit that preserves muscle mass and metabolic health

### Weight Maintenance
- **Adjustment:** 0 calories
- **Target:** TDEE maintenance calories

### Muscle Gain
- **Surplus:** +350 calories/day
- **Expected Rate:** 0.5-0.7 lb/week
- **Rationale:** Research shows 250-350 cal surplus optimizes muscle-to-fat gain ratio

## Macronutrient Distribution

### Research-Backed Split: 40/30/30
All goals use the same evidence-based distribution:
- **Carbohydrates:** 40% of total calories
- **Protein:** 30% of total calories
- **Fat:** 30% of total calories

### Why This Distribution?

**Weight Loss:**
- Higher protein (30%) preserves muscle mass during calorie deficit
- Adequate carbs (40%) maintain energy levels and workout performance
- Sufficient fat (30%) supports hormone production

**Muscle Gain:**
- Protein (30%) supports muscle protein synthesis
- For users focused on muscle gain, we ensure protein meets 1.6-2.2g/kg bodyweight when applicable
- Carbs (40%) provide energy for intense training
- Fats (30%) support testosterone production

**Maintenance:**
- Balanced nutrition for overall health
- Supports active lifestyle and metabolic health

### Calorie-to-Gram Conversion
- **Protein:** 4 calories per gram
- **Carbohydrates:** 4 calories per gram
- **Fat:** 9 calories per gram

## Safety Constraints

### Calorie Limits
- Minimum: 1,200 calories
- Maximum: 4,000 calories

### Macro Limits (grams)
- Protein: 50-300g
- Carbohydrates: 100-500g
- Fat: 30-200g

## Implementation Files

### Core Calculation Files
1. **`utils/goalCalculations.ts`**
   - BMR calculation using Mifflin-St Jeor
   - TDEE calculation with activity multipliers
   - Macro target calculation with body weight optimization
   - Validation and safety checks

2. **`utils/onboardingProfileIntegration.ts`**
   - Onboarding-specific calorie calculation
   - Macro distribution for different health goals
   - Profile data mapping

### UI Integration
- **`app/(onboarding)/calorie-plan.tsx`**
  - Displays recommended calorie targets
  - Shows macro breakdown with nutrition card
  - Provides educational content explaining methodology
  - Allows custom calorie targets

## Research Sources

This implementation is based on:

1. **Scientific Publications:**
   - American Journal of Clinical Nutrition (1990) - Mifflin-St Jeor validation
   - PMC (PubMed Central) - Mobile nutrition app effectiveness
   - Sports Medicine & Nutrition Science (2021) - Macro distribution studies

2. **Industry Standards:**
   - MyFitnessPal calculation methodology
   - Cronometer scientific accuracy standards
   - NASM (National Academy of Sports Medicine) guidelines

3. **Medical Guidelines:**
   - Cleveland Clinic BMR guidelines
   - Medscape nutrition references
   - Registered dietitian recommendations

## Example Calculation

**User Profile:**
- Age: 30 years
- Height: 175 cm
- Weight: 80 kg
- Sex: Male
- Activity Level: Moderately Active
- Goal: Weight Loss

**Step 1: Calculate BMR**
```
BMR = 10 × 80 + 6.25 × 175 - 5 × 30 + 5
BMR = 800 + 1093.75 - 150 + 5
BMR = 1,749 calories
```

**Step 2: Calculate TDEE**
```
TDEE = BMR × Activity Multiplier
TDEE = 1,749 × 1.55
TDEE = 2,711 calories
```

**Step 3: Apply Goal Adjustment**
```
Target = TDEE - 500 (weight loss)
Target = 2,711 - 500
Target = 2,211 calories
```

**Step 4: Calculate Macros**
```
Protein = (2,211 × 0.30) / 4 = 166g
Carbs = (2,211 × 0.40) / 4 = 221g
Fat = (2,211 × 0.30) / 9 = 74g
```

**Verification:**
```
Total = (166 × 4) + (221 × 4) + (74 × 9)
Total = 664 + 884 + 666
Total = 2,214 calories ✓ (within 5% tolerance)
```

## Trust & Transparency

Users can view the methodology behind calculations through the "Behind the question" feature on the calorie plan screen, which explains:
- The Mifflin-St Jeor equation
- Research-backed calorie adjustments
- Smart macro distribution

This transparency builds user trust and confidence in the app's recommendations.

## Future Enhancements

Potential improvements for future versions:
1. **Body Composition Adjustments:** Factor in muscle mass percentage (FFMI)
2. **Dynamic Updates:** Integrate step counting for daily TDEE adjustments
3. **Adaptive Learning:** Adjust recommendations based on actual progress data
4. **Micronutrient Tracking:** Extend to vitamins and minerals
5. **Age-Specific Adjustments:** Special considerations for teens and seniors

---

**Last Updated:** 2025-10-05  
**Version:** 1.0
