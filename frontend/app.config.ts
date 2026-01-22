import type { ConfigContext, ExpoConfig } from '@expo/config';

const appJson = require('./app.json');

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value?.trim() ? value.trim() : undefined;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  // UZMI app.json kao primarni source-of-truth
  const appJsonExpo = appJson.expo as ExpoConfig;

  // Spoji config, ali pazi da plugins bude merge, ne overwrite
  const extraFromConfig = (config.extra ?? {}) as Record<string, any>;
  const extraFromJson = (appJsonExpo.extra ?? {}) as Record<string, any>;

  const jsonPlugins = (appJsonExpo.plugins ?? []) as any[];
  const configPlugins = (config.plugins ?? []) as any[];

  const mergedPlugins = [...jsonPlugins, ...configPlugins];

  const ensurePlugin = (arr: any[], plugin: any) => {
    if (typeof plugin === 'string') {
      return arr.includes(plugin) ? arr : [...arr, plugin];
    }
    const name = plugin?.[0];
    return arr.some((p) => Array.isArray(p) && p[0] === name) ? arr : [...arr, plugin];
  };

  let plugins = mergedPlugins;

  // garantuj expo-asset (ako ti treba)
  plugins = ensurePlugin(plugins, 'expo-asset');

  // garantuj IAP + build-properties (safety net)
  plugins = ensurePlugin(plugins, 'react-native-iap');
  plugins = ensurePlugin(plugins, [
    'expo-build-properties',
    {
      android: {
        newArchEnabled: true,
        kotlinVersion: '2.1.20',
      },
    },
  ]);

  return {
    ...config,
    ...appJsonExpo,
    // plugins = merge (ne overwrite)
    plugins,
    extra: {
      ...extraFromJson,
      ...extraFromConfig,
      apiBaseUrl:
        readEnv('EXPO_PUBLIC_API_BASE_URL') ?? extraFromJson.apiBaseUrl ?? extraFromConfig.apiBaseUrl,
      apiKey: readEnv('EXPO_PUBLIC_API_KEY') ?? extraFromJson.apiKey ?? extraFromConfig.apiKey,
      androidPackage:
        readEnv('EXPO_PUBLIC_ANDROID_PACKAGE') ?? extraFromJson.androidPackage ?? extraFromConfig.androidPackage,
      oneSignalAppId:
        readEnv('EXPO_PUBLIC_ONESIGNAL_APP_ID') ??
        extraFromJson.oneSignalAppId ??
        extraFromConfig.oneSignalAppId,
    },
  };
};
