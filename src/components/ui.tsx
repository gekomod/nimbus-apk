// Shared UI primitives for Nimbus
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { C, FONTS } from '../tokens';

// ── Animated counter ──────────────────────────────────────────────────────────
export function useCount(target: number, dur = 700) {
  const [n, setN] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current, to = target, t0 = Date.now();
    let raf: any;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const cur = from + (to - from) * e;
      ref.current = cur; setN(cur);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, pad = 16 }: any) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.75} style={[styles.card, { padding: pad }, style]}>
      {children}
    </Wrap>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export function SectionTitle({ children, action, onAction }: any) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionText}>{children}</Text>
      {action && <Text onPress={onAction} style={styles.sectionAction}>{action}</Text>}
    </View>
  );
}

// ── Donut Ring ────────────────────────────────────────────────────────────────
export function Ring({ value, size = 92, sw = 9, color = C.accent, label, sub }: any) {
  const v = useCount(value);
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, v) / 100);
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={C.track} strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: FONTS.monobold, fontSize: size > 80 ? 22 : 17, color: C.text }}>
          {label != null ? label : Math.round(v)}
        </Text>
        {sub && <Text style={{ fontSize: 10, color: C.textFaint, marginTop: 1 }}>{sub}</Text>}
      </View>
    </View>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────
export function Bar({ value, color = C.accent, h = 8 }: any) {
  const v = useCount(value);
  const pct = Math.min(100, v);
  return (
    <View style={{ height: h, backgroundColor: C.track, borderRadius: 99, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: 99 }} />
    </View>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
const PILL_TONE: Record<string, [string, string]> = {
  ok:      [C.ok,      C.okDim],
  warn:    [C.warn,    C.warnDim],
  danger:  [C.danger,  C.dangerDim],
  accent:  [C.accent,  C.accentDim],
  neutral: [C.textDim, 'rgba(255,255,255,0.06)'],
};

export function Pill({ children, tone = 'neutral' }: any) {
  const [fg, bg] = PILL_TONE[tone] || PILL_TONE.neutral;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: bg }}>
      {typeof children === 'string'
        ? <Text style={{ fontFamily: FONTS.monobold, fontSize: 11.5, color: fg, letterSpacing: 0.3 }}>{children}</Text>
        : children}
    </View>
  );
}

// ── Dot ───────────────────────────────────────────────────────────────────────
export function Dot({ tone = 'ok', pulse = false }: any) {
  const c = { ok: C.ok, warn: C.warn, danger: C.danger, off: C.textFaint }[tone as string] || C.ok;
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.3, duration: 850, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, opacity: pulse ? anim : 1 }} />
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange }: any) {
  return (
    <TouchableOpacity onPress={() => onChange?.(!on)} activeOpacity={0.8}
      style={{ width: 46, height: 28, borderRadius: 99, backgroundColor: on ? C.accent : C.surface3, justifyContent: 'center' }}>
      <View style={{
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
        position: 'absolute', left: on ? 21 : 3,
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      }} />
    </TouchableOpacity>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
export function Spark({ data, color = C.accent, h = 46, w = 300 }: any) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), rng = max - min || 1;
  const pts = data.map((d: number, i: number) => [
    (i / (data.length - 1)) * w,
    h - ((d - min) / rng) * (h - 6) - 3,
  ]);
  const line = pts.map((p: number[], i: number) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#sg)" />
      <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
const ROW_TONE: Record<string, [string, string]> = {
  accent:  [C.accent,  C.accentDim],
  ok:      [C.ok,      C.okDim],
  warn:    [C.warn,    C.warnDim],
  danger:  [C.danger,  C.dangerDim],
  neutral: [C.textDim, 'rgba(255,255,255,0.05)'],
};

export function Row({ icon, iconTone = 'accent', title, sub, trailing, onPress, mono }: any) {
  const [fg, bg] = ROW_TONE[iconTone] || ROW_TONE.accent;
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11 }}>
      {icon !== undefined && (
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <NbIcon name={icon} size={19} color={fg} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: FONTS.semibold, fontSize: 15, color: C.text }} numberOfLines={1}>{title}</Text>
        {sub != null && <Text style={{ fontFamily: mono ? FONTS.mono : FONTS.regular, fontSize: 12.5, color: C.textDim, marginTop: 1 }} numberOfLines={1}>{sub}</Text>}
      </View>
      {trailing}
    </Wrap>
  );
}

// ── Icon (SVG paths from ICONS map) ──────────────────────────────────────────
const PATHS: Record<string, string[]> = {
  gauge:        ['M12 14.5 16 9', 'M3.34 18a10 10 0 1 1 17.32 0'],
  dashboard:    ['M3 3h7v9H3z', 'M14 3h7v5H14z', 'M14 12h7v9H14z', 'M3 16h7v5H3z'],
  hdd:          ['M22 12H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'],
  box:          ['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', 'm3.3 7 8.7 5 8.7-5', 'M12 22V12'],
  globe:        ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
  shield_check: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
  shield:       ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  battery:      ['M2 9h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H2V9z', 'M22 11v2'],
  cpu:          ['M4 4h16v16H4z', 'M9 9h6v6H9z', 'M15 2v2', 'M15 20v2', 'M2 15h2', 'M2 9h2', 'M20 15h2', 'M20 9h2', 'M9 2v2', 'M9 20v2'],
  activity:     ['M22 12h-4l-3 9L9 3l-3 9H2'],
  file:         ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  users:        ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  bell:         ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  settings:     ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  server:       ['M2 2h20v8H2z', 'M2 14h20v8H2z', 'M6 6h.01', 'M6 18h.01'],
  grid:         ['M3 3h7v7H3z', 'M14 3h7v7H14z', 'M14 14h7v7H14z', 'M3 14h7v7H3z'],
  chevron_right:['m9 18 6-6-6-6'],
  chevron_left: ['m15 18-6-6 6-6'],
  arrow_left:   ['m12 19-7-7 7-7', 'M19 12H5'],
  arrow_up:     ['m5 12 7-7 7 7', 'M12 19V5'],
  arrow_down:   ['M12 5v14', 'm19 12-7 7-7-7'],
  fingerprint:  ['M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4', 'M14 13.12c0 2.38 0 6.38-1 8.88', 'M17.29 21.02c.12-.6.43-2.3.5-3.02', 'M2 12a10 10 0 0 1 18-6', 'M2 16h.01', 'M21.8 16c.2-2 .131-5.354 0-6', 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2', 'M8.65 22c.21-.66.45-1.32.57-2', 'M9 6.8a6 6 0 0 1 9 5.2v2'],
  lock:         ['M3 11h18v11H3z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  user:         ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  eye:          ['M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  eye_off:      ['M10.73 5.08a10.74 10.74 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49', 'M14.08 14.16a3 3 0 0 1-4.24-4.24', 'M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14', 'm2 2 20 20'],
  check:        ['M20 6 9 17l-5-5'],
  x:            ['M18 6 6 18', 'm6 6 12 12'],
  alert:        ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z', 'M12 9v4', 'M12 17h.01'],
  power:        ['M12 2v10', 'M18.4 6.6a9 9 0 1 1-12.77.04'],
  refresh:      ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M3 21v-5h5'],
  search:       ['M21 21l-4.3-4.3'],
  plus:         ['M5 12h14', 'M12 5v14'],
  trash:        ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  terminal:     ['m4 17 6-6-6-6', 'M12 19h8'],
  thermometer:  ['M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z'],
  zap:          ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
  database:     ['M12 2a9 3 0 1 0 0 6 9 3 0 0 0 0-6z', 'M3 5v14a9 3 0 0 0 18 0V5', 'M3 12a9 3 0 0 0 18 0'],
  clock:        ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
  cloud:        ['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'],
  logout:       ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  film:         ['M3 3h18v18H3z', 'M7 3v18', 'M17 3v18', 'M3 7.5h4', 'M17 7.5h4', 'M3 12h18', 'M3 16.5h4', 'M17 16.5h4'],
  music:        ['M9 18V5l12-2v13', 'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  scan:         ['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2', 'M7 12h10'],
  key:          ['m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L21 5', 'm21 2-9.6 9.6', 'M7.5 10a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z'],
  download:     ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
};

export function NbIcon({ name, size = 22, color = C.text, stroke = 1.8 }: {
  name: string; size?: number; color?: string; stroke?: number;
}) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}

// ── PrimaryBtn ─────────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onPress, loading = false, done = false, style }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading || done} activeOpacity={0.8}
      style={[styles.primaryBtn, { backgroundColor: done ? C.ok : C.accent }, style]}>
      {loading
        ? <Spinner />
        : done
          ? <NbIcon name="check" size={22} color="#08111c" stroke={2.6} />
          : <Text style={styles.primaryBtnText}>{children}</Text>}
    </TouchableOpacity>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 19, color = C.text }: any) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.linear })).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }], borderRadius: size / 2,
      borderWidth: 2.5, borderColor: color, borderRightColor: 'transparent', opacity: 0.9 }} />
  );
}

// ── ModuleHeader ──────────────────────────────────────────────────────────────
export function ModuleHeader({ title, onBack, action }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingBottom: 14, paddingTop: onBack ? 6 : 14 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}
          style={{ width: 40, height: 40, marginLeft: -8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <NbIcon name="arrow_left" size={22} />
        </TouchableOpacity>
      )}
      <Text style={{ flex: 1, fontFamily: FONTS.extrabold, fontSize: onBack ? 21 : 26, color: C.text, letterSpacing: -0.5 }}>
        {title}
      </Text>
      {action}
    </View>
  );
}

// ── GhostBtn ──────────────────────────────────────────────────────────────────
export function GhostBtn({ children, onPress, style }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[{ height: 54, borderRadius: 14, backgroundColor: C.surface2, borderWidth: 1.5,
        borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }, style]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
    marginHorizontal: 2,
  },
  sectionText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.textFaint,
  },
  sectionAction: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: C.accent,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16.5,
    color: '#08111c',
    letterSpacing: 0.2,
  },
});
