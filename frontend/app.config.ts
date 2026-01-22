import type { ConfigContext, ExpoConfig } from '@expo/config';

const readEnv = (key: string): string | undefined => {
  const v = process.env[key];
  return v?.trim() ? v.trim() : undefined;
};

type PluginEntry = string | [string, any];

function pluginKey(p: PluginEntry): string {
  return Array.isArray(p) ? p[0] : p;
}

function dedupePlugins(list: PluginEntry[]): PluginEntry[] {
  const seen = new Set<string>();
  const out: PluginEntry[] = [];
  for (const p of list) {
    const k = pluginKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function dedupeOneSignalExtensions(extras: any): any {
  const ext = extras?.eas?.build?.experimental?.ios?.appExtensions;
  if (!Array.isArray(ext)) return extras;

  const seen = new Set<string>();
  const unique = ext.filter((x: any) => {
    const k = `${x?.targetName ?? ''}|${x?.bundleIdentifier ?? ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    ...extras,
    eas: {
      ...extras?.eas,
      build: {
        ...extras?.eas?.build,
        experimental: {
          ...extras?.eas?.build?.experimental,
          ios: {
            ...extras?.eas?.build?.experimental?.ios,
            appExtensions: unique,
          },
        },
      },
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const base: ExpoConfig = {
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
    ios: {
      bundleIdentifier: 'com.naksir.soccerpredictions',
    },
    plugins: [
      [
        'onesignal-expo-plugin',
        {
          mode: 'production',
        },
      ],
      [
        './plugins/withAdMobAppId',
        {
          androidAppId: 'ca-app-pub-1726722567967096~4895623430',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: true,
            kotlinVersion: '2.1.20',
            extraProguardRules:
              '-keep class com.google.android.gms.internal.consent_sdk.** { *; }\n' +
              '-keep class com.android.billingclient.** { *; }\n' +
              '-keep class io.github.hyochan.** { *; }\n' +
              '-keep class io.github.hyochan.openiap.** { *; }\n' +
              '-dontwarn io.github.hyochan.**\n' +
              '-dontwarn io.github.hyochan.openiap.**\n',
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

  const plugins = dedupePlugins([
    ...((base.plugins ?? []) as PluginEntry[]),
    ...(((config.plugins ?? []) as PluginEntry[]) || []),
    'expo-asset',
    'react-native-iap',
  ]);

  const mergedExtra = {
    ...(base.extra ?? {}),
    apiBaseUrl: readEnv('EXPO_PUBLIC_API_BASE_URL') ?? (base.extra as any)?.apiBaseUrl,
    apiKey: readEnv('EXPO_PUBLIC_API_KEY') ?? (base.extra as any)?.apiKey,
    androidPackage: readEnv('EXPO_PUBLIC_ANDROID_PACKAGE') ?? (base.extra as any)?.androidPackage,
    oneSignalAppId: readEnv('EXPO_PUBLIC_ONESIGNAL_APP_ID') ?? (base.extra as any)?.oneSignalAppId,
  };

  const extra = dedupeOneSignalExtensions(mergedExtra);

  return {
    ...base,
    plugins,
    extra,
  };
};
