import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingPersistenceManager } from '../onboardingPersistence';
import { defaultOnboardingData, OnboardingData } from '@/types/onboarding';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  multiGet: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('OnboardingPersistenceManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveOnboardingData', () => {
    it('saves valid onboarding data', async () => {
      const testData: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
      };

      await OnboardingPersistenceManager.saveOnboardingData(testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'onboarding_data',
        expect.stringContaining('"healthGoal":"lose-weight"'),
      );
    });

    it('throws when storage fails', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(OnboardingPersistenceManager.saveOnboardingData(defaultOnboardingData)).rejects.toThrow(
        'Failed to save onboarding data',
      );
    });
  });

  describe('loadOnboardingData', () => {
    it('returns null when nothing is stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const result = await OnboardingPersistenceManager.loadOnboardingData();
      expect(result).toBeNull();
    });

    it('loads and validates existing data', async () => {
      const testData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const result = await OnboardingPersistenceManager.loadOnboardingData();
      expect(result).toEqual(expect.objectContaining({ healthGoal: 'lose-weight' }));
    });

    it('sanitizes custom goal and goal preferences', async () => {
      const rawData = {
        ...defaultOnboardingData,
        healthGoal: 'custom' as const,
        customGoal: {
          title: '',
          goalType: 'unknown',
          motivation: '   ',
        },
        goalPreferences: {
          goalType: 'unknown',
          useCustomCalories: true,
          customCalorieTarget: -200,
          customMacroTargets: { protein: -1, carbs: 0, fats: 0 },
          recommendedCalories: -1500,
          recommendedMacros: { protein: -10, carbs: -10, fats: -10 },
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(rawData));

      const result = await OnboardingPersistenceManager.loadOnboardingData();
      expect(result?.customGoal).toBeNull();
      expect(result?.goalPreferences.goalType).toBeNull();
      expect(result?.goalPreferences.customCalorieTarget).toBeUndefined();
      expect(result?.goalPreferences.customMacroTargets).toBeUndefined();
      expect(result?.goalPreferences.recommendedCalories).toBeUndefined();
    });
  });
});
