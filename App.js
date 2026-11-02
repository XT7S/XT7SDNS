import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  NativeModules,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { DnsVpn } = NativeModules;

const C = {
  bg: '#07090D',
  panel: '#0F141C',
  panel2: '#151C27',
  line: '#232C3A',
  accent: '#FFB300',
  accentDim: '#7A5600',
  ok: '#39FF14',
  bad: '#FF3B3B',
  text: '#E8EDF5',
  mute: '#7D8899',
};

const PRESETS = [
  { id: 'google', name: 'Google', v4: ['8.8.8.8', '8.8.4.4'], v6: ['2001:4860:4860::8888', '2001:4860:4860::8844'] },
  { id: 'cloudflare', name: 'Cloudflare', v4: ['1.1.1.1', '1.0.0.1'], v6: ['2606:4700:4700::1111', '2606:4700:4700::1001'] },
  { id: 'quad9', name: 'Quad9', v4: ['9.9.9.9', '149.112.112.112'], v6: ['2620:fe::fe', '2620:fe::9'] },
  { id: 'shecan', name: 'شکن', v4: ['178.22.122.100', '185.51.200.2'], v6: ['', ''] },
  { id: 'electro', name: 'الکترو', v4: ['78.157.42.100', '78.157.42.101'], v6: ['', ''] },
  { id: 'radar', name: 'رادار', v4: ['10.202.10.10', '10.202.10.11'], v6: ['', ''] },
  { id: '403', name: '۴۰۳', v4: ['10.202.10.202', '10.202.10.102'], v6: ['', ''] },
];

const isV4 = (s) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);
const isV6 = (s) =>
  s.includes(':') &&
  /^[0-9a-fA-F:.]+$/.test(s) &&
  (s.match(/::/g) || []).length <= 1 &&
  s.split(':').length >= 3 &&
  s.split(':').length <= 8;

const pingColor = (ms) => (ms < 0 ? C.bad : ms < 50 ? C.ok : ms < 120 ? C.accent : '#FF7A00');

function Crosshair({ active, pulse }) {
  const col = active ? C.ok : C.accent;
  return (
    <View style={s.crossWrap} pointerEvents="none">
      <Animated.View
        style={[
          s.ring,
          { width: 270, height: 270, borderRadius: 135, borderColor: col, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] },
        ]}
      />
      <View style={[s.ring, { width: 220, height: 220, borderRadius: 110, borderColor: col, opacity: 0.25 }]} />
      <View style={[s.tick, { top: 0, height: 26, width: 2, backgroundColor: col }]} />
      <View style={[s.tick, { bottom: 0, height: 26, width: 2, backgroundColor: col }]} />
      <View style={[s.tick, { left: 0, width: 26, height: 2, backgroundColor: col }]} />
      <View style={[s.tick, { right: 0, width: 26, height: 2, backgroundColor: col }]} />
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, valid }) {
  const bad = value.length > 0 && !valid;
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#3C4657"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="visible-password"
        style={[s.input, bad && { borderColor: C.bad }]}
      />
    </View>
  );
}

export default function App() {
  const [v4a, setV4a] = useState('8.8.8.8');
  const [v4b, setV4b] = useState('8.8.4.4');
  const [v6a, setV6a] = useState('2001:4860:4860::8888');
  const [v6b, setV6b] = useState('2001:4860:4860::8844');
  const [useV6, setUseV6] = useState(true);
  const [preset, setPreset] = useState('google');
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pings, setPings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: on ? 900 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: on ? 900 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, [on, pulse]);

  // load saved settings + current state
  useEffect(() => {
    (async () => {
      if (!DnsVpn) return setLoaded(true);
      try {
        const raw = await DnsVpn.loadPrefs();
        if (raw) {
          const p = JSON.parse(raw);
          setV4a(p.v4a ?? ''); setV4b(p.v4b ?? ''); setV6a(p.v6a ?? ''); setV6b(p.v6b ?? '');
          setUseV6(p.useV6 ?? true); setPreset(p.preset ?? 'custom');
        }
        setOn(await DnsVpn.isRunning());
      } catch (e) {}
      setLoaded(true);
    })();
    const t = setInterval(() => DnsVpn && DnsVpn.isRunning().then(setOn).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loaded && DnsVpn) DnsVpn.savePrefs(JSON.stringify({ v4a, v4b, v6a, v6b, useV6, preset }));
  }, [loaded, v4a, v4b, v6a, v6b, useV6, preset]);

  const edit = (setter) => (v) => { setter(v.trim()); setPreset('custom'); };

  const applyPreset = (p) => {
    setPreset(p.id);
    setV4a(p.v4[0]); setV4b(p.v4[1]); setV6a(p.v6[0]); setV6b(p.v6[1]);
  };

  const buildList = () => {
    const list = [v4a, v4b].filter(isV4);
    if (useV6) list.push(...[v6a, v6b].filter(isV6));
    return list;
  };

  const toggle = useCallback(async () => {
    if (!DnsVpn) return setMsg('ماژول نیتیو پیدا نشد. این برنامه باید به‌صورت APK بیلد شود، با Expo Go کار نمی‌کند.');
    setBusy(true); setMsg('');
    try {
      if (on) {
        await DnsVpn.stop();
        setOn(false);
      } else {
        const list = buildList();
        if (list.length === 0) throw new Error('حداقل یک آدرس DNS معتبر وارد کن.');
        await DnsVpn.start(list);
        await new Promise((r) => setTimeout(r, 800));
        const running = await DnsVpn.isRunning();
        setOn(running);
        if (!running) setMsg('اتصال برقرار نشد. دوباره امتحان کن.');
      }
    } catch (e) {
      setMsg(e && e.code === 'DENIED' ? 'اجازه VPN داده نشد.' : (e && e.message) || 'خطا');
    }
    setBusy(false);
  }, [on, v4a, v4b, v6a, v6b, useV6]);

  const pingAll = async () => {
    if (!DnsVpn) return;
    setBusy(true); setPings([]);
    const list = [v4a, v4b, ...(useV6 ? [v6a, v6b] : [])].filter((a) => isV4(a) || isV6(a));
    const res = await Promise.all(list.map(async (a) => ({ a, ms: await DnsVpn.ping(a) })));
    setPings(res);
    setBusy(false);
  };

  const findBest = async () => {
    if (!DnsVpn) return;
    setBusy(true); setMsg('در حال تست سرورها...');
    const res = await Promise.all(PRESETS.map(async (p) => ({ p, ms: await DnsVpn.ping(p.v4[0]) })));
    const ok = res.filter((r) => r.ms >= 0).sort((x, y) => x.ms - y.ms);
    if (ok.length) {
      applyPreset(ok[0].p);
      setMsg(`بهترین: ${ok[0].p.name} (${ok[0].ms.toFixed(0)} ms)`);
    } else setMsg('هیچ سروری جواب نداد.');
    setBusy(false);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.title}>GAME<Text style={{ color: C.accent }}> DNS</Text></Text>
          <View style={[s.badge, { borderColor: on ? C.ok : C.line }]}>
            <View style={[s.dot, { backgroundColor: on ? C.ok : C.mute }]} />
            <Text style={[s.badgeText, { color: on ? C.ok : C.mute }]}>{on ? 'فعال' : 'غیرفعال'}</Text>
          </View>
        </View>
        <Text style={s.sub}>حالت PUBG · تغییر DNS با پشتیبانی IPv4 و IPv6</Text>

        <View style={s.hero}>
          <Crosshair active={on} pulse={pulse} />
          <TouchableOpacity activeOpacity={0.8} disabled={busy} onPress={toggle} style={[s.power, { borderColor: on ? C.ok : C.accent, shadowColor: on ? C.ok : C.accent }]}>
            <Text style={[s.powerIcon, { color: on ? C.ok : C.accent }]}>⏻</Text>
            <Text style={[s.powerText, { color: on ? C.ok : C.accent }]}>{busy ? '...' : on ? 'قطع' : 'اتصال'}</Text>
          </TouchableOpacity>
        </View>
        {!!msg && <Text style={s.msg}>{msg}</Text>}

        <Text style={s.section}>پریست‌ها</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => applyPreset(p)} style={[s.chip, preset === p.id && s.chipOn]}>
              <Text style={[s.chipText, preset === p.id && { color: '#000' }]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.card}>
          <Text style={s.cardTitle}>تنظیمات DNS · نسخه ۴</Text>
          <Field label="DNS 1" value={v4a} onChangeText={edit(setV4a)} placeholder="8.8.8.8" valid={isV4(v4a)} />
          <Field label="DNS 2" value={v4b} onChangeText={edit(setV4b)} placeholder="8.8.4.4" valid={isV4(v4b)} />
        </View>

        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.cardTitle}>تنظیمات DNS · نسخه ۶ (IPv6)</Text>
            <Switch value={useV6} onValueChange={setUseV6} trackColor={{ false: C.line, true: C.accentDim }} thumbColor={useV6 ? C.accent : C.mute} />
          </View>
          <View style={{ opacity: useV6 ? 1 : 0.35 }} pointerEvents={useV6 ? 'auto' : 'none'}>
            <Field label="DNS 1" value={v6a} onChangeText={edit(setV6a)} placeholder="2001:4860:4860::8888" valid={isV6(v6a)} />
            <Field label="DNS 2" value={v6b} onChangeText={edit(setV6b)} placeholder="2001:4860:4860::8844" valid={isV6(v6b)} />
          </View>
        </View>

        <View style={s.rowBetween}>
          <TouchableOpacity disabled={busy} onPress={pingAll} style={[s.btn, { flex: 1, marginRight: 8 }]}>
            <Text style={s.btnText}>تست پینگ</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={findBest} style={[s.btn, s.btnAccent, { flex: 1 }]}>
            <Text style={[s.btnText, { color: '#000' }]}>پیدا کردن بهترین</Text>
          </TouchableOpacity>
        </View>

        {pings.length > 0 && (
          <View style={s.card}>
            {pings.map((r) => (
              <View key={r.a} style={s.pingRow}>
                <Text style={[s.pingMs, { color: pingColor(r.ms) }]}>{r.ms < 0 ? 'timeout' : `${r.ms.toFixed(0)} ms`}</Text>
                <Text style={s.pingAddr}>{r.a}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.foot}>
          فقط درخواست‌های DNS از طریق VPN عبور می‌کنند؛ ترافیک بازی مستقیم می‌رود و سرعتش کم نمی‌شود.
        </Text>
      </ScrollView>
    </View>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' };

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 54, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  sub: { color: C.mute, marginTop: 4, fontSize: 12, ...rtl },
  badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  hero: { height: 300, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  crossWrap: { position: 'absolute', width: 270, height: 270, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2 },
  tick: { position: 'absolute' },
  power: { width: 150, height: 150, borderRadius: 75, borderWidth: 3, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.9, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, elevation: 14 },
  powerIcon: { fontSize: 44 },
  powerText: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  msg: { color: C.accent, marginBottom: 8, ...rtl, textAlign: 'center' },
  section: { color: C.mute, fontSize: 12, marginTop: 10, marginBottom: 4, ...rtl },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontWeight: '700' },
  card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginTop: 12 },
  cardTitle: { color: C.text, fontWeight: '800', marginBottom: 8, ...rtl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldWrap: { marginTop: 6 },
  label: { color: C.mute, fontSize: 11, marginBottom: 4 },
  input: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlign: 'left', writingDirection: 'ltr' },
  btn: { marginTop: 14, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnAccent: { backgroundColor: C.accent, borderColor: C.accent },
  btnText: { color: C.text, fontWeight: '800' },
  pingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  pingAddr: { color: C.text, fontSize: 13 },
  pingMs: { fontWeight: '800' },
  foot: { color: C.mute, fontSize: 11, marginTop: 18, lineHeight: 18, ...rtl },
});
