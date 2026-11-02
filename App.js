// AbrinoDNS — App.js
// فقط از react-native و ماژول بومی موجود پروژه (NativeModules.DnsVpn) استفاده می‌کند.
// متدهای واقعی ماژول (از DnsVpnModule.kt): start(dnsArray), stop(), isRunning(), loadPrefs(), savePrefs(json)
// هیچ پکیج جدیدی لازم نیست.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

// ─────────────────────────── تنظیمات قابل ویرایش ───────────────────────────
// نام کاربری تلگرام خود را (بدون @) اینجا بگذارید، مثلاً 'abrinodns'
const TELEGRAM_USERNAME = 'YOUR_TELEGRAM_USERNAME';

// دامنه‌های PUBG Mobile برای تست دسترسی
const PUBG_DOMAINS = ['pubgmobile.com', 'igamecj.com', 'proximabeta.com'];

// سرورهای DNS آماده (فقط IPv4)
const PRESETS = [
  { id: 'google', name: 'Google', servers: ['8.8.8.8', '8.8.4.4'] },
  { id: 'cloudflare', name: 'Cloudflare', servers: ['1.1.1.1', '1.0.0.1'] },
  { id: 'quad9', name: 'Quad9', servers: ['9.9.9.9', '149.112.112.112'] },
];
// ───────────────────────────────────────────────────────────────────────────

const DnsVpn = NativeModules.DnsVpn;
const MAX_APPS = 30;

const C = {
  bg: '#040704',
  card: '#09110A',
  cardHi: '#0D1A0F',
  line: '#123A18',
  neon: '#39FF14',
  neonDim: '#1E8F0C',
  lime: '#C8FF00',
  danger: '#FF3B5C',
  text: '#E8FFE8',
  muted: '#7FA583',
  btnBg: '#07140A',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch (e) {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IPV4 =
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const DOMAIN_RE =
  /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/;

function normalizeDomain(input) {
  let d = String(input || '').trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  d = d.split(/[/?#]/)[0];
  d = d.replace(/:\d+$/, '');
  d = d.replace(/\.$/, '');
  return d;
}

function buildDnsList(dnsId, primary, secondary) {
  if (dnsId === 'custom') {
    const a = String(primary || '').trim();
    const b = String(secondary || '').trim();
    if (!IPV4.test(a)) return { error: 'DNS اصلی نامعتبر است (فقط IPv4)' };
    if (b && !IPV4.test(b)) return { error: 'DNS دوم نامعتبر است (فقط IPv4)' };
    return { list: b ? [a, b] : [a] };
  }
  const p = PRESETS.find((x) => x.id === dnsId) || PRESETS[0];
  return { list: p.servers };
}

async function tryFetch(url, ms) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, ms);
  try {
    await fetch(url, { method: 'GET', signal: ctrl ? ctrl.signal : undefined });
    return true; // هر پاسخی (حتی 403/404) یعنی دامنه در دسترس است
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function checkDomain(domain) {
  if (await tryFetch('https://' + domain + '/', 6000)) return true;
  return tryFetch('http://' + domain + '/', 4000);
}

async function readPrefs() {
  try {
    if (!DnsVpn || !DnsVpn.loadPrefs) return {};
    const raw = await DnsVpn.loadPrefs();
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (e) {
    return {};
  }
}

async function waitForRunning(target, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if (!!(await DnsVpn.isRunning()) === target) return true;
    } catch (e) {}
    await sleep(250);
  }
  return false;
}

// ─────────────────────────── اجزای کوچک ───────────────────────────

function Reveal({ v, children }) {
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function PowerIcon({ color }) {
  return (
    <View style={styles.powerBox}>
      <View style={[styles.powerRing, { borderColor: color }]} />
      <View style={styles.powerGap} />
      <View style={[styles.powerBar, { backgroundColor: color }]} />
    </View>
  );
}

function CheckBadge({ state }) {
  if (!state) return null;
  const map = {
    testing: { t: '…', c: C.lime },
    ok: { t: '✓', c: C.neon },
    fail: { t: '✕', c: C.danger },
  };
  const m = map[state];
  return (
    <View style={[styles.badge, { borderColor: m.c }]}>
      <Text style={[styles.badgeTxt, { color: m.c }]}>{m.t}</Text>
    </View>
  );
}

function MiniButton({ label, onPress, color, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(57,255,20,0.2)' }}
      style={({ pressed }) => [
        styles.mini,
        { borderColor: color || C.neonDim, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.miniTxt, { color: color || C.neon }]}>{label}</Text>
    </Pressable>
  );
}

// ─────────────────────────── برنامه ───────────────────────────

export default function App() {
  // وضعیت اتصال
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | failed | disconnecting
  const [message, setMessage] = useState('برای اتصال، دکمه را لمس کنید');
  const [activeDns, setActiveDns] = useState([]);

  // تنظیمات DNS
  const [dnsId, setDnsId] = useState('google');
  const [customPrimary, setCustomPrimary] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');

  // برنامه‌های سفارشی
  const [apps, setApps] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [formError, setFormError] = useState('');
  const [checks, setChecks] = useState({});

  const [loaded, setLoaded] = useState(false);

  const busyRef = useRef(false);
  const statusRef = useRef('idle');
  const rawPrefsRef = useRef({});

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── انیمیشن‌ها ──
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const intensity = useRef(new Animated.Value(0.35)).current;
  const press = useRef(new Animated.Value(1)).current;
  const msgAnim = useRef(new Animated.Value(1)).current;
  const reveals = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      90,
      reveals.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [reveals]);

  const active = status === 'connected' || status === 'connecting' || status === 'disconnecting';
  const working = status === 'connecting' || status === 'disconnecting';

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: active ? 1900 : 3600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    Animated.timing(intensity, {
      toValue: active ? 1 : 0.35,
      duration: 400,
      useNativeDriver: true,
    }).start();
    return () => loop.stop();
  }, [active, pulse, intensity]);

  useEffect(() => {
    if (!working) return undefined;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [working, spin]);

  useEffect(() => {
    msgAnim.setValue(0);
    Animated.timing(msgAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [message, status, msgAnim]);

  const scaleA = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opA = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const scaleB = pulse.interpolate({
    inputRange: [0, 0.5, 0.5001, 1],
    outputRange: [1.3, 1.6, 1, 1.3],
  });
  const opB = pulse.interpolate({
    inputRange: [0, 0.5, 0.5001, 1],
    outputRange: [0.25, 0, 0.5, 0.25],
  });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const accent =
    status === 'failed' ? C.danger : status === 'connecting' || status === 'disconnecting' ? C.lime : C.neon;

  // ── بارگذاری و ذخیره ──
  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await readPrefs();
      rawPrefsRef.current = raw;
      const s = raw.abrino;
      if (alive && s && typeof s === 'object') {
        if (s.dnsId === 'custom' || PRESETS.some((p) => p.id === s.dnsId)) setDnsId(s.dnsId);
        if (typeof s.customPrimary === 'string') setCustomPrimary(s.customPrimary);
        if (typeof s.customSecondary === 'string') setCustomSecondary(s.customSecondary);
        if (Array.isArray(s.apps)) {
          const clean = s.apps
            .filter(
              (a) =>
                a &&
                typeof a.id === 'string' &&
                typeof a.name === 'string' &&
                typeof a.domain === 'string'
            )
            .slice(0, MAX_APPS);
          setApps(clean);
        }
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !DnsVpn || !DnsVpn.savePrefs) return;
    try {
      const next = {
        ...rawPrefsRef.current,
        abrino: { v: 1, dnsId, customPrimary, customSecondary, apps },
      };
      rawPrefsRef.current = next;
      DnsVpn.savePrefs(JSON.stringify(next));
    } catch (e) {}
  }, [loaded, dnsId, customPrimary, customSecondary, apps]);

  // ── همگام‌سازی وضعیت با سرویس واقعی ──
  const syncState = useCallback(async () => {
    if (!DnsVpn || !DnsVpn.isRunning) return;
    try {
      const running = !!(await DnsVpn.isRunning());
      if (busyRef.current) return;
      if (running && statusRef.current !== 'connected') {
        setStatus('connected');
        setMessage('اتصال فعال است');
      } else if (!running && statusRef.current === 'connected') {
        setStatus('idle');
        setMessage('اتصال قطع شد');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    syncState();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') syncState();
    });
    const t = setInterval(syncState, 5000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, [syncState]);

  // ── اتصال / قطع ──
  const connect = useCallback(async () => {
    if (busyRef.current) return;
    if (!DnsVpn || !DnsVpn.start) {
      setStatus('failed');
      setMessage('ماژول DNS/VPN در این نسخه موجود نیست');
      return;
    }
    const built = buildDnsList(dnsId, customPrimary, customSecondary);
    if (built.error) {
      setStatus('failed');
      setMessage(built.error);
      return;
    }
    busyRef.current = true;
    setStatus('connecting');
    setMessage('در حال برقراری اتصال…');
    try {
      await DnsVpn.start(built.list);
      const ok = await waitForRunning(true, 4000);
      if (ok) {
        setActiveDns(built.list);
        setStatus('connected');
        setMessage('DNS با موفقیت فعال شد');
      } else {
        setStatus('failed');
        setMessage('سرویس VPN راه‌اندازی نشد. دوباره تلاش کنید');
      }
    } catch (e) {
      const code = e && e.code;
      setStatus('failed');
      setMessage(
        code === 'DENIED'
          ? 'مجوز VPN داده نشد. برای اتصال باید آن را تأیید کنید'
          : code === 'NO_DNS'
          ? 'آدرس DNS وارد نشده است'
          : code === 'NO_ACTIVITY'
          ? 'برنامه را باز نگه دارید و دوباره تلاش کنید'
          : 'اتصال ناموفق بود'
      );
    } finally {
      busyRef.current = false;
    }
  }, [dnsId, customPrimary, customSecondary]);

  const disconnect = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('disconnecting');
    setMessage('در حال قطع اتصال…');
    try {
      await DnsVpn.stop();
      const stopped = await waitForRunning(false, 3000);
      if (stopped) {
        setStatus('idle');
        setMessage('اتصال قطع شد');
      } else {
        setStatus('connected');
        setMessage('قطع اتصال کامل نشد. دوباره تلاش کنید');
      }
    } catch (e) {
      setStatus('connected');
      setMessage('قطع اتصال ناموفق بود');
    } finally {
      busyRef.current = false;
    }
  }, []);

  const onToggle = useCallback(() => {
    if (busyRef.current) return;
    if (statusRef.current === 'connected') disconnect();
    else connect();
  }, [connect, disconnect]);

  const pressIn = () =>
    Animated.spring(press, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();

  // ── تلگرام ──
  const openTelegram = useCallback(async () => {
    if (!TELEGRAM_USERNAME || TELEGRAM_USERNAME === 'YOUR_TELEGRAM_USERNAME') {
      Alert.alert('تلگرام', 'نام کاربری تلگرام در ابتدای فایل App.js تنظیم نشده است.');
      return;
    }
    try {
      await Linking.openURL('https://t.me/' + TELEGRAM_USERNAME);
    } catch (e) {
      Alert.alert('تلگرام', 'باز کردن تلگرام ممکن نشد.');
    }
  }, []);

  // ── تست دسترسی دامنه‌ها ──
  const runCheck = useCallback(async (key, domain) => {
    setChecks((c) => ({ ...c, [key]: 'testing' }));
    const ok = await checkDomain(domain);
    setChecks((c) => ({ ...c, [key]: ok ? 'ok' : 'fail' }));
  }, []);

  const runPubgAll = useCallback(() => {
    PUBG_DOMAINS.forEach((d) => runCheck('pubg:' + d, d));
  }, [runCheck]);

  // ── افزودن / حذف برنامه ──
  const addApp = useCallback(() => {
    const name = newName.trim();
    const domain = normalizeDomain(newDomain);
    if (!name) return setFormError('نام برنامه را وارد کنید');
    if (name.length > 24) return setFormError('نام برنامه حداکثر ۲۴ کاراکتر باشد');
    if (!DOMAIN_RE.test(domain)) return setFormError('دامنه نامعتبر است، مثال: example.com');
    if (apps.length >= MAX_APPS) return setFormError('حداکثر ' + MAX_APPS + ' برنامه قابل افزودن است');
    if (apps.some((a) => a.domain === domain) || PUBG_DOMAINS.includes(domain))
      return setFormError('این دامنه قبلاً اضافه شده است');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setApps((prev) => [
      ...prev,
      { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, domain },
    ]);
    setNewName('');
    setNewDomain('');
    setFormError('');
    Keyboard.dismiss();
  }, [newName, newDomain, apps]);

  const removeApp = useCallback((item) => {
    Alert.alert('حذف برنامه', '«' + item.name + '» حذف شود؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setApps((prev) => prev.filter((a) => a.id !== item.id));
          setChecks((c) => {
            const n = { ...c };
            delete n['app:' + item.id];
            return n;
          });
        },
      },
    ]);
  }, []);

  const selectDns = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDnsId(id);
  }, []);

  const locked = status === 'connected' || working;
  const titleMap = {
    idle: 'قطع',
    connecting: 'در حال اتصال',
    connected: 'متصل',
    failed: 'ناموفق',
    disconnecting: 'در حال قطع',
  };

  const dnsPreview = useMemo(() => {
    if (status === 'connected' && activeDns.length) return activeDns.join('  •  ');
    const b = buildDnsList(dnsId, customPrimary, customSecondary);
    return b.list ? b.list.join('  •  ') : '';
  }, [status, activeDns, dnsId, customPrimary, customSecondary]);

  const pubgOk = PUBG_DOMAINS.filter((d) => checks['pubg:' + d] === 'ok').length;
  const pubgDone = PUBG_DOMAINS.every((d) => checks['pubg:' + d] === 'ok' || checks['pubg:' + d] === 'fail');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── هدر / لوگو ── */}
          <Reveal v={reveals[0]}>
            <Pressable
              onPress={openTelegram}
              android_ripple={{ color: 'rgba(57,255,20,0.15)', borderless: false }}
              style={styles.header}
            >
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkTxt}>A</Text>
              </View>
              <View style={styles.headerTxt}>
                <Text style={styles.brand}>
                  Abrino<Text style={styles.brandAccent}>DNS</Text>
                </Text>
                <Text style={styles.tag}>کانال تلگرام را باز کنید</Text>
              </View>
              <View style={styles.tgPill}>
                <Text style={styles.tgPillTxt}>Telegram</Text>
              </View>
            </Pressable>
          </Reveal>

          {!DnsVpn && (
            <View style={styles.warn}>
              <Text style={styles.warnTxt}>
                ماژول DnsVpn در این بیلد پیدا نشد؛ اتصال فقط در APK ساخته‌شده با فایل‌های بومی پروژه کار می‌کند.
              </Text>
            </View>
          )}

          {/* ── دکمه اتصال ── */}
          <Reveal v={reveals[1]}>
            <View style={styles.hero}>
              <View style={styles.btnWrap}>
                <Animated.View style={[styles.ringLayer, { opacity: intensity }]} pointerEvents="none">
                  <View style={[styles.halo, { backgroundColor: accent }]} />
                  <Animated.View
                    style={[styles.ring, { borderColor: accent, opacity: opA, transform: [{ scale: scaleA }] }]}
                  />
                  <Animated.View
                    style={[styles.ring, { borderColor: accent, opacity: opB, transform: [{ scale: scaleB }] }]}
                  />
                </Animated.View>

                <Pressable
                  onPress={onToggle}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  disabled={working}
                  accessibilityRole="button"
                  accessibilityLabel={status === 'connected' ? 'قطع اتصال' : 'اتصال'}
                >
                  <Animated.View
                    style={[
                      styles.btn,
                      {
                        borderColor: accent,
                        shadowColor: accent,
                        transform: [{ scale: press }],
                      },
                    ]}
                  >
                    {working && (
                      <Animated.View
                        style={[styles.spinner, { borderTopColor: accent, transform: [{ rotate: rotate }] }]}
                      />
                    )}
                    <PowerIcon color={accent} />
                  </Animated.View>
                </Pressable>
              </View>

              <Text style={[styles.stateTitle, { color: accent }]}>{titleMap[status]}</Text>
              <Animated.View
                style={[
                  styles.msgRow,
                  {
                    opacity: msgAnim,
                    transform: [
                      { translateY: msgAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
                    ],
                  },
                ]}
              >
                {(status === 'connected' || status === 'failed') && (
                  <View style={[styles.resultDot, { backgroundColor: accent }]}>
                    <Text style={styles.resultDotTxt}>{status === 'connected' ? '✓' : '✕'}</Text>
                  </View>
                )}
                <Text style={styles.msg}>{message}</Text>
              </Animated.View>
              {!!dnsPreview && <Text style={styles.dnsLine}>{dnsPreview}</Text>}
            </View>
          </Reveal>

          {/* ── انتخاب DNS ── */}
          <Reveal v={reveals[2]}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>سرور DNS</Text>
              <View style={[styles.chips, locked && styles.dim]} pointerEvents={locked ? 'none' : 'auto'}>
                {PRESETS.concat([{ id: 'custom', name: 'دلخواه' }]).map((p) => {
                  const sel = dnsId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => selectDns(p.id)}
                      style={[styles.chip, sel && styles.chipSel]}
                    >
                      <Text style={[styles.chipTxt, sel && styles.chipTxtSel]}>{p.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {dnsId === 'custom' && (
                <View style={[styles.customBox, locked && styles.dim]}>
                  <TextInput
                    value={customPrimary}
                    onChangeText={setCustomPrimary}
                    editable={!locked}
                    placeholder="DNS اصلی  مثال: 8.8.8.8"
                    placeholderTextColor={C.muted}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  <TextInput
                    value={customSecondary}
                    onChangeText={setCustomSecondary}
                    editable={!locked}
                    placeholder="DNS دوم (اختیاری)"
                    placeholderTextColor={C.muted}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              )}
              {locked && <Text style={styles.hint}>برای تغییر DNS ابتدا اتصال را قطع کنید</Text>}
            </View>
          </Reveal>

          {/* ── PUBG + برنامه‌ها ── */}
          <Reveal v={reveals[3]}>
            <View style={[styles.card, styles.pubgCard]}>
              <View style={styles.rowBetween}>
                <MiniButton label="تست دامنه‌ها" onPress={runPubgAll} />
                <View style={styles.pubgHead}>
                  <Text style={styles.cardTitle}>PUBG Mobile</Text>
                  <Text style={styles.pubgSub}>
                    {pubgDone ? pubgOk + ' از ' + PUBG_DOMAINS.length + ' دامنه در دسترس' : 'بخش اختصاصی بازی'}
                  </Text>
                </View>
              </View>
              {PUBG_DOMAINS.map((d) => (
                <View key={d} style={styles.row}>
                  <CheckBadge state={checks['pubg:' + d]} />
                  <Text style={styles.domain}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>برنامه‌های من</Text>

              <TextInput
                value={newName}
                onChangeText={(t) => {
                  setNewName(t);
                  if (formError) setFormError('');
                }}
                placeholder="نام برنامه"
                placeholderTextColor={C.muted}
                maxLength={24}
                style={styles.input}
              />
              <TextInput
                value={newDomain}
                onChangeText={(t) => {
                  setNewDomain(t);
                  if (formError) setFormError('');
                }}
                placeholder="دامنه  مثال: example.com"
                placeholderTextColor={C.muted}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={addApp}
                style={[styles.input, styles.inputLtr]}
              />
              {!!formError && <Text style={styles.error}>{formError}</Text>}
              <Pressable
                onPress={addApp}
                android_ripple={{ color: 'rgba(0,0,0,0.2)' }}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.addBtnTxt}>افزودن برنامه</Text>
              </Pressable>

              {apps.length === 0 ? (
                <Text style={styles.empty}>هنوز برنامه‌ای اضافه نکرده‌اید. نام و دامنه را وارد کنید.</Text>
              ) : (
                apps.map((a) => (
                  <View key={a.id} style={styles.appRow}>
                    <View style={styles.appActions}>
                      <CheckBadge state={checks['app:' + a.id]} />
                      <MiniButton label="تست" onPress={() => runCheck('app:' + a.id, a.domain)} />
                      <MiniButton label="حذف" color={C.danger} onPress={() => removeApp(a)} />
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appName} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text style={styles.domainSmall} numberOfLines={1}>
                        {a.domain}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Reveal>

          <Text style={styles.footer}>AbrinoDNS</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────── استایل‌ها ───────────────────────────

const BTN = 168;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: C.bg },
  scroll: {
    paddingTop: (StatusBar.currentHeight || 28) + 10,
    paddingHorizontal: 16,
    paddingBottom: 56,
  },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.neon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.neon,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  logoMarkTxt: { color: '#031004', fontSize: 24, fontWeight: '900' },
  headerTxt: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  brand: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.4 },
  brandAccent: { color: C.neon },
  tag: { color: C.muted, fontSize: 11, marginTop: 1, writingDirection: 'rtl' },
  tgPill: {
    borderWidth: 1,
    borderColor: C.neonDim,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(57,255,20,0.07)',
  },
  tgPillTxt: { color: C.neon, fontSize: 12, fontWeight: '700' },

  warn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger,
    backgroundColor: 'rgba(255,59,92,0.08)',
  },
  warnTxt: { color: C.danger, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', lineHeight: 19 },

  hero: { alignItems: 'center', paddingTop: 22, paddingBottom: 14 },
  btnWrap: { width: 270, height: 270, alignItems: 'center', justifyContent: 'center' },
  ringLayer: {
    position: 'absolute',
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', width: BTN + 70, height: BTN + 70, borderRadius: (BTN + 70) / 2, opacity: 0.1 },
  ring: {
    position: 'absolute',
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 2,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 3,
    backgroundColor: C.btnBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 22,
  },
  spinner: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: BTN - 22,
    height: BTN - 22,
    borderRadius: (BTN - 22) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  powerBox: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  powerRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 5 },
  powerGap: { position: 'absolute', top: -2, width: 22, height: 24, backgroundColor: C.btnBg },
  powerBar: { position: 'absolute', top: 0, width: 5, height: 30, borderRadius: 3 },

  stateTitle: { fontSize: 26, fontWeight: '900', marginTop: 2, letterSpacing: 0.5 },
  msgRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 8, paddingHorizontal: 12 },
  resultDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  resultDotTxt: { color: '#031004', fontSize: 12, fontWeight: '900' },
  msg: { color: C.text, fontSize: 14, textAlign: 'center', writingDirection: 'rtl', flexShrink: 1 },
  dnsLine: { color: C.muted, fontSize: 12, marginTop: 8, letterSpacing: 0.4 },

  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  pubgCard: { borderColor: C.neonDim, backgroundColor: C.cardHi },
  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  pubgHead: { alignItems: 'flex-end', flex: 1 },
  pubgSub: { color: C.muted, fontSize: 12, marginTop: -6, marginBottom: 8, writingDirection: 'rtl' },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },

  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
    marginBottom: 8,
    backgroundColor: '#060D07',
  },
  chipSel: {
    borderColor: C.neon,
    backgroundColor: 'rgba(57,255,20,0.12)',
  },
  chipTxt: { color: C.muted, fontSize: 13, fontWeight: '600' },
  chipTxtSel: { color: C.neon },
  customBox: { marginTop: 2 },
  dim: { opacity: 0.45 },
  hint: { color: C.muted, fontSize: 11, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },

  input: {
    backgroundColor: '#050B06',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    color: C.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 8,
  },
  inputLtr: { textAlign: 'left' },
  error: { color: C.danger, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginBottom: 8 },
  addBtn: {
    backgroundColor: C.neon,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: C.neon,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  addBtnTxt: { color: '#031004', fontSize: 15, fontWeight: '900' },
  empty: { color: C.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 8 },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  domain: { color: C.text, fontSize: 14, flex: 1, textAlign: 'right', marginRight: 10 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    marginTop: 4,
  },
  appInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 8 },
  appName: { color: C.text, fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  domainSmall: { color: C.muted, fontSize: 12, marginTop: 2 },
  appActions: { flexDirection: 'row', alignItems: 'center' },

  mini: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 6,
  },
  miniTxt: { fontSize: 12, fontWeight: '800' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { fontSize: 13, fontWeight: '900' },

  footer: { color: C.neonDim, textAlign: 'center', fontSize: 11, marginTop: 22, letterSpacing: 2 },
});
