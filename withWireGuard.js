// Expo config plugin: adds the embedded WireGuard library to the Android app.
// Put this file in ./plugins/ and list it in app.json (apply.js does that for you).
const { withAppBuildGradle } = require('@expo/config-plugins');

const DEP = "implementation 'com.wireguard.android:tunnel:1.0.20230706'";

module.exports = function withWireGuard(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('com.wireguard.android:tunnel')) {
      c.modResults.contents = c.modResults.contents.replace(/dependencies\s*\{/, (m) => `${m}\n    ${DEP}`);
    }
    return c;
  });
};
