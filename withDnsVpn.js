// Expo config plugin: copies the Kotlin VPN module into the Android project,
// registers the VpnService in the manifest and adds the package to MainApplication.
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withDnsVpn(config) {
  const pkg = config.android && config.android.package;
  if (!pkg) {
    throw new Error('withDnsVpn: set expo.android.package in app.json (run: node apply.js)');
  }

  // 1) copy Kotlin sources into the generated android project
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dest = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', ...pkg.split('.')
      );
      fs.mkdirSync(dest, { recursive: true });
      const src = path.join(cfg.modRequest.projectRoot, 'native-android');
      for (const f of fs.readdirSync(src)) {
        if (!f.endsWith('.kt')) continue;
        const text = fs.readFileSync(path.join(src, f), 'utf8').split('__PACKAGE__').join(pkg);
        fs.writeFileSync(path.join(dest, f), text);
      }
      return cfg;
    },
  ]);

  // 2) declare the VPN service
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.service = app.service || [];
    const name = `${pkg}.DnsVpnService`;
    if (!app.service.some((s) => s.$['android:name'] === name)) {
      app.service.push({
        $: {
          'android:name': name,
          'android:permission': 'android.permission.BIND_VPN_SERVICE',
          'android:exported': 'false',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.net.VpnService' } }] }],
      });
    }
    return cfg;
  });

  // 3) register the React package
  config = withMainApplication(config, (cfg) => {
    let c = cfg.modResults.contents;
    if (!c.includes('DnsVpnPackage()')) {
      const re = /PackageList\(this\)\.packages\.apply\s*\{/;
      if (!re.test(c)) {
        throw new Error(
          'withDnsVpn: could not find PackageList(this).packages.apply { in MainApplication. ' +
            'Add "add(DnsVpnPackage())" there manually.'
        );
      }
      c = c.replace(re, (m) => `${m}\n              add(DnsVpnPackage())`);
      cfg.modResults.contents = c;
    }
    return cfg;
  });

  return config;
}

module.exports = withDnsVpn;
