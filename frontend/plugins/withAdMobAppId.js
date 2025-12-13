const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAdMobAppId(config, { androidAppId }) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    app["meta-data"] = app["meta-data"] || [];

    // remove existing
    app["meta-data"] = app["meta-data"].filter(
      (m) => m.$["android:name"] !== "com.google.android.gms.ads.APPLICATION_ID"
    );

    app["meta-data"].push({
      $: {
        "android:name": "com.google.android.gms.ads.APPLICATION_ID",
        "android:value": androidAppId
      }
    });

    return config;
  });
};
