const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAdMobAppId(config, { androidAppId }) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    manifest.manifest.$ = manifest.manifest.$ || {};
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

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
        "android:value": androidAppId,
        "tools:replace": "android:value"
      }
    });

    return config;
  });
};
