// Small JSON cache on top of AsyncStorage so screens render instantly offline or on slow networks.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'twofold:';

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Cache is best-effort.
  }
}

export async function clearCache() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(keys);
}
