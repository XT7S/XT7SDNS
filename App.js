import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Linking,
  NativeModules,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { DnsVpn } = NativeModules;

const CHANNEL_URL = 'https://t.me/AbrinoDNS';
const VERSION = '1.0';

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#04031A',
  panel: '#0F0D2A',
  panel2: '#171434',
  line: '#241F4D',
  blue: '#00A3FF',
  purple: '#7B2CFF',
  green: '#00E5A0',
  iconBg: '#10264A',
  iconFg: '#1E9BFF',
  text: '#F3F5FF',
  mute: '#8C90B5',
  bad: '#FF4D6A',
  warn: '#FFB300',
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
// Candidate DNS servers. The app measures all of them for the chosen game
// and connects with the fastest one.
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

// For every game we look up its own server names, so the winner is the DNS
// that is really fastest for that game.
const GAMES = [
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
    scanning: 'در حال یافتن بهترین DNS...',
    scanningSub: 'پینگ سرورها برای بازی انتخابی تست می‌شود',
    connecting: 'در حال اتصال...',
    connected: 'وصل شد',
    tapDisconnect: 'برای قطع اتصال ضربه بزنید',
    supported: 'بازی‌ها و برنامه‌های پشتیبانی‌شده',
    showAll: 'نمایش همه',
    showLess: 'نمایش کمتر',
    join: 'عضویت در کانال تلگرام Abrino DNS',
    results: 'نتیجه‌ی تست برای',
    bestDns: 'بهترین DNS',
    custom: 'سفارشی',
    customTitle: 'DNS سفارشی',
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
    failed: 'اتصال برقرار نشد. دوباره امتحان کن.',
    footer: 'فقط درخواست‌های DNS از طریق VPN عبور می‌کنند؛ ترافیک بازی مستقیم می‌رود و سرعتش کم نمی‌شود.',
    pingNote: 'پینگ یعنی سرعت پاسخ DNS؛ نه پینگ داخل بازی.',
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
    scanning: 'Finding the best DNS...',
    scanningSub: 'Testing server speed for the selected game',
    connecting: 'Connecting...',
    connected: 'Connected',
    tapDisconnect: 'Tap to disconnect',
    supported: 'Supported games & apps',
    showAll: 'Show all',
    showLess: 'Show less',
    join: 'Join the Abrino DNS Telegram channel',
    results: 'Test results for',
    bestDns: 'Best DNS',
    custom: 'Custom',
    customTitle: 'Custom DNS',
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
    failed: 'Could not connect. Try again.',
    footer: 'Only DNS requests pass through the VPN; game traffic goes directly and is not slowed down.',
    pingNote: 'Ping here means DNS answer speed, not in-game ping.',
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

const scanGame = async (game) => {
  let res = await Promise.all(DNS_LIST.map(async (c) => ({ c, ms: await scoreDns(c, game.domains) })));
  if (!res.some((r) => r.ms >= 0)) {
    // the game's names did not resolve anywhere: fall back to a generic name
    res = await Promise.all(DNS_LIST.map(async (c) => ({ c, ms: await scoreDns(c, ['google.com']) })));
  }
  return res.filter((r) => r.ms >= 0).sort((x, y) => x.ms - y.ms);
};

/* ------------------------------------------------------------------ */
/*  Small visual pieces                                                */
/* ------------------------------------------------------------------ */
const NET_DOTS = [
  ['12%', '8%', 5, 0.5], ['30%', '14%', 4, 0.35], ['62%', '6%', 7, 0.6], ['86%', '12%', 4, 0.4],
  ['8%', '28%', 4, 0.3], ['92%', '30%', 6, 0.5], ['20%', '46%', 4, 0.3], ['80%', '48%', 5, 0.35],
  ['50%', '60%', 4, 0.25], ['14%', '70%', 5, 0.3], ['90%', '74%', 4, 0.3],
];

function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.glow, { width: 520, height: 520, borderRadius: 260, top: 40, alignSelf: 'center', backgroundColor: 'rgba(0,120,255,0.05)' }]} />
      <View style={[s.glow, { width: 360, height: 360, borderRadius: 180, top: 120, alignSelf: 'center', backgroundColor: 'rgba(90,40,255,0.07)' }]} />
      <View style={[s.glow, { width: 460, height: 460, borderRadius: 230, bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(120,30,200,0.06)' }]} />
      {NET_DOTS.map((d, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: d[0], top: d[1], width: d[2], height: d[2], borderRadius: d[2], backgroundColor: C.blue, opacity: d[3] }}
        />
      ))}
    </View>
  );
}

function Logo() {
  return (
    <View style={s.logoWrap}>
      <View style={s.logoBox}>
        <Text style={s.logoLetter}>A</Text>
        <View style={s.logoBar} />
      </View>
      <Text style={s.logoText}>
        Abrino<Text style={{ color: C.blue }}> DNS</Text>
      </Text>
    </View>
  );
}

const RING_N = 100;
const RING_SIZE = 262;
const RING_R = 122;
const DOT = 9;

function PowerButton({ on, stage, pulse, onPress }) {
  const busy = stage !== 'idle';
  const A = on ? C.green : C.blue;
  const B = on ? C.blue : C.purple;

  const dots = useMemo(() => {
    const out = [];
    for (let i = 0; i < RING_N; i += 1) {
      const th = (i / RING_N) * Math.PI * 2;
      const t = (1 + Math.cos(th + Math.PI / 4)) / 2; // blue top-right, purple bottom-left
      out.push({
        key: i,
        left: RING_SIZE / 2 + RING_R * Math.cos(th) - DOT / 2,
        top: RING_SIZE / 2 + RING_R * Math.sin(th) - DOT / 2,
        color: mix(B, A, t),
      });
    }
    return out;
  }, [A, B]);

  const halo = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] });

  return (
    <View style={s.hero}>
      <Animated.View
        pointerEvents="none"
        style={[s.halo, { backgroundColor: A, opacity: halo, transform: [{ scale }] }]}
      />
      <View style={s.ringBox} pointerEvents="none">
        {dots.map((d) => (
          <View key={d.key} style={{ position: 'absolute', left: d.left, top: d.top, width: DOT, height: DOT, borderRadius: DOT, backgroundColor: d.color }} />
        ))}
      </View>
      <View style={s.thinRing} pointerEvents="none" />
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={busy} style={s.disc}>
        {busy ? (
          <ActivityIndicator size="large" color={C.blue} />
        ) : (
          <View style={s.pwr}>
            <View style={[s.pwrRing, { borderColor: on ? C.green : '#FFFFFF' }]} />
            <View style={s.pwrGap} />
            <View style={[s.pwrBar, { backgroundColor: on ? C.green : '#FFFFFF' }]} />
          </View>
        )}
      </TouchableOpacity>
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
        <View style={{ flex: 1, marginHorizontal: 14 }}>
          <Text style={[s.rowTitle, { textAlign: ta }]}>{title}</Text>
          {!!sub && <Text style={[s.rowSub, { textAlign: ta }]}>{sub}</Text>}
        </View>
        {right !== undefined ? right : onPress ? <Text style={s.chev}>{fa ? '‹' : '›'}</Text> : null}
      </View>
      {!last && <View style={[s.sep, fa ? { marginRight: 74, marginLeft: 0 } : { marginLeft: 74, marginRight: 0 }]} />}
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
      <TouchableOpacity onPress={onBack} style={[s.backBtn, fa ? { right: 4 } : { left: 4 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
        placeholderTextColor="#3C3F66"
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
  const [gameId, setGameId] = useState('pubg');
  const [mode, setMode] = useState('auto'); // auto | custom
  const [showAll, setShowAll] = useState(false);

  const [v4a, setV4a] = useState('8.8.8.8');
  const [v4b, setV4b] = useState('8.8.4.4');
  const [v6a, setV6a] = useState('2001:4860:4860::8888');
  const [v6b, setV6b] = useState('2001:4860:4860::8844');
  const [useV6, setUseV6] = useState(true);
  const [preset, setPreset] = useState('google');

  const [on, setOn] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | scan | connect
  const [msg, setMsg] = useState('');
  const [active, setActive] = useState(null); // { name, ms, game }
  const [results, setResults] = useState([]); // [{ name, ms }]
  const [resultsGame, setResultsGame] = useState('');
  const [pings, setPings] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const autoDone = useRef(false);

  const t = T[lang];
  const fa = lang === 'fa';
  const ta = fa ? 'right' : 'left';
  const game = GAMES.find((g) => g.id === gameId) || GAMES[0];
  const busy = stage !== 'idle';

  /* pulse animation */
  useEffect(() => {
    const d = on ? 900 : 1700;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [on, pulse]);

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
            if (p.gameId) setGameId(p.gameId);
            if (p.mode) setMode(p.mode);
            if (p.v4a !== undefined) setV4a(p.v4a);
            if (p.v4b !== undefined) setV4b(p.v4b);
            if (p.v6a !== undefined) setV6a(p.v6a);
            if (p.v6b !== undefined) setV6b(p.v6b);
            if (typeof p.useV6 === 'boolean') setUseV6(p.useV6);
            if (p.preset) setPreset(p.preset);
            if (p.deviceId) id = p.deviceId;
            const running = await DnsVpn.isRunning();
            setOn(running);
            if (running && p.active) setActive(p.active);
          }
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
    DnsVpn.savePrefs(
      JSON.stringify({ lang, autoConnect, gameId, mode, v4a, v4b, v6a, v6b, useV6, preset, deviceId, active })
    );
  }, [loaded, lang, autoConnect, gameId, mode, v4a, v4b, v6a, v6b, useV6, preset, deviceId, active]);

  /* Android back button */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'home') {
        setScreen(screen === 'custom' ? 'settings' : 'home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  /* auto connect when the app opens */
  const connectRef = useRef(null);
  useEffect(() => {
    if (loaded && autoConnect && !autoDone.current) {
      autoDone.current = true;
      if (!on && mode === 'auto' && connectRef.current) connectRef.current({ mode: 'auto', gameId });
    }
  }, [loaded]); // eslint-disable-line

  /* ---------------- actions ---------------- */
  const customList = () => {
    const list = [v4a, v4b].filter(isV4);
    if (useV6) list.push(...[v6a, v6b].filter(isV6));
    return list;
  };

  const connect = async (opts) => {
    const m = (opts && opts.mode) || mode;
    const g = GAMES.find((x) => x.id === ((opts && opts.gameId) || gameId)) || GAMES[0];
    if (!DnsVpn) { setMsg(t.noModule); return; }
    setMsg('');
    try {
      let list;
      let info;
      if (m === 'custom') {
        list = customList();
        if (!list.length) throw new Error(t.noValid);
        info = { name: t.custom, ms: null, game: '' };
      } else {
        setStage('scan');
        const res = await scanGame(g);
        if (!res.length) throw new Error(t.noServer);
        const best = res[0];
        setResults(res.slice(0, 5).map((r) => ({ name: r.c.name, ms: r.ms })));
        setResultsGame(g.name);
        list = [...best.c.v4, ...(useV6 ? best.c.v6.filter(isV6) : [])];
        info = { name: best.c.name, ms: Math.round(best.ms), game: g.name };
      }
      setStage('connect');
      await DnsVpn.start(list);
      await new Promise((r) => setTimeout(r, 800));
      const running = await DnsVpn.isRunning();
      setOn(running);
      if (running) setActive(info);
      else setMsg(t.failed);
    } catch (e) {
      setMsg(e && e.code === 'DENIED' ? t.denied : (e && e.message) || 'Error');
    }
    setStage('idle');
  };
  connectRef.current = connect;

  const disconnect = async () => {
    if (!DnsVpn) return;
    setStage('connect');
    try { await DnsVpn.stop(); } catch (e) {}
    setOn(false);
    setActive(null);
    setStage('idle');
  };

  const onPower = () => {
    if (busy) return;
    if (on) disconnect();
    else connect({ mode, gameId });
  };

  const pickGame = (id) => {
    if (busy) return;
    setGameId(id);
    setMode('auto');
    if (on) connect({ mode: 'auto', gameId: id });
  };

  const edit = (setter) => (v) => { setter(v.trim()); setPreset('custom'); };
  const applyPreset = (p) => {
    setPreset(p.id);
    setV4a(p.v4[0] || ''); setV4b(p.v4[1] || '');
    setV6a(p.v6[0] || ''); setV6b(p.v6[1] || '');
  };

  const pingAll = async () => {
    if (!DnsVpn || busy) return;
    setStage('scan'); setPings([]);
    const list = [v4a, v4b, ...(useV6 ? [v6a, v6b] : [])].filter((a) => isV4(a) || isV6(a));
    const res = await Promise.all(list.map(async (a) => ({ a, ms: await DnsVpn.ping(a) })));
    setPings(res);
    setStage('idle');
  };

  const topPad = (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44) + 10;

  /* ---------------- HOME ---------------- */
  const renderHome = () => {
    const title = stage === 'scan' ? t.scanning : stage === 'connect' ? t.connecting : on ? t.connected : t.notConnected;
    const sub = stage === 'scan' ? t.scanningSub : on ? (active ? `${active.name}${active.ms != null ? ` · ${active.ms}ms` : ''}${active.game ? ` · ${active.game}` : ''}` : t.tapDisconnect) : t.tapConnect;
    const shown = showAll ? GAMES : GAMES.slice(0, 3);
    const more = GAMES.length - 3;
    const maxMs = results.length ? Math.max(...results.map((r) => r.ms), 60) : 60;

    return (
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: topPad }]} showsVerticalScrollIndicator={false}>
        <View style={[s.topbar, { flexDirection: fa ? 'row' : 'row-reverse' }]}>
          <TouchableOpacity style={s.gear} onPress={() => setScreen('settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.gearTxt}>⚙</Text>
          </TouchableOpacity>
          <Logo />
        </View>

        <PowerButton on={on} stage={stage} pulse={pulse} onPress={onPower} />

        <Text style={[s.status, on && { color: C.green }]}>{title}</Text>
        <Text style={s.statusSub} numberOfLines={2}>{sub}</Text>
        {!!msg && (
          <View style={s.msgBox}>
            <Text style={s.msgTxt}>{msg}</Text>
          </View>
        )}

        {results.length > 0 && mode === 'auto' && (
          <View style={[s.card, { padding: 14, marginTop: 18 }]}>
            <Text style={[s.cardHead, { textAlign: ta }]}>{`${t.results} ${resultsGame}`}</Text>
            {results.map((r, i) => (
              <View key={r.name} style={{ marginTop: 10 }}>
                <View style={[s.resTop, { flexDirection: fa ? 'row-reverse' : 'row' }]}>
                  <Text style={[s.resName, i === 0 && { color: C.green }]}>{i === 0 ? `★ ${r.name}` : r.name}</Text>
                  <Text style={[s.resMs, { color: pingColor(r.ms) }]}>{`${Math.round(r.ms)} ms`}</Text>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${Math.max(8, Math.min(100, (r.ms / maxMs) * 100))}%`, backgroundColor: pingColor(r.ms) }]} />
                </View>
              </View>
            ))}
            <Text style={[s.note, { textAlign: ta }]}>{t.pingNote}</Text>
          </View>
        )}

        <View style={[s.card, { marginTop: 22, padding: 16 }]}>
          <Text style={[s.cardHead, { textAlign: ta, marginBottom: 6 }]}>{t.supported}</Text>
          {shown.map((g) => {
            const sel = mode === 'auto' && g.id === gameId;
            return (
              <TouchableOpacity key={g.id} activeOpacity={0.75} onPress={() => pickGame(g.id)} style={[s.gameRow, { flexDirection: fa ? 'row-reverse' : 'row' }, sel && s.gameSel]}>
                <View style={s.iconBox}><Text style={s.iconTxt}>🎮</Text></View>
                <Text style={[s.gameName, { textAlign: fa ? 'right' : 'left' }]} numberOfLines={1}>{g.name}</Text>
                {sel ? <Text style={s.check}>✓</Text> : <View style={{ width: 20 }} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setShowAll(!showAll)} style={s.moreBtn}>
            <Text style={s.moreTxt}>{showAll ? `${t.showLess} ⌃` : `${t.showAll} (${fa ? toFa(more) : more}) ⌄`}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={openChannel} style={[s.joinBtn, { flexDirection: fa ? 'row-reverse' : 'row' }]}>
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
          right={<Switch value={autoConnect} onValueChange={setAutoConnect} trackColor={{ false: '#2A2850', true: '#2F4BFF' }} thumbColor="#FFFFFF" />}
        />
        <Row fa={fa} icon="🌐" title={t.customDns} sub={t.customDnsSub} onPress={() => setScreen('custom')} last />
      </View>

      <Text style={[s.secTitle, { textAlign: ta }]}>{t.language}</Text>
      <View style={[s.card, { padding: 8 }]}>
        <View style={[s.seg, { flexDirection: fa ? 'row-reverse' : 'row' }]}>
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
        <Row
          fa={fa}
          icon="ℹ"
          title={`Abrino DNS`}
          sub={`${t.version} ${fa ? toFa(VERSION) : VERSION}`}
          last
        />
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

      <View style={[s.card, { padding: 16, marginTop: 18 }]}>
        <Text style={[s.cardHead, { textAlign: ta }]}>{t.v4}</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}><Field label="DNS 1" value={v4a} onChangeText={edit(setV4a)} placeholder="8.8.8.8" valid={isV4(v4a)} /></View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}><Field label="DNS 2" value={v4b} onChangeText={edit(setV4b)} placeholder="8.8.4.4" valid={isV4(v4b)} /></View>
        </View>
      </View>

      <View style={[s.card, { padding: 16, marginTop: 14 }]}>
        <View style={[s.resTop, { flexDirection: fa ? 'row-reverse' : 'row' }]}>
          <Text style={[s.cardHead, { marginBottom: 0 }]}>{t.v6}</Text>
          <Switch value={useV6} onValueChange={setUseV6} trackColor={{ false: '#2A2850', true: '#2F4BFF' }} thumbColor="#FFFFFF" />
        </View>
        <View style={{ opacity: useV6 ? 1 : 0.3 }} pointerEvents={useV6 ? 'auto' : 'none'}>
          <Field label="DNS 1" value={v6a} onChangeText={edit(setV6a)} placeholder="2001:4860:4860::8888" valid={isV6(v6a)} />
          <Field label="DNS 2" value={v6b} onChangeText={edit(setV6b)} placeholder="2001:4860:4860::8844" valid={isV6(v6b)} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <TouchableOpacity disabled={busy} activeOpacity={0.8} onPress={pingAll} style={[s.btn, { flex: 1, marginRight: 10, opacity: busy ? 0.5 : 1 }]}>
          <Text style={s.btnTxt}>{t.pingTest}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={busy}
          activeOpacity={0.8}
          onPress={() => { setMode('custom'); setScreen('home'); connect({ mode: 'custom' }); }}
          style={[s.btn, s.btnOn, { flex: 1, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[s.btnTxt, { color: '#fff' }]}>{t.connectCustom}</Text>
        </TouchableOpacity>
      </View>

      {pings.length > 0 && (
        <View style={[s.card, { padding: 16, marginTop: 16 }]}>
          <Text style={[s.cardHead, { textAlign: ta }]}>{t.pingResult}</Text>
          {pings.map((r) => (
            <View key={r.a} style={{ marginTop: 10 }}>
              <View style={s.resTop}>
                <Text style={s.resName} numberOfLines={1}>{r.a}</Text>
                <Text style={[s.resMs, { color: pingColor(r.ms) }]}>{r.ms < 0 ? 'timeout' : `${Math.round(r.ms)} ms`}</Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${r.ms < 0 ? 100 : Math.max(8, Math.min(100, (r.ms / 200) * 100))}%`, backgroundColor: pingColor(r.ms) }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Background />
      {screen === 'home' && renderHome()}
      {screen === 'settings' && renderSettings()}
      {screen === 'custom' && renderCustom()}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
// Persian text: extra line height so letters are never clipped, no letterSpacing.
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  glow: { position: 'absolute' },

  /* top bar */
  topbar: { alignItems: 'center', justifyContent: 'space-between', height: 54 },
  gear: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  gearTxt: { color: C.mute, fontSize: 26, lineHeight: 32 },
  logoWrap: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#1B2BFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#5E7BFF', overflow: 'hidden' },
  logoLetter: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  logoBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: C.purple },
  logoText: { color: C.text, fontSize: 21, fontWeight: '800', marginLeft: 10, letterSpacing: 0.5 },

  /* power button */
  hero: { height: 330, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  halo: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  ringBox: { position: 'absolute', width: RING_SIZE, height: RING_SIZE },
  thinRing: { position: 'absolute', width: 226, height: 226, borderRadius: 113, borderWidth: 1, borderColor: '#2A3A82' },
  disc: { width: 216, height: 216, borderRadius: 108, backgroundColor: '#120E2E', alignItems: 'center', justifyContent: 'center' },
  pwr: { width: 74, height: 74 },
  pwrRing: { position: 'absolute', left: 3, top: 8, width: 68, height: 66, borderRadius: 34, borderWidth: 5 },
  pwrGap: { position: 'absolute', left: 24, top: 0, width: 26, height: 20, backgroundColor: '#120E2E' },
  pwrBar: { position: 'absolute', left: 34, top: 0, width: 6, height: 38, borderRadius: 3 },

  status: { color: C.text, fontSize: 27, fontWeight: '800', textAlign: 'center', lineHeight: 40 },
  statusSub: { color: C.mute, fontSize: 15, textAlign: 'center', lineHeight: 26, marginTop: 4, paddingHorizontal: 10 },
  msgBox: { backgroundColor: 'rgba(255,77,106,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14 },
  msgTxt: { color: '#FF8FA3', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  /* cards */
  card: { backgroundColor: 'rgba(23,20,52,0.82)', borderWidth: 1, borderColor: C.line, borderRadius: 22, overflow: 'hidden' },
  cardHead: { color: C.mute, fontSize: 14, marginBottom: 4, lineHeight: 24 },
  secTitle: { color: C.mute, fontSize: 14, marginTop: 24, marginBottom: 10, paddingHorizontal: 6, lineHeight: 24 },
  note: { color: C.mute, fontSize: 12.5, lineHeight: 20, marginTop: 12, paddingHorizontal: 4 },
  footer: { color: '#5E6290', fontSize: 12, lineHeight: 20, marginTop: 18, paddingHorizontal: 6 },

  /* rows */
  row: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 20, color: C.iconFg, lineHeight: 26 },
  rowTitle: { color: C.text, fontSize: 17, fontWeight: '600', lineHeight: 26 },
  rowSub: { color: C.mute, fontSize: 13.5, lineHeight: 22, marginTop: 1 },
  sep: { height: 1, backgroundColor: C.line },
  chev: { color: C.mute, fontSize: 28, lineHeight: 30, paddingHorizontal: 4 },

  /* header */
  header: { height: 54, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 21, fontWeight: '800', lineHeight: 32 },
  backBtn: { position: 'absolute', top: 6, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: C.blue, fontSize: 40, lineHeight: 44 },

  /* language switch */
  seg: { backgroundColor: '#1A1740', borderRadius: 16, padding: 4 },
  segBtn: { flex: 1, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#2F3DFF' },
  segTxt: { color: C.mute, fontSize: 17, fontWeight: '700', lineHeight: 26 },

  /* games */
  gameRow: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 16, marginTop: 4 },
  gameSel: { backgroundColor: 'rgba(0,163,255,0.10)' },
  gameName: { flex: 1, color: C.text, fontSize: 17, marginHorizontal: 14, lineHeight: 26 },
  check: { color: C.green, fontSize: 20, fontWeight: '900', width: 20, textAlign: 'center' },
  moreBtn: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  moreTxt: { color: C.mute, fontSize: 15, lineHeight: 24 },

  /* channel button */
  joinBtn: { alignItems: 'center', marginTop: 14, backgroundColor: 'rgba(23,20,52,0.9)', borderWidth: 1, borderColor: C.line, borderRadius: 26, paddingHorizontal: 18, paddingVertical: 16 },
  plane: { color: C.blue, fontSize: 22, lineHeight: 28, transform: [{ rotate: '-20deg' }] },
  joinTxt: { flex: 1, color: C.text, fontSize: 16, marginHorizontal: 12, lineHeight: 26 },

  /* results */
  resTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resName: { color: C.text, fontSize: 14.5, fontWeight: '600', lineHeight: 22, flex: 1, marginRight: 8 },
  resMs: { fontSize: 14, fontWeight: '800' },
  barBg: { height: 5, borderRadius: 3, backgroundColor: '#1D1A44', marginTop: 6, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  /* custom dns */
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 8, marginBottom: 8 },
  chipOn: { backgroundColor: '#2F3DFF', borderColor: '#2F3DFF' },
  chipTxt: { color: C.text, fontWeight: '700', fontSize: 14, lineHeight: 22 },
  fieldLabel: { color: C.mute, fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 12, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlign: 'left', writingDirection: 'ltr' },
  btn: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  btnOn: { backgroundColor: '#2F3DFF', borderColor: '#2F3DFF' },
  btnTxt: { color: C.text, fontWeight: '800', fontSize: 15, lineHeight: 22 },
});
