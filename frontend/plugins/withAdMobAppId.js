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

function upsertMetaData(app, name, value) {
  app['meta-data'] = app['meta-data'] || [];
  const existing = app['meta-data'].find((m) => m.$['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = value;
  } else {
    app['meta-data'].push({
      $: { 'android:name': name, 'android:value': value },
    });
  }
}

module.exports = function withAdMobAppId(config, props) {
  const androidAppId = sanitizeAdMobAppId(props?.androidAppId);

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    upsertMetaData(app, 'com.google.android.gms.ads.APPLICATION_ID', androidAppId);

    // Optional: delay measurement init (safe, helps consent-first)
    upsertMetaData(app, 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT', 'true');

    return config;
  });
};
