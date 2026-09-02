import AsyncStorage from '@react-native-async-storage/async-storage';

export const AI_DATA_CONSENT_VERSION = 2;
const AI_DATA_CONSENT_STORAGE_VERSIONS = [1, AI_DATA_CONSENT_VERSION] as const;

export interface AiDataConsentRecord {
  version: number;
  grantedAt: string;
}

function storageKey(userId: string): string {
  return `nosh:ai-data-consent:${userId}:v${AI_DATA_CONSENT_VERSION}`;
}

export async function loadAiDataConsent(userId: string): Promise<AiDataConsentRecord | null> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AiDataConsentRecord>;
    if (
      parsed.version !== AI_DATA_CONSENT_VERSION
      || typeof parsed.grantedAt !== 'string'
    ) {
      return null;
    }
    return {
      version: AI_DATA_CONSENT_VERSION,
      grantedAt: parsed.grantedAt,
    };
  } catch {
    await AsyncStorage.removeItem(storageKey(userId)).catch(() => undefined);
    return null;
  }
}

export async function grantAiDataConsent(userId: string): Promise<AiDataConsentRecord> {
  const record: AiDataConsentRecord = {
    version: AI_DATA_CONSENT_VERSION,
    grantedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(record));
  return record;
}

export async function withdrawAiDataConsent(userId: string): Promise<void> {
  await Promise.all(AI_DATA_CONSENT_STORAGE_VERSIONS.map((version) => (
    AsyncStorage.removeItem(`nosh:ai-data-consent:${userId}:v${version}`)
  )));
}
