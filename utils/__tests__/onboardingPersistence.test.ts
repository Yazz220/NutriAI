import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingPersistenceManager } from '../onboardingPersistence';
import { defaultOnboardingData, OnboardingData } from '@/types/onboarding';

// Mock AsyncStorage
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
    it('should save valid onboarding data', async () => {
      const testData: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight'
      };

      await OnboardingPersistenceManager.saveOnboardingData(testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'onboarding_data',
        expect.stringContaining('"healthGoal":"lose-weight"')
      );
    });

    it('should handle storage errors', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        OnboardingPersistenceManager.saveOnboardingData(defaultOnboardingData)
      ).rejects.toThrow('Failed to save onboarding data');
    });
  });

  describe('loadOnboardingData', () => {
    it('should return null when no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await OnboardingPersistenceManager.loadOnboardingData();
      expect(result).toBeNull();
    });

    it('should load and validate existing data', async () => {
      const testData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight'
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const result = await OnboardingPersistenceManager.loadOnboardingData();
      expect(result).toEqual(expect.objectContaining({
        healthGoal: 'lose-weight'
      }));
    });
  });
});