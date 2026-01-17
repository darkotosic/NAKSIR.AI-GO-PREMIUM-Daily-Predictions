import type { ConfigContext, ExpoConfig } from '@expo/config';

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value?.trim() ? value.trim() : undefined;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig: ExpoConfig = {
    ...config,
    name: 'Soccer Predictions - Naksir AI',
    slug: 'soccer-predictions-naksir-ai',
    version: '1.0.0',
    orientation: 'portrait',
    newArchEnabled: true,
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    android: {
      package: 'com.naksir.soccerpredictions',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    plugins: [
      [
        './plugins/withAdMobAppId',
        { androidAppId: 'ca-app-pub-1726722567967096~4895623430' },
      ],
      [
        'expo-build-properties',
        {
          android: {
            extraProguardRules:
              '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '0c92aea8-3378-4172-b48b-daff32887f51',
      },
    },
  };

  const extra = (baseConfig.extra ?? {}) as Record<string, string | undefined>;

  return {
    ...baseConfig,
    extra: {
      ...extra,
      apiBaseUrl: readEnv('EXPO_PUBLIC_API_BASE_URL') ?? extra.apiBaseUrl,
      apiKey: readEnv('EXPO_PUBLIC_API_KEY') ?? extra.apiKey,
      androidPackage: readEnv('EXPO_PUBLIC_ANDROID_PACKAGE') ?? extra.androidPackage,
    },
  };
};
