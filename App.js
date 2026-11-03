import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  LayoutAnimation,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch (e) {}
}

const { DnsVpn } = NativeModules;

const CHANNEL_URL = 'https://t.me/AbrinoDNS';
// لینک اسم بالای صفحه (هر لینکی خواستی اینجا بذار)
const BRAND_URL = 'https://t.me/AbrinoDNS';
const VERSION = '1.2';

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#120805',
  panel: '#1C110A',
  panel2: '#26170D',
  line: '#3D2513',
  blue: '#FFA94D',      // accent light (orange)
  purple: '#FF5A1F',    // accent deep (red-orange)
  green: '#FF8A1F',     // main accent (orange)
  deepGreen: '#1A0C03',
  teal: '#FFB020',
  iconBg: '#3A1E0A',
  iconFg: '#FF9A3D',
  text: '#FFF4EA',
  mute: '#B59A85',
  bad: '#FF4D6A',
  warn: '#FFB300',
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const DNS_LIST = [
  { id: 'google', name: 'Google', v4: ['8.8.8.8', '8.8.4.4'], v6: ['2001:4860:4860::8888', '2001:4860:4860::8844'] },
  { id: 'cloudflare', name: 'Cloudflare', v4: ['1.1.1.1', '1.0.0.1'], v6: ['2606:4700:4700::1111', '2606:4700:4700::1001'] },
  { id: 'quad9', name: 'Quad9', v4: ['9.9.9.9', '149.112.112.112'], v6: ['2620:fe::fe', '2620:fe::9'] },
  { id: 'opendns', name: 'OpenDNS', v4: ['208.67.222.222', '208.67.220.220'], v6: ['2620:119:35::35', '2620:119:53::53'] },
  { id: 'shecan', name: 'شکن', v4: ['178.22.122.100', '185.51.200.2'], v6: [] },
  { id: 'electro', name: 'الکترو', v4: ['78.157.42.100', '78.157.42.101'], v6: [] },
  { id: 'radar', name: 'رادار', v4: ['10.202.10.10', '10.202.10.11'], v6: [] },
  { id: '403', name: '۴۰۳', v4: ['10.202.10.202', '10.202.10.102'], v6: [] },
  { id: 'begzar', name: 'بگذر', v4: ['185.55.226.26', '185.55.225.25'], v6: [] },
  { id: 'pishgaman', name: 'پیشگامان', v4: ['5.202.100.100', '5.202.100.101'], v6: [] },
  { id: 'shatel', name: 'شاتل', v4: ['85.15.1.14', '85.15.1.15'], v6: [] },
];

const DEFAULT_GAMES = [
  { id: 'pubg', name: 'PUBG MOBILE', domains: ['igamecj.com', 'pubgmobile.com'] },
  { id: 'codm', name: 'Call of Duty Mobile', domains: ['callofduty.com', 'activision.com'] },
  { id: 'ff', name: 'Free Fire', domains: ['freefiremobile.com', 'garena.com'] },
  { id: 'cr', name: 'Clash Royale', domains: ['clashroyale.com', 'supercell.com'] },
  { id: 'coc', name: 'Clash of Clans', domains: ['clashofclans.com', 'supercell.com'] },
  { id: 'bs', name: 'Brawl Stars', domains: ['brawlstars.com', 'supercell.com'] },
  { id: 'ml', name: 'Mobile Legends', domains: ['mobilelegends.com', 'moonton.com'] },
];

const T = {
  fa: {
    settings: 'تنظیمات',
    general: 'عمومی',
    autoConnect: 'اتصال خودکار',
    autoConnectSub: 'با باز کردن برنامه، خودش وصل می‌شود.',
    customDns: 'DNS سفارشی',
    customDnsSub: 'آدرس DNS را خودت وارد کن',
    language: 'زبان',
    channelSec: 'کانال و درخواست‌ها',
    request: 'درخواست بازی یا برنامه',
    channel: 'کانال تلگرام',
    channelSub: 'خبرها، نسخه‌های جدید و پشتیبانی',
    device: 'دستگاه',
    deviceId: 'شناسه‌ی دستگاه',
    deviceNote: 'برای گزارش مشکل این شناسه را بفرستید. ناشناس است و تغییر نمی‌کند.',
    about: 'درباره',
    update: 'بررسی به‌روزرسانی',
    updateSub: 'آخرین نسخه را از کانال بگیر',
    version: 'نسخه',
    notConnected: 'وصل نیست',
    tapConnect: 'برای اتصال ضربه بزنید',
    connecting: 'در حال اتصال...',
    okTxt: 'اتصال موفق',
    failTxt: 'اتصال ناموفق',
    supported: 'بازی‌ها و برنامه‌ها',
    showAll: 'نمایش همه',
    showLess: 'نمایش کمتر',
    join: 'عضویت در کانال تلگرام Abrino DNS',
    add: 'افزودن',
    edit: 'ویرایش',
    done: 'تمام',
    appName: 'اسم بازی یا برنامه',
    appDomain: 'دامنه‌ی سرور بازی (اختیاری)',
    appNote: 'اگه دامنه رو نمی‌دونی خالی بذار؛ بهترین DNS به‌صورت عمومی انتخاب می‌شه.',
    save: 'افزودن به لیست',
    cancel: 'لغو',
    needName: 'اسم بازی رو بنویس.',
    invalidDomain: 'دامنه درست نیست. مثل example.com بنویس.',
    restore: 'بازگردانی لیست پیش‌فرض',
    customTitle: 'DNS سفارشی',
    custom: 'سفارشی',
    presets: 'سرورها',
    v4: 'DNS · نسخه ۴ (IPv4)',
    v6: 'DNS · نسخه ۶ (IPv6)',
    pingTest: 'تست پینگ',
    connectCustom: 'اتصال با این DNS',
    pingResult: 'نتیجه‌ی پینگ',
    noModule: 'ماژول نیتیو پیدا نشد. این برنامه باید به‌صورت APK نصب شود.',
    noServer: 'هیچ سروری جواب نداد. اینترنت را بررسی کن.',
    noValid: 'حداقل یک آدرس DNS معتبر وارد کن.',
    denied: 'اجازه VPN داده نشد.',
    footer: 'فقط درخواست‌های DNS از طریق VPN عبور می‌کنند؛ ترافیک بازی مستقیم می‌رود و سرعتش کم نمی‌شود.',
    pingIs: 'پینگ',
    vpnSec: 'وی‌پی‌ان',
    wg: 'وایرگارد (WireGuard)',
    wgSub: 'اتصال با فایل کانفیگ WireGuard',
    ovpn: 'اوپن‌وی‌پی‌ان (OpenVPN)',
    ovpnSub: 'اتصال با فایل کانفیگ ovpn',
    cfgHint: 'محتوای فایل کانفیگ را اینجا پیست کن',
    cfgNote: 'کانفیگ فقط روی همین گوشی ذخیره می‌شود. هم‌زمان فقط یک اتصال فعال است؛ با وصل شدن این، DNS خاموش می‌شود.',
    connectVpn: 'اتصال',
    wgInvalid: 'کانفیگ WireGuard باید بخش‌های [Interface] و [Peer] داشته باشد.',
    ovpnInvalid: 'کانفیگ OpenVPN باید خط remote داشته باشد.',
    vpnNoNative: 'این پروتکل هنوز در ماژول نیتیو APK نیست. ماژول را آپدیت کن.',
  },
  en: {
    settings: 'Settings',
    general: 'General',
    autoConnect: 'Auto connect',
    autoConnectSub: 'Connects by itself when the app opens.',
    customDns: 'Custom DNS',
    customDnsSub: 'Enter your own DNS addresses',
    language: 'Language',
    channelSec: 'Channel & requests',
    request: 'Request a game or app',
    channel: 'Telegram channel',
    channelSub: 'News, new versions and support',
    device: 'Device',
    deviceId: 'Device ID',
    deviceNote: 'Send this ID when reporting a problem. It is anonymous and never changes.',
    about: 'About',
    update: 'Check for updates',
    updateSub: 'Get the latest version from the channel',
    version: 'Version',
    notConnected: 'Not connected',
    tapConnect: 'Tap to connect',
    connecting: 'Connecting...',
    okTxt: 'Connected successfully',
    failTxt: 'Connection failed',
    supported: 'Games & apps',
    showAll: 'Show all',
    showLess: 'Show less',
    join: 'Join the Abrino DNS Telegram channel',
    add: 'Add',
    edit: 'Edit',
    done: 'Done',
    appName: 'Game or app name',
    appDomain: 'Game server domain (optional)',
    appNote: 'If you do not know the domain, leave it empty; the best DNS is then chosen in general.',
    save: 'Add to list',
    cancel: 'Cancel',
    needName: 'Type the game name.',
    invalidDomain: 'Domain is not valid. Use a form like example.com.',
    restore: 'Restore default list',
    customTitle: 'Custom DNS',
    custom: 'Custom',
    presets: 'Servers',
    v4: 'DNS · IPv4',
    v6: 'DNS · IPv6',
    pingTest: 'Ping test',
    connectCustom: 'Connect with this DNS',
    pingResult: 'Ping result',
    noModule: 'Native module not found. Install this app as an APK.',
    noServer: 'No server answered. Check your internet.',
    noValid: 'Enter at least one valid DNS address.',
    denied: 'VPN permission was denied.',
    footer: 'Only DNS requests pass through the VPN; game traffic goes directly and is not slowed down.',
    pingIs: 'Ping',
    vpnSec: 'VPN',
    wg: 'WireGuard',
    wgSub: 'Connect with a WireGuard config file',
    ovpn: 'OpenVPN',
    ovpnSub: 'Connect with an .ovpn config file',
    cfgHint: 'Paste the config file content here',
    cfgNote: 'The config is stored on this phone only. Only one connection can be active; connecting this turns DNS off.',
    connectVpn: 'Connect',
    wgInvalid: 'WireGuard config needs [Interface] and [Peer] sections.',
    ovpnInvalid: 'OpenVPN config needs a remote line.',
    vpnNoNative: 'This protocol is not in the APK native module yet. Update the module.',
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const isV4 = (x) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(x);
const isV6 = (x) =>
  x.includes(':') &&
  /^[0-9a-fA-F:.]+$/.test(x) &&
  (x.match(/::/g) || []).length <= 1 &&
  x.split(':').length >= 3 &&
  x.split(':').length <= 8;

const toFa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const pingColor = (ms) => (ms < 0 ? C.bad : ms < 50 ? C.green : ms < 120 ? C.warn : '#FF7A00');

const cleanDomain = (x) => {
  const d = x.toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : '';
};

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

const makeId = () => {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n) => Array.from({ length: n }, () => ch[Math.floor(Math.random() * ch.length)]).join('');
  return `AB-${part(5)}-${part(5)}-${part(5)}-${part(5)}`;
};

const openChannel = () => {
  Linking.openURL(CHANNEL_URL).catch(() => {});
};
const openBrand = () => {
  Linking.openURL(BRAND_URL).catch(() => {});
};

const smooth = () => LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));

// one DNS lookup time (ms) or -1
const q = async (host, domain) => {
  if (!DnsVpn) return -1;
  try {
    if (DnsVpn.pingDomain) return await DnsVpn.pingDomain(host, domain);
    return await DnsVpn.ping(host);
  } catch (e) {
    return -1;
  }
};

// Score of one DNS for a list of domains (lower is better, -1 = dead)
const scoreDns = async (cand, domains) => {
  const host = cand.v4[0];
  const vals = [];
  let failed = 0;
  for (const d of domains) {
    const a = await q(host, d);
    if (a < 0) { failed += 1; continue; }
    const b = await q(host, d);
    vals.push(a);
    if (b >= 0) vals.push(b);
  }
  if (!vals.length) return -1;
  const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
  return avg + failed * 100;
};

// real ping of the DNS that is running now (median of 3, ms) or null
const measurePing = async (host, domain) => {
  const vals = [];
  for (let i = 0; i < 3; i += 1) {
    const v = await q(host, domain);
    if (v >= 0) vals.push(v);
  }
  if (!vals.length) return null;
  vals.sort((a, b) => a - b);
  return Math.max(1, Math.round(vals[Math.floor(vals.length / 2)]));
};

const scanGame = async (game) => {
  const doms = game.domains && game.domains.length ? game.domains : ['google.com'];
  let res = await Promise.all(DNS_LIST.map(async (c) => ({ c, ms: await scoreDns(c, doms) })));
  if (!res.some((r) => r.ms >= 0)) {
    res = await Promise.all(DNS_LIST.map(async (c) => ({ c, ms: await scoreDns(c, ['google.com']) })));
  }
  return res.filter((r) => r.ms >= 0).sort((x, y) => x.ms - y.ms);
};

/* ------------------------------------------------------------------ */
/*  Visual pieces                                                      */
/* ------------------------------------------------------------------ */
const NET_DOTS = [
  ['12%', '8%', 4, 0.5], ['30%', '14%', 3, 0.35], ['62%', '6%', 6, 0.55], ['86%', '12%', 3, 0.4],
  ['8%', '28%', 3, 0.3], ['92%', '30%', 5, 0.45], ['20%', '46%', 3, 0.3], ['80%', '48%', 4, 0.35],
  ['50%', '62%', 3, 0.25], ['14%', '72%', 4, 0.3], ['90%', '76%', 3, 0.3],
];

function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.glow, { width: 460, height: 460, borderRadius: 230, top: 30, alignSelf: 'center', backgroundColor: 'rgba(255,138,31,0.06)' }]} />
      <View style={[s.glow, { width: 320, height: 320, borderRadius: 160, top: 100, alignSelf: 'center', backgroundColor: 'rgba(255,90,0,0.08)' }]} />
      <View style={[s.glow, { width: 420, height: 420, borderRadius: 210, bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(255,60,0,0.06)' }]} />
      {NET_DOTS.map((d, i) => (
        <View key={i} style={{ position: 'absolute', left: d[0], top: d[1], width: d[2], height: d[2], borderRadius: d[2], backgroundColor: C.blue, opacity: d[3] }} />
      ))}
    </View>
  );
}

function Logo() {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={openBrand} style={s.logoWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View style={s.logoBox}>
        <Text style={s.logoLetter}>A</Text>
        <View style={s.logoBar} />
      </View>
      <Text style={s.logoText}>
        Abrino<Text style={{ color: C.blue }}> DNS</Text>
        <Text style={{ color: C.mute, fontSize: 12 }}>  ↗</Text>
      </Text>
    </TouchableOpacity>
  );
}

const RING_N = 64;
const RING_SIZE = 184;
const RING_R = 85;
const DOT = 7;

const makeRing = (from, to) => {
  const out = [];
  for (let i = 0; i < RING_N; i += 1) {
    const th = (i / RING_N) * Math.PI * 2;
    const t = (1 + Math.cos(th + Math.PI / 4)) / 2;
    out.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: RING_SIZE / 2 + RING_R * Math.cos(th) - DOT / 2,
          top: RING_SIZE / 2 + RING_R * Math.sin(th) - DOT / 2,
          width: DOT,
          height: DOT,
          borderRadius: DOT,
          backgroundColor: mix(from, to, t),
        }}
      />
    );
  }
  return out;
};

/* fade + slide in (used for screens and the add box) */
function Appear({ children, style, dy = 10, duration = 260 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, duration]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/* one game row: animates in, animates out before it is removed */
function GameRow({ g, sel, editing, canDelete, fa, onPick, onRemove }) {
  const a = useRef(new Animated.Value(0)).current;
  const hi = useRef(new Animated.Value(sel ? 1 : 0)).current;
  const ed = useRef(new Animated.Value(editing ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  useEffect(() => {
    Animated.timing(hi, { toValue: sel && !editing ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [sel, editing, hi]);
  useEffect(() => {
    Animated.timing(ed, { toValue: editing ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [editing, ed]);

  const remove = () => {
    Animated.timing(a, { toValue: 0, duration: 210, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) onRemove(g.id);
    });
  };

  const dx = a.interpolate({ inputRange: [0, 1], outputRange: [fa ? 36 : -36, 0] });
  const sc = a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const rowDir = fa ? 'row-reverse' : 'row';
  const ta = fa ? 'right' : 'left';

  return (
    <Animated.View style={{ opacity: a, transform: [{ translateX: dx }, { scale: sc }] }}>
      <TouchableOpacity activeOpacity={0.75} onPress={() => onPick(g.id)} style={[s.gameRow, { flexDirection: rowDir }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.gameHi, { opacity: hi }]} />
        <View style={s.iconBoxSm}><Text style={s.iconTxtSm}>🎮</Text></View>
        <Text style={[s.gameName, { textAlign: ta }]} numberOfLines={1}>{g.name}</Text>
        <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', opacity: hi }}>
            <Text style={s.check}>✓</Text>
          </Animated.View>
          {canDelete && (
            <Animated.View style={{ position: 'absolute', opacity: ed, transform: [{ scale: ed }] }} pointerEvents={editing ? 'auto' : 'none'}>
              <TouchableOpacity onPress={remove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={s.delBtn}>
                <Text style={s.delTxt}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Glyph({ color }) {
  return (
    <View style={[s.pwr, { transform: [{ scale: 0.82 }] }]}>
      <View style={[s.pwrRing, { borderColor: color, borderTopColor: 'transparent' }]} />
      <View style={[s.pwrBar, { backgroundColor: color }]} />
    </View>
  );
}

function PowerButton({ on, busy, onPress }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const act = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;

  // every animation runs on the native thread -> follows the screen's refresh rate (90/120 Hz)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: busy ? 1800 : 16000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [busy, spin]);

  useEffect(() => {
    Animated.timing(act, { toValue: on ? 1 : 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (on) {
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.07, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [on, act, pop]);

  const ringIdle = useMemo(() => makeRing(C.purple, C.blue), []);
  const ringOn = useMemo(() => makeRing(C.teal, C.green), []);

  const inv = Animated.subtract(1, act);
  const haloOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.2] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] });
  const deg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.hero}>
      <Animated.View pointerEvents="none" renderToHardwareTextureAndroid shouldRasterizeIOS style={[s.halo, { backgroundColor: C.blue, opacity: Animated.multiply(haloOp, inv), transform: [{ scale: haloScale }] }]} />
      <Animated.View pointerEvents="none" renderToHardwareTextureAndroid shouldRasterizeIOS style={[s.halo, { backgroundColor: C.green, opacity: Animated.multiply(haloOp, act), transform: [{ scale: haloScale }] }]} />

      <Animated.View pointerEvents="none" renderToHardwareTextureAndroid shouldRasterizeIOS style={[s.ringBox, { transform: [{ rotate: deg }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: inv }]}>{ringIdle}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: act }]}>{ringOn}</Animated.View>
      </Animated.View>

      <View pointerEvents="none" style={s.thinRing} />

      <Pressable
        disabled={busy}
        onPress={onPress}
        onPressIn={() => Animated.spring(press, { toValue: 0.94, speed: 40, bounciness: 0, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, speed: 18, bounciness: 9, useNativeDriver: true }).start()}
      >
        <Animated.View style={[s.disc, { transform: [{ scale: Animated.multiply(press, pop) }] }]}>
          {/* dark-green disc with soft green glow layers */}
          <View style={[s.inner, { width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,138,31,0.07)' }]} />
          <View style={[s.inner, { width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(255,138,31,0.10)' }]} />
          <View style={[s.inner, { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,138,31,0.12)' }]} />
          <Animated.View style={[s.inner, { width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,138,31,0.14)', opacity: act }]} />
          <Animated.View style={[s.inner, { width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(255,138,31,0.18)', opacity: act }]} />
          <Animated.View style={[s.inner, { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,138,31,0.24)', opacity: act }]} />
          {busy ? (
            <ActivityIndicator size="large" color={C.green} />
          ) : (
            <View>
              <Animated.View style={{ opacity: inv }}><Glyph color="#FFF1E3" /></Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: act }]}><Glyph color={C.green} /></Animated.View>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

function Row({ fa, icon, title, sub, onPress, right, last }) {
  const dir = fa ? 'row-reverse' : 'row';
  const ta = fa ? 'right' : 'left';
  const inner = (
    <View>
      <View style={[s.row, { flexDirection: dir }]}>
        <View style={s.iconBox}>
          <Text style={s.iconTxt}>{icon}</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[s.rowTitle, { textAlign: ta }]}>{title}</Text>
          {!!sub && <Text style={[s.rowSub, { textAlign: ta }]}>{sub}</Text>}
        </View>
        {right !== undefined ? right : onPress ? <Text style={s.chev}>{fa ? '‹' : '›'}</Text> : null}
      </View>
      {!last && <View style={[s.sep, fa ? { marginRight: 64, marginLeft: 0 } : { marginLeft: 64, marginRight: 0 }]} />}
    </View>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  );
}

function Header({ fa, title, onBack }) {
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onBack} style={[s.backBtn, fa ? { right: 2 } : { left: 2 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={s.backTxt}>{fa ? '›' : '‹'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, valid }) {
  const bad = value.length > 0 && !valid;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B5444"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="visible-password"
        style={[s.input, bad && { borderColor: C.bad }]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const [screen, setScreen] = useState('home'); // home | settings | custom
  const [lang, setLang] = useState('fa');
  const [autoConnect, setAutoConnect] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  const [games, setGames] = useState(DEFAULT_GAMES);
  const [gameId, setGameId] = useState('pubg');
  const [mode, setMode] = useState('auto'); // auto | custom
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [formErr, setFormErr] = useState('');

  const [v4a, setV4a] = useState('8.8.8.8');
  const [v4b, setV4b] = useState('8.8.4.4');
  const [v6a, setV6a] = useState('2001:4860:4860::8888');
  const [v6b, setV6b] = useState('2001:4860:4860::8844');
  const [useV6, setUseV6] = useState(true);
  const [preset, setPreset] = useState('google');

  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState('');
  const [pingMs, setPingMs] = useState(null);
  const [wgCfg, setWgCfg] = useState('');
  const [ovpnCfg, setOvpnCfg] = useState('');
  const [vpnType, setVpnType] = useState('wg'); // wg | ovpn
  const [vpnErr, setVpnErr] = useState('');
  const [loaded, setLoaded] = useState(false);

  const autoDone = useRef(false);
  const connectRef = useRef(null);

  const t = T[lang];
  const fa = lang === 'fa';
  const ta = fa ? 'right' : 'left';
  const rowDir = fa ? 'row-reverse' : 'row';

  /* load saved settings */
  useEffect(() => {
    (async () => {
      let id = '';
      try {
        if (DnsVpn) {
          const raw = await DnsVpn.loadPrefs();
          if (raw) {
            const p = JSON.parse(raw);
            if (p.lang) setLang(p.lang);
            if (typeof p.autoConnect === 'boolean') setAutoConnect(p.autoConnect);
            if (Array.isArray(p.games) && p.games.length && p.games.every((g) => g && g.id && g.name && Array.isArray(g.domains))) setGames(p.games);
            if (p.gameId) setGameId(p.gameId);
            if (p.mode) setMode(p.mode);
            if (p.v4a !== undefined) setV4a(p.v4a);
            if (p.v4b !== undefined) setV4b(p.v4b);
            if (p.v6a !== undefined) setV6a(p.v6a);
            if (p.v6b !== undefined) setV6b(p.v6b);
            if (typeof p.useV6 === 'boolean') setUseV6(p.useV6);
            if (p.preset) setPreset(p.preset);
            if (typeof p.wgCfg === 'string') setWgCfg(p.wgCfg);
            if (typeof p.ovpnCfg === 'string') setOvpnCfg(p.ovpnCfg);
            if (p.deviceId) id = p.deviceId;
          }
          setOn(await DnsVpn.isRunning());
        }
      } catch (e) {}
      setDeviceId(id || makeId());
      setLoaded(true);
    })();
    const timer = setInterval(() => {
      if (DnsVpn) DnsVpn.isRunning().then(setOn).catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  /* save settings */
  useEffect(() => {
    if (!loaded || !DnsVpn) return;
    DnsVpn.savePrefs(JSON.stringify({ lang, autoConnect, games, gameId, mode, v4a, v4b, v6a, v6b, useV6, preset, deviceId, wgCfg, ovpnCfg }));
  }, [loaded, lang, autoConnect, games, gameId, mode, v4a, v4b, v6a, v6b, useV6, preset, deviceId, wgCfg, ovpnCfg]);

  /* ping is only shown while connected */
  useEffect(() => { if (!on) setPingMs(null); }, [on]);

  /* Android back button */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'home') {
        setScreen(screen === 'custom' || screen === 'vpn' ? 'settings' : 'home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  /* auto connect when the app opens */
  useEffect(() => {
    if (loaded && autoConnect && !autoDone.current) {
      autoDone.current = true;
      if (!on && mode === 'auto' && connectRef.current) connectRef.current({ mode: 'auto', gameId });
    }
  }, [loaded]); // eslint-disable-line

  const game = games.find((g) => g.id === gameId) || games[0];

  /* ---------------- actions ---------------- */
  const customList = () => {
    const list = [v4a, v4b].filter(isV4);
    if (useV6) list.push(...[v6a, v6b].filter(isV6));
    return list;
  };

  const connect = async (opts) => {
    const m = (opts && opts.mode) || mode;
    const g = games.find((x) => x.id === ((opts && opts.gameId) || gameId)) || games[0];
    setFailed(false);
    setMsg('');
    if (!DnsVpn) { setMsg(t.noModule); setFailed(true); return; }
    setBusy(true);
    try {
      let list;
      let fallbackMs = null;
      if (m === 'custom') {
        list = customList();
        if (!list.length) throw new Error(t.noValid);
      } else {
        const res = await scanGame(g);
        if (!res.length) throw new Error(t.noServer);
        const best = res[0];
        list = [...best.c.v4, ...(useV6 ? best.c.v6.filter(isV6) : [])];
        fallbackMs = Math.max(1, Math.round(best.ms));
      }
      await DnsVpn.start(list);
      await new Promise((r) => setTimeout(r, 800));
      const running = await DnsVpn.isRunning();
      setOn(running);
      if (!running) setFailed(true);
      else {
        const dom = g.domains && g.domains.length ? g.domains[0] : 'google.com';
        const ms = await measurePing(list[0], dom);
        setPingMs(ms !== null ? ms : fallbackMs);
      }
    } catch (e) {
      setMsg(e && e.code === 'DENIED' ? t.denied : (e && e.message) || '');
      setFailed(true);
    }
    setBusy(false);
  };
  connectRef.current = connect;

  const connectVpn = async (type) => {
    const cfg = (type === 'wg' ? wgCfg : ovpnCfg).trim();
    setVpnErr('');
    if (type === 'wg' ? !(cfg.includes('[Interface]') && cfg.includes('[Peer]')) : !/^\s*remote\s+/m.test(cfg)) {
      setVpnErr(type === 'wg' ? t.wgInvalid : t.ovpnInvalid);
      return;
    }
    const fn = DnsVpn && (type === 'wg' ? DnsVpn.startWireGuard : DnsVpn.startOpenVpn);
    if (!fn) { setVpnErr(DnsVpn ? t.vpnNoNative : t.noModule); return; }
    setBusy(true);
    try {
      if (on) { try { await DnsVpn.stop(); } catch (e) {} }
      await fn.call(DnsVpn, cfg);
      await new Promise((r) => setTimeout(r, 800));
      const running = await DnsVpn.isRunning();
      setOn(running);
      setPingMs(null);
      setFailed(!running);
      if (running) setScreen('home');
      else setVpnErr(t.failTxt);
    } catch (e) {
      setVpnErr(e && e.code === 'DENIED' ? t.denied : (e && e.message) || t.failTxt);
    }
    setBusy(false);
  };

  const disconnect = async () => {
    if (!DnsVpn) return;
    setBusy(true);
    try { await DnsVpn.stop(); } catch (e) {}
    setOn(false);
    setFailed(false);
    setMsg('');
    setBusy(false);
  };

  const onPower = () => {
    if (busy) return;
    if (on) disconnect();
    else connect({ mode, gameId });
  };

  const pickGame = (id) => {
    if (busy || editing) return;
    setGameId(id);
    setMode('auto');
    if (on) connect({ mode: 'auto', gameId: id });
  };

  const addGame = () => {
    const name = newName.trim();
    if (!name) { setFormErr(t.needName); return; }
    let domains = [];
    const raw = newDomain.trim();
    if (raw) {
      const parts = raw.split(/[\s,،;]+/).filter(Boolean).map(cleanDomain);
      if (parts.some((d) => !d)) { setFormErr(t.invalidDomain); return; }
      domains = parts;
    }
    smooth();
    const g = { id: `u${Date.now()}`, name, domains };
    setGames((prev) => [...prev, g]);
    setGameId(g.id);
    setMode('auto');
    setNewName(''); setNewDomain(''); setFormErr('');
    setAddOpen(false);
    setShowAll(true);
  };

  const removeGame = (id) => {
    if (games.length <= 1) return;
    smooth();
    const next = games.filter((g) => g.id !== id);
    setGames(next);
    if (gameId === id) setGameId(next[0].id);
  };

  const restoreGames = () => {
    smooth();
    setGames(DEFAULT_GAMES);
    setGameId('pubg');
    setEditing(false);
  };

  const edit = (setter) => (v) => { setter(v.trim()); setPreset('custom'); };
  const applyPreset = (p) => {
    setPreset(p.id);
    setV4a(p.v4[0] || ''); setV4b(p.v4[1] || '');
    setV6a(p.v6[0] || ''); setV6b(p.v6[1] || '');
  };

  const topPad = (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44) + 6;

  /* ---------------- HOME ---------------- */
  const renderHome = () => {
    const status = busy ? 'work' : on ? 'ok' : failed ? 'fail' : 'idle';
    const title = status === 'work' ? t.connecting : status === 'ok' ? t.okTxt : status === 'fail' ? t.failTxt : t.notConnected;
    const color = status === 'ok' ? C.green : status === 'fail' ? C.bad : C.text;
    const sub = status === 'idle' ? t.tapConnect : status === 'fail' ? msg : status === 'ok' && pingMs !== null ? `${t.pingIs}: ${fa ? toFa(pingMs) : pingMs} ms` : '';
    const shown = showAll ? games : games.slice(0, 3);
    const more = games.length - 3;

    return (
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: topPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[s.topbar, { flexDirection: fa ? 'row' : 'row-reverse' }]}>
          <TouchableOpacity style={s.gear} onPress={() => setScreen('settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.gearTxt}>⚙</Text>
          </TouchableOpacity>
          <Logo />
        </View>

        <PowerButton on={on} busy={busy} onPress={onPower} />

        <View style={[s.statusPill, {
          borderColor: status === 'ok' ? 'rgba(255,138,31,0.4)' : status === 'fail' ? 'rgba(255,77,106,0.4)' : 'transparent',
          backgroundColor: status === 'ok' ? 'rgba(255,138,31,0.10)' : status === 'fail' ? 'rgba(255,77,106,0.10)' : 'transparent',
        }]}>
          <Text style={[s.status, { color }]}>
            {status === 'ok' ? '✓  ' : status === 'fail' ? '✕  ' : ''}
            {title}
          </Text>
        </View>
        {!!sub && <Text style={[s.statusSub, status === 'ok' && { color: C.green, fontSize: 15, fontWeight: '800' }]} numberOfLines={2}>{sub}</Text>}

        {/* games */}
        <View style={[s.card, { marginTop: 14, padding: 10 }]}>
          <View style={[s.headRow, { flexDirection: rowDir }]}>
            <Text style={[s.cardHead, { flex: 1, textAlign: ta }]}>{t.supported}</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity activeOpacity={0.8} style={[s.pill, addOpen && s.pillOn]} onPress={() => { smooth(); setAddOpen(!addOpen); setFormErr(''); }}>
                <Text style={[s.pillTxt, addOpen && { color: '#fff' }]}>{`+ ${t.add}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={[s.pill, { marginLeft: 6 }, editing && s.pillOn]} onPress={() => { smooth(); setEditing(!editing); }}>
                <Text style={[s.pillTxt, editing && { color: '#fff' }]}>{editing ? t.done : t.edit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {addOpen && (
            <Appear style={s.addBox} dy={-8}>
              <TextInput
                value={newName}
                onChangeText={(v) => { setNewName(v); setFormErr(''); }}
                placeholder={t.appName}
                placeholderTextColor="#6B5444"
                style={[s.input, { textAlign: ta }]}
              />
              <TextInput
                value={newDomain}
                onChangeText={(v) => { setNewDomain(v); setFormErr(''); }}
                placeholder={t.appDomain}
                placeholderTextColor="#6B5444"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[s.input, { marginTop: 8 }]}
              />
              <Text style={[s.note, { textAlign: ta }]}>{t.appNote}</Text>
              {!!formErr && <Text style={[s.err, { textAlign: ta }]}>{formErr}</Text>}
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity activeOpacity={0.8} style={[s.btn, s.btnOn, { flex: 1, marginRight: 8 }]} onPress={addGame}>
                  <Text style={[s.btnTxt, { color: '#fff' }]}>{t.save}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={[s.btn, { flex: 0.6 }]} onPress={() => { smooth(); setAddOpen(false); setFormErr(''); }}>
                  <Text style={s.btnTxt}>{t.cancel}</Text>
                </TouchableOpacity>
              </View>
            </Appear>
          )}

          {shown.map((g) => (
            <GameRow
              key={g.id}
              g={g}
              fa={fa}
              sel={mode === 'auto' && g.id === gameId}
              editing={editing}
              canDelete={games.length > 1}
              onPick={pickGame}
              onRemove={removeGame}
            />
          ))}

          {games.length > 3 && !editing && (
            <TouchableOpacity onPress={() => { smooth(); setShowAll(!showAll); }} style={s.moreBtn}>
              <Text style={s.moreTxt}>{showAll ? `${t.showLess} ⌃` : `${t.showAll} (${fa ? toFa(more) : more}) ⌄`}</Text>
            </TouchableOpacity>
          )}

          {editing && (
            <TouchableOpacity onPress={restoreGames} style={s.moreBtn}>
              <Text style={[s.moreTxt, { color: C.blue }]}>{t.restore}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={openChannel} style={[s.joinBtn, { flexDirection: rowDir }]}>
          <Text style={s.plane}>➤</Text>
          <Text style={[s.joinTxt, { textAlign: ta }]}>{t.join}</Text>
          <Text style={s.chev}>{fa ? '‹' : '›'}</Text>
        </TouchableOpacity>

        <Text style={[s.footer, { textAlign: ta }]}>{t.footer}</Text>
      </ScrollView>
    );
  };

  /* ---------------- SETTINGS ---------------- */
  const renderSettings = () => (
    <ScrollView contentContainerStyle={[s.scroll, { paddingTop: topPad }]} showsVerticalScrollIndicator={false}>
      <Header fa={fa} title={t.settings} onBack={() => setScreen('home')} />

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.general}</Text>
      <View style={s.card}>
        <Row
          fa={fa}
          icon="⚡"
          title={t.autoConnect}
          sub={t.autoConnectSub}
          right={<Switch value={autoConnect} onValueChange={setAutoConnect} trackColor={{ false: '#3A2A1E', true: '#FF7A00' }} thumbColor="#FFFFFF" />}
        />
        <Row fa={fa} icon="🌐" title={t.customDns} sub={t.customDnsSub} onPress={() => setScreen('custom')} last />
      </View>

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.vpnSec}</Text>
      <View style={s.card}>
        <Row fa={fa} icon="🛡" title={t.wg} sub={t.wgSub} onPress={() => { setVpnType('wg'); setVpnErr(''); setScreen('vpn'); }} />
        <Row fa={fa} icon="🔒" title={t.ovpn} sub={t.ovpnSub} onPress={() => { setVpnType('ovpn'); setVpnErr(''); setScreen('vpn'); }} last />
      </View>

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.language}</Text>
      <View style={[s.card, { padding: 6 }]}>
        <View style={[s.seg, { flexDirection: rowDir }]}>
          <TouchableOpacity style={[s.segBtn, lang === 'fa' && s.segOn]} onPress={() => setLang('fa')}>
            <Text style={[s.segTxt, lang === 'fa' && { color: '#fff' }]}>فارسی</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.segBtn, lang === 'en' && s.segOn]} onPress={() => setLang('en')}>
            <Text style={[s.segTxt, lang === 'en' && { color: '#fff' }]}>English</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.channelSec}</Text>
      <View style={s.card}>
        <Row fa={fa} icon="🎮" title={t.request} onPress={openChannel} />
        <Row fa={fa} icon="✈" title={t.channel} sub={t.channelSub} onPress={openChannel} last />
      </View>

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.device}</Text>
      <View style={s.card}>
        <Row
          fa={fa}
          icon="📱"
          title={t.deviceId}
          sub={deviceId}
          onPress={() => Share.share({ message: deviceId }).catch(() => {})}
          right={<Text style={s.chev}>⧉</Text>}
          last
        />
      </View>
      <Text style={[s.note, { textAlign: ta, marginTop: 8 }]}>{t.deviceNote}</Text>

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.about}</Text>
      <View style={s.card}>
        <Row fa={fa} icon="✨" title={t.update} sub={t.updateSub} onPress={openChannel} />
        <Row fa={fa} icon="ℹ" title="Abrino DNS" sub={`${t.version} ${fa ? toFa(VERSION) : VERSION}`} last />
      </View>
    </ScrollView>
  );

  /* ---------------- CUSTOM DNS ---------------- */
  const renderCustom = () => (
    <ScrollView contentContainerStyle={[s.scroll, { paddingTop: topPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Header fa={fa} title={t.customTitle} onBack={() => setScreen('settings')} />

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.presets}</Text>
      <View style={[s.chips, { justifyContent: fa ? 'flex-end' : 'flex-start' }]}>
        {DNS_LIST.map((p) => {
          const sel = preset === p.id;
          return (
            <TouchableOpacity key={p.id} activeOpacity={0.8} onPress={() => applyPreset(p)} style={[s.chip, sel && s.chipOn]}>
              <Text style={[s.chipTxt, sel && { color: '#fff' }]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[s.card, { padding: 14, marginTop: 14 }]}>
        <Text style={[s.cardHead, { textAlign: ta }]}>{t.v4}</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}><Field label="DNS 1" value={v4a} onChangeText={edit(setV4a)} placeholder="8.8.8.8" valid={isV4(v4a)} /></View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}><Field label="DNS 2" value={v4b} onChangeText={edit(setV4b)} placeholder="8.8.4.4" valid={isV4(v4b)} /></View>
        </View>
      </View>

      <View style={[s.card, { padding: 14, marginTop: 12 }]}>
        <View style={[s.headRow, { flexDirection: rowDir }]}>
          <Text style={s.cardHead}>{t.v6}</Text>
          <Switch value={useV6} onValueChange={setUseV6} trackColor={{ false: '#3A2A1E', true: '#FF7A00' }} thumbColor="#FFFFFF" />
        </View>
        <View style={{ opacity: useV6 ? 1 : 0.3 }} pointerEvents={useV6 ? 'auto' : 'none'}>
          <Field label="DNS 1" value={v6a} onChangeText={edit(setV6a)} placeholder="2001:4860:4860::8888" valid={isV6(v6a)} />
          <Field label="DNS 2" value={v6b} onChangeText={edit(setV6b)} placeholder="2001:4860:4860::8844" valid={isV6(v6b)} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 14 }}>
        <TouchableOpacity
          disabled={busy}
          activeOpacity={0.8}
          onPress={() => { setMode('custom'); setScreen('home'); connect({ mode: 'custom' }); }}
          style={[s.btn, s.btnOn, { flex: 1, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[s.btnTxt, { color: '#fff' }]}>{t.connectCustom}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );

  /* ---------------- VPN (WireGuard / OpenVPN) ---------------- */
  const renderVpn = () => {
    const isWg = vpnType === 'wg';
    const val = isWg ? wgCfg : ovpnCfg;
    const setVal = isWg ? setWgCfg : setOvpnCfg;
    return (
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: topPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Header fa={fa} title={isWg ? 'WireGuard' : 'OpenVPN'} onBack={() => setScreen('settings')} />
        <View style={[s.card, { padding: 14, marginTop: 16 }]}>
          <Text style={[s.cardHead, { textAlign: ta }]}>{t.cfgHint}</Text>
          <TextInput
            value={val}
            onChangeText={(v) => { setVal(v); setVpnErr(''); }}
            placeholder={isWg ? '[Interface]\nPrivateKey = ...\n\n[Peer]\nPublicKey = ...' : 'client\nremote server.example.com 1194'}
            placeholderTextColor="#6B5444"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
            style={[s.input, { height: 240, marginTop: 10, fontSize: 12.5 }]}
          />
          {!!vpnErr && <Text style={[s.err, { textAlign: ta }]}>{vpnErr}</Text>}
        </View>
        <Text style={[s.note, { textAlign: ta, marginTop: 10 }]}>{t.cfgNote}</Text>
        <TouchableOpacity disabled={busy} activeOpacity={0.8} onPress={() => connectVpn(vpnType)} style={[s.btn, s.btnOn, { marginTop: 14, opacity: busy ? 0.5 : 1 }]}>
          <Text style={[s.btnTxt, { color: '#fff' }]}>{busy ? t.connecting : t.connectVpn}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Background />
      <Appear key={screen} style={{ flex: 1 }} dy={8} duration={240}>
        {screen === 'home' && renderHome()}
        {screen === 'settings' && renderSettings()}
        {screen === 'custom' && renderCustom()}
        {screen === 'vpn' && renderVpn()}
      </Appear>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles (Persian text: extra line height, no letterSpacing)         */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },
  glow: { position: 'absolute' },

  topbar: { alignItems: 'center', justifyContent: 'space-between', height: 42 },
  gear: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  gearTxt: { color: C.mute, fontSize: 23, lineHeight: 28 },
  logoWrap: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#FF7A00', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFB066', overflow: 'hidden' },
  logoLetter: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  logoBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: C.purple },
  logoText: { color: C.text, fontSize: 16.5, fontWeight: '800', marginLeft: 9, letterSpacing: 0.4 },

  hero: { height: 214, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  halo: { position: 'absolute', width: 212, height: 212, borderRadius: 106 },
  ringBox: { position: 'absolute', width: RING_SIZE, height: RING_SIZE },
  thinRing: { position: 'absolute', width: 158, height: 158, borderRadius: 79, borderWidth: 1, borderColor: 'rgba(255,138,31,0.28)' },
  disc: { width: 142, height: 142, borderRadius: 71, backgroundColor: '#1A0C03', borderWidth: 1.5, borderColor: 'rgba(255,138,31,0.35)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inner: { position: 'absolute' },
  pwr: { width: 56, height: 56 },
  pwrRing: { position: 'absolute', left: 3, top: 6, width: 50, height: 50, borderRadius: 25, borderWidth: 4.5 },
  pwrBar: { position: 'absolute', left: 25.5, top: 0, width: 5, height: 27, borderRadius: 3 },

  status: { fontSize: 17, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  statusPill: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 3, borderRadius: 18, borderWidth: 1 },
  statusSub: { color: C.mute, fontSize: 12.5, textAlign: 'center', lineHeight: 20, marginTop: 4, paddingHorizontal: 10 },

  card: { backgroundColor: 'rgba(38,23,13,0.85)', borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden' },
  cardHead: { color: C.mute, fontSize: 13, lineHeight: 22 },
  headRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  secTitle: { color: C.mute, fontSize: 13, marginTop: 20, marginBottom: 8, paddingHorizontal: 6, lineHeight: 22 },
  note: { color: C.mute, fontSize: 12, lineHeight: 19, marginTop: 8, paddingHorizontal: 2 },
  err: { color: C.bad, fontSize: 12.5, lineHeight: 20, marginTop: 6 },
  footer: { color: '#8A6E5A', fontSize: 11.5, lineHeight: 19, marginTop: 14, paddingHorizontal: 6 },

  row: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  iconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 18, color: C.iconFg, lineHeight: 24 },
  rowTitle: { color: C.text, fontSize: 15.5, fontWeight: '600', lineHeight: 24 },
  rowSub: { color: C.mute, fontSize: 12.5, lineHeight: 20 },
  sep: { height: 1, backgroundColor: C.line },
  chev: { color: C.mute, fontSize: 24, lineHeight: 26, paddingHorizontal: 4 },

  header: { height: 46, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 19, fontWeight: '800', lineHeight: 28 },
  backBtn: { position: 'absolute', top: 3, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: C.blue, fontSize: 36, lineHeight: 40 },

  seg: { backgroundColor: '#2A190C', borderRadius: 14, padding: 3 },
  segBtn: { flex: 1, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#FF7A00' },
  segTxt: { color: C.mute, fontSize: 15, fontWeight: '700', lineHeight: 22 },

  pill: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 4 },
  pillOn: { backgroundColor: '#FF7A00', borderColor: '#FF7A00' },
  pillTxt: { color: C.text, fontSize: 12.5, fontWeight: '700', lineHeight: 20 },
  addBox: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 14, padding: 10, marginTop: 8, marginBottom: 4 },

  gameRow: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 12, marginTop: 2 },
  gameHi: { backgroundColor: 'rgba(255,138,31,0.10)', borderWidth: 1, borderColor: 'rgba(255,138,31,0.25)', borderRadius: 12 },
  iconBoxSm: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  iconTxtSm: { fontSize: 14, lineHeight: 20 },
  gameName: { flex: 1, color: C.text, fontSize: 13.5, marginHorizontal: 11, lineHeight: 22 },
  check: { color: C.green, fontSize: 18, fontWeight: '900', width: 26, textAlign: 'center' },
  delBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,77,106,0.15)', alignItems: 'center', justifyContent: 'center' },
  delTxt: { color: C.bad, fontSize: 12, fontWeight: '900', lineHeight: 16 },
  moreBtn: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  moreTxt: { color: C.mute, fontSize: 13, lineHeight: 22 },

  joinBtn: { alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(38,23,13,0.92)', borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  plane: { color: C.blue, fontSize: 19, lineHeight: 24, transform: [{ rotate: '-20deg' }] },
  joinTxt: { flex: 1, color: C.text, fontSize: 14, marginHorizontal: 10, lineHeight: 22 },

  resTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resName: { color: C.text, fontSize: 13.5, fontWeight: '600', lineHeight: 20, flex: 1, marginRight: 8 },
  resMs: { fontSize: 13, fontWeight: '800' },
  barBg: { height: 4, borderRadius: 2, backgroundColor: '#3A2412', marginTop: 5, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 7, marginBottom: 7 },
  chipOn: { backgroundColor: '#FF7A00', borderColor: '#FF7A00' },
  chipTxt: { color: C.text, fontWeight: '700', fontSize: 13, lineHeight: 20 },
  fieldLabel: { color: C.mute, fontSize: 11.5, marginBottom: 4 },
  input: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 11, color: C.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13.5, textAlign: 'left' },
  btn: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  btnOn: { backgroundColor: '#FF7A00', borderColor: '#FF7A00' },
  btnTxt: { color: C.text, fontWeight: '800', fontSize: 14, lineHeight: 20 },
});
