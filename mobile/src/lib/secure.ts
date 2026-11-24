import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from '@upskill/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const web = Platform.OS === 'web';

/** Sign-in tokens: encrypted storage on phones (localStorage only when testing in a browser). */
export const secure: KeyValueStore = {
  get: (k) => (web ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: async (k, v) => { if (web) globalThis.localStorage?.setItem(k, v); else await SecureStore.setItemAsync(k, v); },
  del: async (k) => { if (web) globalThis.localStorage?.removeItem(k); else await SecureStore.deleteItemAsync(k); },
};

/** Progress can be large, so it lives in regular app storage. */
export const appStore: KeyValueStore = {
  get: (k) => AsyncStorage.getItem(k),
  set: (k, v) => AsyncStorage.setItem(k, v),
  del: (k) => AsyncStorage.removeItem(k),
};
