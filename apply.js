// Run once in the root of a fresh Expo project:  node apply.js
// Patches app.json: package name, dark UI, portrait and the DNS VPN plugin.
const fs = require('fs');

if (!fs.existsSync('app.json')) {
  console.error('app.json not found. Run this inside your Expo project folder.');
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const e = (j.expo = j.expo || {});

e.name = 'Game DNS';
e.orientation = 'portrait';
e.userInterfaceStyle = 'dark';
e.android = e.android || {};
if (!e.android.package) e.android.package = 'com.gamedns.app';
e.plugins = e.plugins || [];
if (!e.plugins.includes('./plugins/withDnsVpn')) e.plugins.push('./plugins/withDnsVpn');

fs.writeFileSync('app.json', JSON.stringify(j, null, 2));
console.log('app.json updated. Android package:', e.android.package);
