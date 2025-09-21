import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingData, defaultOnboardingData, OnboardingGoalPreferences, OnboardingCustomGoal, GoalDirection, MacroBreakdown } from '@/types/onboarding';

// Storage keys
const ONBOARDING_DATA_KEY = 'onboarding_data';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ONBOARDING_VERSION_KEY = 'onboarding_version';

// Current version for data migration
const CURRENT_ONBOARDING_VERSION = '1.0.0';

export interface OnboardingPersistenceError {
  type: 'storage' | 'validation' | 'migration';
  message: string;
  originalError?: Error;
}

export class OnboardingPersistenceManager {
  
  /**
   * Save onboarding data to local storage
   */
  static async saveOnboardingData(data: OnboardingData): Promise<void> {
    try {
      // Validate data before saving
      const validatedData = this.validateOnboardingData(data);
      
      // Add metadata
      const dataWithMetadata = {
        ...validatedData,
        lastSaved: new Date().toISOString(),
        version: CURRENT_ONBOARDING_VERSION
      };
      
      await AsyncStorage.setItem(
        ONBOARDING_DATA_KEY, 
        JSON.stringify(dataWithMetadata)
      );
      
      // Update version
      await AsyncStorage.setItem(ONBOARDING_VERSION_KEY, CURRENT_ONBOARDING_VERSION);
      
    } catch (error) {
      throw this.createPersistenceError(
        'storage',
        'Failed to save onboarding data',
        error as Error
      );
    }
  }

  /**
   * Load onboarding data from local storage
   */
  static async loadOnboardingData(): Promise<OnboardingData | null> {
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      
      if (!stored) {
        return null;
      }
      
      const parsedData = JSON.parse(stored);
      
      // Check if migration is needed
      const needsMigration = await this.checkMigrationNeeded(parsedData);
      if (needsMigration) {
        const migratedData = await this.migrateOnboardingData(parsedData);
        await this.saveOnboardingData(migratedData);
        return migratedData;
      }
      
      // Validate and sanitize loaded data
      return this.validateOnboardingData(parsedData);
      
    } catch (error) {
      console.warn('Failed to load onboarding data:', error);
      return null;
    }
  }

  /**
   * Clear onboarding data from storage
   */
  static async clearOnboardingData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        ONBOARDING_DATA_KEY,
        ONBOARDING_COMPLETED_KEY,
        ONBOARDING_VERSION_KEY
      ]);
    } catch (error) {
      throw this.createPersistenceError(
        'storage',
        'Failed to clear onboarding data',
        error as Error
      );
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async markOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ONBOARDING_COMPLETED_KEY, 
        JSON.stringify({
          completed: true,
          completedAt: new Date().toISOString(),
          version: CURRENT_ONBOARDING_VERSION
        })
      );
    } catch (error) {
      throw this.createPersistenceError(
        'storage',
        'Failed to mark onboarding as completed',
        error as Error
      );
    }
  }

  /**
   * Check if onboarding is completed
   */
  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      if (!completed) return false;
      
      const parsedCompleted = JSON.parse(completed);
      return parsedCompleted.completed === true;
    } catch (error) {
      console.warn('Failed to check onboarding completion status:', error);
      return false;
    }
  }

  /**
   * Reset onboarding (for testing or re-onboarding)
   */
  static async resetOnboarding(): Promise<void> {
    await this.clearOnboardingData();
  }

  /**
   * Validate onboarding data structure and sanitize values
   */
  private static validateOnboardingData(data: any): OnboardingData {
    const validated: OnboardingData = {
      ...defaultOnboardingData,
      ...data
    };

    // Validate health goal
    if (data.healthGoal && !this.isValidHealthGoal(data.healthGoal)) {
      validated.healthGoal = null;
    }

    // Validate basic profile
    if (data.basicProfile) {
      validated.basicProfile = this.validateBasicProfile(data.basicProfile);
    }

    // Validate dietary preferences
    if (data.dietaryPreferences) {
      validated.dietaryPreferences = this.validateDietaryPreferences(data.dietaryPreferences);
    }

    // Validate pantry setup
    if (data.pantrySetup) {
      validated.pantrySetup = this.validatePantrySetup(data.pantrySetup);
    }

    // Validate notifications
    if (data.notifications) {
      validated.notifications = this.validateNotifications(data.notifications);
    }

    validated.customGoal = this.validateCustomGoal(data.customGoal);
    validated.goalPreferences = this.validateGoalPreferences(data.goalPreferences);

    // Validate auth choice
    if (data.authChoice && !this.isValidAuthChoice(data.authChoice)) {
      validated.authChoice = null;
    }

    return validated;
  }

  private static validateBasicProfile(profile: any) {
    return {
      age: this.validateAge(profile.age),
      height: this.validateHeight(profile.height),
      weight: this.validateWeight(profile.weight),
      activityLevel: this.isValidActivityLevel(profile.activityLevel) ? profile.activityLevel : undefined,
      targetWeight: this.validateWeight(profile.targetWeight),
      gender: this.isValidGender(profile.gender) ? profile.gender : undefined
    };
  }

  private static validateDietaryPreferences(preferences: any) {
    return {
      restrictions: Array.isArray(preferences.restrictions) 
        ? preferences.restrictions.filter(this.isValidDietaryRestriction)
        : [],
      allergies: Array.isArray(preferences.allergies)
        ? preferences.allergies.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : [],
      customRestrictions: Array.isArray(preferences.customRestrictions)
        ? preferences.customRestrictions.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : []
    };
  }

  private static validatePantrySetup(pantrySetup: any) {
    return {
      skipPantry: Boolean(pantrySetup?.skipPantry),
      initialItems: Array.isArray(pantrySetup?.initialItems) ? pantrySetup.initialItems : []
    };
  }

  private static validateNotifications(notifications: any) {
    return {
      mealReminders: Boolean(notifications?.mealReminders),
      shoppingAlerts: Boolean(notifications?.shoppingAlerts),
      progressUpdates: Boolean(notifications?.progressUpdates),
    };
  }

  private static validateCustomGoal(customGoal: any): OnboardingCustomGoal | null {
    if (!customGoal) {
      return null;
    }

    const title = typeof customGoal.title === 'string' ? customGoal.title.trim() : '';
    const motivation = typeof customGoal.motivation === 'string' ? customGoal.motivation.trim() : undefined;
    const goalType = this.isValidGoalDirection(customGoal.goalType) ? customGoal.goalType : null;

    if (!title || !goalType) {
      return null;
    }

    return {
      title,
      goalType,
      motivation: motivation && motivation.length > 0 ? motivation : undefined,
    };
  }

  private static validateGoalPreferences(preferences: any): OnboardingGoalPreferences {
    const goalType = this.isValidGoalDirection(preferences?.goalType) ? preferences.goalType : null;
    const recommendedCalories = this.validatePositiveNumber(preferences?.recommendedCalories);
    const recommendedMacros = this.validateMacroTargets(preferences?.recommendedMacros);
    const useCustomCalories = Boolean(preferences?.useCustomCalories);
    const customCalorieTarget = this.validatePositiveNumber(preferences?.customCalorieTarget);
    const customMacroTargets = this.validateMacroTargets(preferences?.customMacroTargets);

    const sanitized: OnboardingGoalPreferences = {
      goalType,
      recommendedCalories: recommendedCalories ?? undefined,
      recommendedMacros,
      useCustomCalories,
      customCalorieTarget: customCalorieTarget ?? undefined,
      customMacroTargets,
    };

    if (!sanitized.useCustomCalories) {
      sanitized.customCalorieTarget = undefined;
      sanitized.customMacroTargets = undefined;
    }

    return sanitized;
  }

  private static validateMacroTargets(targets: any): MacroBreakdown | undefined {
    if (!targets) {
      return undefined;
    }

    const protein = this.validatePositiveNumber(targets.protein);
    const carbs = this.validatePositiveNumber(targets.carbs);
    const fats = this.validatePositiveNumber(targets.fats);

    if (protein === undefined || carbs === undefined || fats === undefined) {
      return undefined;
    }

    return { protein, carbs, fats };
  }

  private static validatePositiveNumber(value: any): number | undefined {
    if (typeof value !== 'number') {
      return undefined;
    }

    if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
      return undefined;
    }

    return Math.round(value);
  }

  private static isValidGoalDirection(direction: any): direction is GoalDirection {
    return direction === 'lose' || direction === 'gain' || direction === 'maintain';
  }

  private static validateAge(age: any): number | undefined {
    if (typeof age !== 'number') return undefined;
    return age >= 13 && age <= 120 ? age : undefined;
  }

  private static validateHeight(height: any): number | undefined {
    if (typeof height !== 'number') return undefined;
    return height >= 100 && height <= 250 ? height : undefined; // cm
  }

  private static validateWeight(weight: any): number | undefined {
    if (typeof weight !== 'number') return undefined;
    return weight >= 30 && weight <= 300 ? weight : undefined; // kg
  }

  private static isValidHealthGoal(goal: any): boolean {
    const validGoals = ['lose-weight', 'gain-weight', 'maintain-weight', 'build-muscle', 'improve-health', 'manage-restrictions', 'custom'];
    return validGoals.includes(goal);
  }

  private static isValidActivityLevel(level: any): boolean {
    const validLevels = ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'];
    return validLevels.includes(level);
  }

  private static isValidGender(gender: any): boolean {
    const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
    return validGenders.includes(gender);
  }

  private static isValidDietaryRestriction(restriction: any): boolean {
    const validRestrictions = [
      'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 
      'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 
      'low-sodium', 'halal', 'kosher', 'none'
    ];
    return validRestrictions.includes(restriction);
  }

  private static isValidAuthChoice(choice: any): boolean {
    const validChoices = ['signup', 'signin', 'guest'];
    return validChoices.includes(choice);
  }

  /**
   * Check if data migration is needed
   */
  private static async checkMigrationNeeded(data: any): Promise<boolean> {
    try {
      const storedVersion = await AsyncStorage.getItem(ONBOARDING_VERSION_KEY);
      const dataVersion = data.version || '0.0.0';
      
      return storedVersion !== CURRENT_ONBOARDING_VERSION || 
             dataVersion !== CURRENT_ONBOARDING_VERSION;
    } catch {
      return true; // Assume migration needed if we can't determine version
    }
  }

  /**
   * Migrate onboarding data from older versions
   */
  private static async migrateOnboardingData(data: any): Promise<OnboardingData> {
    const dataVersion = data.version || '0.0.0';
    
    // Migration logic for different versions
    let migratedData = { ...data };
    
    // Example migration from version 0.0.0 to 1.0.0
    if (dataVersion === '0.0.0') {
      // Migrate old structure to new structure
      if (data.goal && !data.healthGoal) {
        migratedData.healthGoal = this.mapOldGoalToNew(data.goal);
      }
      
      // Add new fields with defaults
      if (!migratedData.notifications) {
        migratedData.notifications = defaultOnboardingData.notifications;
      }
    }
    
    // Set current version
    migratedData.version = CURRENT_ONBOARDING_VERSION;
    
    return this.validateOnboardingData(migratedData);
  }

  private static mapOldGoalToNew(oldGoal: string): string | null {
    const mapping: Record<string, string> = {
      'lose': 'lose-weight',
      'gain': 'gain-weight',
      'maintain': 'maintain-weight',
      'muscle': 'build-muscle',
      'health': 'improve-health'
    };
    
    return mapping[oldGoal] || null;
  }

  /**
   * Create standardized persistence error
   */
  private static createPersistenceError(
    type: OnboardingPersistenceError['type'],
    message: string,
    originalError?: Error
  ): OnboardingPersistenceError {
    return {
      type,
      message,
      originalError
    };
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    hasOnboardingData: boolean;
    isCompleted: boolean;
    dataSize: number;
    lastSaved?: string;
  }> {
    try {
      const [onboardingData, completionData] = await AsyncStorage.multiGet([
        ONBOARDING_DATA_KEY,
        ONBOARDING_COMPLETED_KEY
      ]);
      
      const hasData = onboardingData[1] !== null;
      const isCompleted = completionData[1] !== null;
      const dataSize = hasData ? onboardingData[1]!.length : 0;
      
      let lastSaved: string | undefined;
      if (hasData) {
        try {
          const parsed = JSON.parse(onboardingData[1]!);
          lastSaved = parsed.lastSaved;
        } catch {
          // Ignore parsing errors for stats
        }
      }
      
      return {
        hasOnboardingData: hasData,
        isCompleted,
        dataSize,
        lastSaved
      };
    } catch (error) {
      throw this.createPersistenceError(
        'storage',
        'Failed to get storage statistics',
        error as Error
      );
    }
  }
}