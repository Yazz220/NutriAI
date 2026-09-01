import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AI_DATA_CONSENT_VERSION,
  grantAiDataConsent,
  loadAiDataConsent,
  withdrawAiDataConsent,
} from '@/utils/privacy/aiDataConsent';

describe('AI data consent storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores consent per user and current disclosure version', async () => {
    const record = await grantAiDataConsent('user-1');

    expect(record.version).toBe(AI_DATA_CONSENT_VERSION);
    await expect(loadAiDataConsent('user-1')).resolves.toEqual(record);
    await expect(loadAiDataConsent('user-2')).resolves.toBeNull();
  });

  it('withdraws consent without affecting another user', async () => {
    await grantAiDataConsent('user-1');
    const second = await grantAiDataConsent('user-2');

    await withdrawAiDataConsent('user-1');

    await expect(loadAiDataConsent('user-1')).resolves.toBeNull();
    await expect(loadAiDataConsent('user-2')).resolves.toEqual(second);
  });

  it('requires consent again after the disclosure version changes', async () => {
    await AsyncStorage.setItem('nosh:ai-data-consent:user-1:v1', JSON.stringify({
      version: 1,
      grantedAt: '2026-08-31T00:00:00.000Z',
    }));

    await expect(loadAiDataConsent('user-1')).resolves.toBeNull();
  });

  it('removes current and previous consent records when permission is withdrawn', async () => {
    await AsyncStorage.setItem('nosh:ai-data-consent:user-1:v1', JSON.stringify({
      version: 1,
      grantedAt: '2026-08-31T00:00:00.000Z',
    }));
    await grantAiDataConsent('user-1');

    await withdrawAiDataConsent('user-1');

    await expect(AsyncStorage.getItem('nosh:ai-data-consent:user-1:v1')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('nosh:ai-data-consent:user-1:v2')).resolves.toBeNull();
  });
});
