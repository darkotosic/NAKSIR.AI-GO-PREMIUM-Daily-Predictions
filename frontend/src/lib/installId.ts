import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'naksir_install_id';

const randomId = () => `ins_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const getOrCreateInstallId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const fresh = randomId();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, fresh);
  } catch {
    // Ignore storage write errors; still return generated id
  }
  return fresh;
};
