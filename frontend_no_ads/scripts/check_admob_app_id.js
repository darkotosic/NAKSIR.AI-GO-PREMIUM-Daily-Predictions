const fs = require('fs');

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const plugins = appJson?.expo?.plugins ?? [];
const entry = plugins.find((p) => Array.isArray(p) && p[0] === './plugins/withAdMobAppId');
const appId = entry?.[1]?.androidAppId;

if (!appId) {
  console.error('[check] Missing androidAppId in app.json plugins');
  process.exit(1);
}

if (/[<>]/.test(appId) || !/^ca-app-pub-\d+~\d+$/.test(appId)) {
  console.error('[check] Invalid AdMob App ID:', appId);
  process.exit(1);
}

console.log('[check] AdMob App ID OK:', appId);
