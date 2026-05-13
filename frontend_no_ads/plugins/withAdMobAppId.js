const { withAndroidManifest } = require('@expo/config-plugins');

function sanitizeAdMobAppId(raw) {
  const s = String(raw ?? '').trim();

  // Reject XML-breaking chars
  if (/[<>]/.test(s)) {
    throw new Error(
      `withAdMobAppId: androidAppId contains invalid characters (< or >): ${s}`
    );
  }

  // Strict AdMob App ID format
  if (!/^ca-app-pub-\d+~\d+$/.test(s)) {
    throw new Error(`withAdMobAppId: androidAppId is not a valid AdMob App ID: ${s}`);
  }

  return s;
}

function upsertMetaData(app, name, value, { replaceValue = false } = {}) {
  app['meta-data'] = app['meta-data'] || [];
  const existing = app['meta-data'].find((m) => m.$['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = value;
    if (replaceValue) {
      existing.$['tools:replace'] = 'android:value';
    }
  } else {
    const attributes = { 'android:name': name, 'android:value': value };
    if (replaceValue) {
      attributes['tools:replace'] = 'android:value';
    }
    app['meta-data'].push({ $: attributes });
  }
}

module.exports = function withAdMobAppId(config, props) {
  const androidAppId = sanitizeAdMobAppId(props?.androidAppId);

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    manifest.manifest.$ = manifest.manifest.$ || {};
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    upsertMetaData(app, 'com.google.android.gms.ads.APPLICATION_ID', androidAppId, {
      replaceValue: true,
    });

    // Optional: delay measurement init (safe, helps consent-first)
    upsertMetaData(app, 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT', 'true', {
      replaceValue: true,
    });

    return config;
  });
};
