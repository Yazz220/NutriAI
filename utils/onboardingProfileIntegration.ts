import { OnboardingData, HealthGoal, GoalDirection, healthGoalToProfileMapping, OnboardingGoalPreferences, OnboardingCustomGoal, MacroBreakdown } from '@/types/onboarding';
import { UserProfileState, UserBasics, UserGoals, UserPreferencesProfile } from '@/hooks/useUserProfile';

export interface CalorieCalculationParams {
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  activityLevel: string;
  goalType: GoalDirection;
  targetWeight?: number;
}

export type MacroTargets = MacroBreakdown;

export class OnboardingProfileIntegration {
  
  /**
   * Convert onboarding data to UserProfile format
   */
  static mapOnboardingToProfile(data: OnboardingData): Partial<UserProfileState> {
    const { healthGoal, basicProfile, dietaryPreferences, customGoal, goalPreferences } = data;

    const preferences = goalPreferences ?? { goalType: null, useCustomCalories: false };
    const goalDirection = this.resolveGoalDirection(healthGoal, preferences);

    let recommendedCalories: number | undefined;
    let recommendedMacros: MacroTargets | undefined;
    let dailyCalories: number | undefined;
    let macroTargets: MacroTargets | undefined;

    if (this.hasCompleteProfileData(basicProfile)) {
      recommendedCalories = this.calculateDailyCalories({
        age: basicProfile.age!,
        height: basicProfile.height!,
        weight: basicProfile.weight!,
        gender: basicProfile.gender || 'other',
        activityLevel: basicProfile.activityLevel!,
        goalType: goalDirection,
        targetWeight: basicProfile.targetWeight
      });

      const macroReferenceGoal = this.getMacroReferenceGoal(healthGoal, goalDirection);
      recommendedMacros = this.calculateMacroTargets(recommendedCalories, macroReferenceGoal);

      const useCustomCalories = preferences.useCustomCalories && typeof preferences.customCalorieTarget === 'number';
      if (useCustomCalories) {
        dailyCalories = Math.round(preferences.customCalorieTarget!);
        macroTargets = preferences.customMacroTargets
          ? preferences.customMacroTargets
          : this.calculateMacroTargets(dailyCalories, macroReferenceGoal);
      } else {
        dailyCalories = recommendedCalories;
        macroTargets = recommendedMacros;
      }
    }

    return {
      basics: this.mapBasicProfile(basicProfile),
      goals: this.mapGoalsProfile({
        healthGoal,
        basicProfile,
        customGoal,
        goalPreferences: preferences,
        goalDirection,
        dailyCalories,
        macroTargets,
        recommendedCalories,
        recommendedMacros
      }),
      preferences: this.mapPreferencesProfile(dietaryPreferences)
    };
  }

  /**
   * Map basic profile information
   */
  private static mapBasicProfile(basicProfile: OnboardingData['basicProfile']): Partial<UserBasics> {
    return {
      name: undefined, // Will be set during auth if provided
      age: basicProfile.age,
      sex: this.mapGenderToSex(basicProfile.gender),
      heightCm: basicProfile.height,
      weightKg: basicProfile.weight
    };
  }

  /**
   * Map goals profile information
   */
  private static mapGoalsProfile({
    healthGoal,
    basicProfile,
    customGoal,
    goalPreferences,
    goalDirection,
    dailyCalories,
    macroTargets,
    recommendedCalories,
    recommendedMacros
  }: {
    healthGoal: HealthGoal | null;
    basicProfile: OnboardingData['basicProfile'];
    customGoal: OnboardingCustomGoal | null;
    goalPreferences: OnboardingGoalPreferences;
    goalDirection: GoalDirection;
    dailyCalories?: number;
    macroTargets?: MacroTargets;
    recommendedCalories?: number;
    recommendedMacros?: MacroTargets;
  }): Partial<UserGoals> & Record<string, any> {
    return {
      // Nutrition goals
      dailyCalories,
      proteinTargetG: macroTargets?.protein,
      carbsTargetG: macroTargets?.carbs,
      fatsTargetG: macroTargets?.fats,
      goalType: goalDirection,
      activityLevel: this.mapActivityLevel(basicProfile.activityLevel),
      customGoalLabel: customGoal?.title,
      customGoalMotivation: customGoal?.motivation,
      usesCustomCalorieTarget: goalPreferences.useCustomCalories ?? false,
      recommendedCalories,
      recommendedProteinG: recommendedMacros?.protein,
      recommendedCarbsG: recommendedMacros?.carbs,
      recommendedFatsG: recommendedMacros?.fats,
      healthGoalKey: healthGoal ?? undefined,
      // Basic metrics (stored in goals JSONB for database persistence)
      age: basicProfile.age,
      heightCm: basicProfile.height,
      weightKg: basicProfile.weight,
      targetWeightKg: basicProfile.targetWeight,
      gender: basicProfile.gender,
    };
  }

  private static resolveGoalDirection(
    healthGoal: HealthGoal | null,
    preferences: OnboardingGoalPreferences
  ): GoalDirection {
    if (preferences.goalType) {
      return preferences.goalType;
    }
    if (healthGoal && healthGoalToProfileMapping[healthGoal]) {
      return healthGoalToProfileMapping[healthGoal]?.goalType ?? 'maintain';
    }
    return 'maintain';
  }

  private static getMacroReferenceGoal(
    healthGoal: HealthGoal | null,
    goalDirection: GoalDirection
  ): HealthGoal {
    if (healthGoal && healthGoal !== 'custom') {
      return healthGoal;
    }
    switch (goalDirection) {
      case 'lose':
        return 'lose-weight';
      case 'gain':
        return 'gain-weight';
      default:
        return 'maintain-weight';
    }
  }

  /**
   * Map activity level from onboarding to profile format
   */
  private static mapActivityLevel(activityLevel?: string): 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete' | undefined {
    if (!activityLevel) return undefined;
    const mapping: Record<string, 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'> = {
      'sedentary': 'sedentary',
      'lightly-active': 'light',
      'moderately-active': 'moderate',
      'very-active': 'active',
      'extremely-active': 'athlete'
    };
    return mapping[activityLevel] || 'light';
  }

  /**
   * Map dietary preferences
   */
  private static mapPreferencesProfile(
    dietaryPreferences: OnboardingData['dietaryPreferences']
  ): UserPreferencesProfile {
    return {
      allergies: dietaryPreferences.allergies ?? [],
      dietary: this.mapDietaryRestrictions(dietaryPreferences.restrictions),
      dislikedIngredients: dietaryPreferences.customRestrictions ?? [],
      preferredCuisines: [] // Can be expanded later
    };
  }

  /**
   * Calculate daily calorie needs using Mifflin-St Jeor Equation
   * Research-backed formula used by MyFitnessPal and nutrition professionals
   * 
   * For Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
   * For Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
   */
  static calculateDailyCalories(params: CalorieCalculationParams): number {
    const { age, height, weight, gender, activityLevel, goalType, targetWeight } = params;
    
    // Mifflin-St Jeor Equation for BMR
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      // Use female formula for female, other, and prefer-not-to-say
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Evidence-based activity multipliers
    // Source: Research studies on TDEE calculation accuracy
    const activityMultipliers: Record<string, number> = {
      'sedentary': 1.2,           // Little/no exercise
      'lightly-active': 1.375,    // Light exercise 1-3 days/week
      'moderately-active': 1.55,  // Moderate exercise 3-5 days/week
      'very-active': 1.725,       // Hard exercise 6-7 days/week
      'extremely-active': 1.9     // Very hard exercise & physical job
    };
    
    const multiplier = activityMultipliers[activityLevel] || 1.375;
    const maintenanceCalories = bmr * multiplier;
    
    // Adjust for goal with research-backed deficits/surpluses
    let targetCalories = maintenanceCalories;
    
    if (goalType === 'lose') {
      // Create deficit for 0.5-1 lb/week loss (safe, sustainable)
      targetCalories = maintenanceCalories - 500;
      
      // Ensure minimum calories for safety and metabolic health
      const minCalories = gender === 'male' ? 1500 : 1200;
      targetCalories = Math.max(targetCalories, minCalories);
      
    } else if (goalType === 'gain') {
      // Create surplus for lean muscle gain (0.5-0.7 lb/week)
      // Research shows 250-350 cal surplus optimizes muscle:fat gain ratio
      targetCalories = maintenanceCalories + 350;
    }
    
    return Math.round(targetCalories);
  }

  /**
   * Calculate macro targets based on calories and health goal
   * Research-backed distributions aligned with MyFitnessPal standards
   * 
   * All goals use: 40% carbs, 30% protein, 30% fat
   * This distribution supports:
   * - Weight loss: Higher protein preserves muscle during deficit
   * - Muscle gain: Adequate protein for synthesis, carbs for energy
   * - Maintenance: Balanced nutrition for health
   */
  static calculateMacroTargets(calories: number, healthGoal: HealthGoal | null): MacroTargets {
    // Research-backed macro distribution (MyFitnessPal standard)
    const proteinPercent = 0.30;
    const fatPercent = 0.30;
    const carbPercent = 0.40;

    const protein = Math.round((calories * proteinPercent) / 4); // 4 cal/g
    const carbs = Math.round((calories * carbPercent) / 4);      // 4 cal/g
    const fats = Math.round((calories * fatPercent) / 9);        // 9 cal/g

    return {
      protein: Math.max(50, Math.min(300, protein)), // Validate within safe bounds
      carbs: Math.max(100, Math.min(500, carbs)),
      fats: Math.max(30, Math.min(200, fats))
    };
  }

  /**
   * Validate if we have enough data for calorie calculation
   */
  private static hasCompleteProfileData(basicProfile: OnboardingData['basicProfile']): boolean {
    return !!(
      basicProfile.age &&
      basicProfile.height &&
      basicProfile.weight &&
      basicProfile.activityLevel
    );
  }

  /**
   * Map gender to sex field
   */
  private static mapGenderToSex(gender?: string): 'male' | 'female' | 'other' | undefined {
    if (!gender) return undefined;
    if (gender === 'prefer-not-to-say') return 'other';
    return gender as 'male' | 'female' | 'other';
  }

  /**
   * Map dietary restrictions to profile format
   */
  private static mapDietaryRestrictions(
    restrictions: string[]
  ): 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'kosher' | 'gluten_free' | 'keto' | 'paleo' | 'none' {
    // Priority order for conflicting restrictions
    if (restrictions.includes('vegan')) return 'vegan';
    if (restrictions.includes('vegetarian')) return 'vegetarian';
    if (restrictions.includes('pescatarian')) return 'pescatarian';
    if (restrictions.includes('halal')) return 'halal';
    if (restrictions.includes('kosher')) return 'kosher';
    if (restrictions.includes('gluten-free')) return 'gluten_free';
    if (restrictions.includes('keto')) return 'keto';
    if (restrictions.includes('paleo')) return 'paleo';
    return 'none';
  }

  /**
   * Calculate BMI for health insights
   */
  static calculateBMI(height: number, weight: number): number {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  }

  /**
   * Get BMI category
   */
  static getBMICategory(bmi: number): 'underweight' | 'normal' | 'overweight' | 'obese' {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  /**
   * Calculate ideal weight range based on height
   */
  static calculateIdealWeightRange(height: number): { min: number; max: number } {
    const heightInMeters = height / 100;
    const minWeight = 18.5 * heightInMeters * heightInMeters;
    const maxWeight = 24.9 * heightInMeters * heightInMeters;
    
    return {
      min: Math.round(minWeight),
      max: Math.round(maxWeight)
    };
  }

  /**
   * Validate target weight is reasonable
   */
  static validateTargetWeight(
    currentWeight: number,
    targetWeight: number,
    height: number,
    goalType: 'lose' | 'gain' | 'maintain'
  ): { isValid: boolean; message?: string } {
    const idealRange = this.calculateIdealWeightRange(height);
    
    // Check if target is within healthy BMI range
    const targetBMI = this.calculateBMI(height, targetWeight);
    if (targetBMI < 18.5 || targetBMI > 30) {
      return {
        isValid: false,
        message: 'Target weight should be within a healthy BMI range (18.5-30)'
      };
    }
    
    // Check if target aligns with goal
    if (goalType === 'lose' && targetWeight >= currentWeight) {
      return {
        isValid: false,
        message: 'Target weight should be less than current weight for weight loss'
      };
    }
    
    if (goalType === 'gain' && targetWeight <= currentWeight) {
      return {
        isValid: false,
        message: 'Target weight should be more than current weight for weight gain'
      };
    }
    
    // Check for reasonable rate of change (max 2 lbs per week)
    const maxWeeklyChange = 1; // kg per week
    const maxReasonableChange = maxWeeklyChange * 12; // 3 months
    const weightDifference = Math.abs(targetWeight - currentWeight);
    
    if (weightDifference > maxReasonableChange) {
      return {
        isValid: false,
        message: `Target weight change should be gradual. Consider a target closer to ${
          goalType === 'lose' 
            ? Math.max(currentWeight - maxReasonableChange, idealRange.min)
            : Math.min(currentWeight + maxReasonableChange, idealRange.max)
        } kg`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Get personalized recommendations based on profile
   */
  static getPersonalizedRecommendations(data: OnboardingData): string[] {
    const recommendations: string[] = [];
    const { healthGoal, basicProfile, dietaryPreferences } = data;
    
    // BMI-based recommendations
    if (basicProfile.height && basicProfile.weight) {
      const bmi = this.calculateBMI(basicProfile.height, basicProfile.weight);
      const category = this.getBMICategory(bmi);
      
      if (category === 'underweight' && healthGoal !== 'gain-weight') {
        recommendations.push('Consider focusing on healthy weight gain with nutrient-dense foods');
      }
      
      if (category === 'overweight' && healthGoal !== 'lose-weight') {
        recommendations.push('Consider a gradual weight loss approach for better health');
      }
    }
    
    // Activity level recommendations
    if (basicProfile.activityLevel === 'sedentary') {
      recommendations.push('Try to incorporate light physical activity to boost your metabolism');
    }
    
    // Dietary restriction recommendations
    if (dietaryPreferences.restrictions.includes('vegan') || dietaryPreferences.restrictions.includes('vegetarian')) {
      recommendations.push('Focus on protein-rich plant foods like legumes, nuts, and seeds');
    }
    
    if (dietaryPreferences.allergies.length > 0) {
      recommendations.push('We\'ll help you find safe alternatives for your allergens');
    }
    
    return recommendations;
  }
}