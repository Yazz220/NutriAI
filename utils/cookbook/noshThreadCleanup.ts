import AsyncStorage from '@react-native-async-storage/async-storage';

export function noshThreadStoragePrefix(userId?: string | null): string {
  return `@nosh:assistant:${userId || 'local'}:`;
}

export async function clearNoshThreadStorage(userId: string): Promise<void> {
  const prefix = noshThreadStoragePrefix(userId);
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
}
