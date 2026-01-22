import type { ConfigContext, ExpoConfig } from '@expo/config';

const appJson = require('./app.json');

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
  // app.json expo je primarni izvor istine
  const base: ExpoConfig = appJson.expo;

  // plugin list: app.json plugins + eventualni iz config (ako postoji), pa dedupe
  const plugins = dedupePlugins([
    ...((base.plugins ?? []) as PluginEntry[]),
    ...(((config.plugins ?? []) as PluginEntry[]) || []),
    'expo-asset',
    'react-native-iap',
  ]);

  // extras: app.json.extra + env override
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
