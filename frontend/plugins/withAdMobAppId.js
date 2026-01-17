const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

function setAndroidMetaData(app, name, value) {
  app.metaData = app.metaData || [];
  const existing = app.metaData.find(m => m.$['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = value;
  } else {
    app.metaData.push({ $: { 'android:name': name, 'android:value': value } });
  }
}

function withAdMobAppId(config, props) {
  const androidAppId = props?.androidAppId;
  const iosAppId = props?.iosAppId;

  if (!androidAppId) {
    throw new Error('withAdMobAppId: androidAppId is required');
  }
  // iosAppId can be optional if you don't ship iOS, but we'll set if provided.

  // Android: com.google.android.gms.ads.APPLICATION_ID + delay measurement init
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    setAndroidMetaData(app, 'com.google.android.gms.ads.APPLICATION_ID', androidAppId);
    // Delay measurement init (recommended for UMP/consent first)
    setAndroidMetaData(app, 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT', 'true');

    return config;
  });

  // iOS: GADApplicationIdentifier
  config = withInfoPlist(config, (config) => {
    if (iosAppId) {
      config.modResults.GADApplicationIdentifier = iosAppId;
    }
    return config;
  });

  return config;
}

module.exports = withAdMobAppId;
