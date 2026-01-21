import { Linking, Platform } from 'react-native';

export const PLAY_STORE_HTTP_URL =
  'https://play.google.com/store/apps/dev?id=6165954326742483653';

const PLAY_STORE_MARKET_URL = 'store/apps/dev?id=6165954326742483653';

export async function openRateApp(): Promise<void> {
  const primary = Platform.OS === 'android' ? PLAY_STORE_MARKET_URL : PLAY_STORE_HTTP_URL;

  try {
    const can = await Linking.canOpenURL(primary);
    if (can) {
      await Linking.openURL(primary);
      return;
    }
  } catch {
    // ignore and fallback
  }

  await Linking.openURL(PLAY_STORE_HTTP_URL);
}
