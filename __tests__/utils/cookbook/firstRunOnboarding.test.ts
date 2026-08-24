import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultFirstRunOnboardingState,
  loadFirstRunOnboardingState,
  saveFirstRunOnboardingStatus,
  shouldPresentFirstRunWelcome,
} from '@/utils/cookbook/firstRunOnboarding';

describe('first-run onboarding state', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts pending and stores progress per user', async () => {
    expect(await loadFirstRunOnboardingState('user-a')).toEqual(defaultFirstRunOnboardingState());

    await saveFirstRunOnboardingStatus('user-a', 'completed');

    expect((await loadFirstRunOnboardingState('user-a')).status).toBe('completed');
    expect((await loadFirstRunOnboardingState('user-b')).status).toBe('pending');
  });

  it('only presents on an empty, ready shelf with no share work in progress', () => {
    const eligible = {
      isReady: true,
      cookbookCount: 0,
      status: 'pending' as const,
      hasNativeShareWork: false,
    };

    expect(shouldPresentFirstRunWelcome(eligible)).toBe(true);
    expect(shouldPresentFirstRunWelcome({ ...eligible, status: 'started' })).toBe(true);
    expect(shouldPresentFirstRunWelcome({ ...eligible, status: 'skipped' })).toBe(false);
    expect(shouldPresentFirstRunWelcome({ ...eligible, cookbookCount: 1 })).toBe(false);
    expect(shouldPresentFirstRunWelcome({ ...eligible, hasNativeShareWork: true })).toBe(false);
    expect(shouldPresentFirstRunWelcome({ ...eligible, isReady: false })).toBe(false);
  });
});
