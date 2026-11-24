import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Encrypted storage on phones. In a web browser (used for testing) it falls back to localStorage. */
export const secure = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};
