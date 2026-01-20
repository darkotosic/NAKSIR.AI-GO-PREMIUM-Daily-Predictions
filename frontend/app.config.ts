import type { ConfigContext, ExpoConfig } from '@expo/config';

const appJson = require('./app.json');

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value?.trim() ? value.trim() : undefined;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = { ...appJson.expo, ...config };
  const extra = (baseConfig.extra ?? {}) as Record<string, string | undefined>;

  // merge plugins: existing (from app.json/config) + expo-asset (no duplicates)
  const existingPlugins = (baseConfig.plugins ?? []) as any[];
  const plugins = existingPlugins.includes('expo-asset')
    ? existingPlugins
    : [...existingPlugins, 'expo-asset'];

  return {
    ...baseConfig,
    plugins,
    extra: {
      ...extra,
      apiBaseUrl: readEnv('EXPO_PUBLIC_API_BASE_URL') ?? extra.apiBaseUrl,
      apiKey: readEnv('EXPO_PUBLIC_API_KEY') ?? extra.apiKey,
      androidPackage: readEnv('EXPO_PUBLIC_ANDROID_PACKAGE') ?? extra.androidPackage,
      oneSignalAppId: readEnv('EXPO_PUBLIC_ONESIGNAL_APP_ID') ?? (extra as any).oneSignalAppId,
    },
  };
};
