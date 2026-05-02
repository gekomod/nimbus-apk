import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import NasIcon from '../components/NasIcon';
import Btn from '../components/Btn';
import GridBg from '../components/GridBg';
import Spinner from '../components/Spinner';
import { C, FONTS } from '../tokens';

const DRAWER_W = 260;
const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ─────────────────────────────────────────────────────

type TabId = 'disks' | 'net' | 'files' | 'info';

interface Pool {
  name: string; type: string; total: number; used: number;
  avail: number; health: string; iops: number; read_mbps: number; write_mbps: number;
}
interface NetIface {
  Name: string; RxB: number; TxB: number; State: string;
  IP: string; MAC: string; Speed: string;
}
interface Overview {
  hostname: string; kernel: string; uptime_secs: number;
  cpu: { cores: string; freq_ghz: string; load: number[]; model: string; percent: number; temp: number };
  memory: { avail_gb: number; buffers_gb: number; cached_gb: number; percent: number;
            swap_total_gb: number; swap_used_gb: number; total_gb: number; used_gb: number };
}

// ── Helpers ───────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9)  return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6)  return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3)  return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}
function formatSize(gb: number): string {
  return gb >= 1000 ? `${(gb / 1000).toFixed(1)} TB` : `${gb.toFixed(0)} GB`;
}
function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function fmt(n: number, d = 2) { return n.toFixed(d); }

// ── Shared fetch helper ────────────────────────────────────────

async function apiFetch(serverUrl: string, path: string, userData: Record<string, string> | null) {
  const base = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl;
  const headers: Record<string, string> = {};
  if (userData?.token) headers['Authorization'] = `Bearer ${userData.token}`;
  return fetch(`${base.replace(/\/+$/, '')}${path}`, { headers, credentials: 'include' });
}

// ── LoadingView / ErrorView ────────────────────────────────────

function LoadingView({ text }: { text: string }) {
  return (
    <View style={s.center}>
      <Spinner size={28} color={C.accent} />
      <Text style={s.loadTxt}>{text}</Text>
    </View>
  );
}
function ErrorView({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.errTxt}>{msg}</Text>
      <TouchableOpacity onPress={onRetry} style={s.retryBtn}>
        <Text style={s.retryTxt}>Spróbuj ponownie</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Disks tab ─────────────────────────────────────────────────

function DisksTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [pools, setPools]   = useState<Pool[]>([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true); setError('');
    try {
      const res = await apiFetch(serverUrl, '/api/zfs/pools', userData);
      const json = await res.json();
      setPools(json.pools ?? []);
    } catch { setError('Nie można pobrać danych dysków'); }
    finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingView text="Ładowanie dysków…" />;
  if (error)   return <ErrorView msg={error} onRetry={fetch_} />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {pools.map(d => {
        const pct = d.total > 0 ? Math.round((d.used / d.total) * 100) : 0;
        const ok  = d.health === 'ok' || d.health === 'ONLINE';
        return (
          <View key={d.name} style={[s.card, !ok && s.cardWarn]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{d.name}</Text>
                <Text style={s.cardSub}>{d.type} · {formatSize(d.total)}</Text>
              </View>
              <View style={[s.badge, !ok && s.badgeWarn]}>
                <Text style={[s.badgeTxt, !ok && s.badgeTxtWarn]}>{ok ? 'OK' : d.health.toUpperCase()}</Text>
              </View>
            </View>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: pct > 80 ? C.yellow : C.accent }]} />
            </View>
            <View style={s.row}>
              <Text style={s.sub}>Użyte: {formatSize(d.used)} ({pct}%)</Text>
              <Text style={s.sub}>Wolne: {formatSize(d.avail)}</Text>
            </View>
            <View style={[s.row, s.ioBar]}>
              <Text style={s.ioTxt}>↓ {fmt(d.read_mbps)} MB/s</Text>
              <Text style={s.ioTxt}>↑ {fmt(d.write_mbps)} MB/s</Text>
              <Text style={s.ioTxt}>IOPS: {d.iops}</Text>
            </View>
          </View>
        );
      })}
      {pools.length === 0 && <Text style={[s.loadTxt, { marginTop: 24 }]}>Brak puli ZFS</Text>}
    </ScrollView>
  );
}

// ── Network tab ───────────────────────────────────────────────

function NetworkTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [hostname, setHost]  = useState('');
  const [ifaces, setIfaces]  = useState<NetIface[]>([]);
  const [loading, setLoad]   = useState(true);
  const [error, setError]    = useState('');
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true); setError('');
    try {
      const res = await apiFetch(serverUrl, '/api/network', userData);
      const json = await res.json();
      setHost(json.hostname ?? ''); setIfaces(json.interfaces ?? []);
    } catch { setError('Nie można pobrać danych sieciowych'); }
    finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingView text="Ładowanie sieci…" />;
  if (error)   return <ErrorView msg={error} onRetry={fetch_} />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {hostname ? (
        <View style={[s.row, s.hostRow]}>
          <Text style={s.hostLabel}>HOSTNAME</Text>
          <Text style={s.hostVal}>{hostname}</Text>
        </View>
      ) : null}
      {ifaces.map(iface => {
        const up = iface.State === 'up';
        return (
          <View key={iface.Name} style={[s.card, !up && { opacity: 0.55 }]}>
            <View style={s.row}>
              <View style={s.row}>
                <View style={[s.dot, { backgroundColor: up ? C.green : C.textMute }]} />
                <Text style={s.cardTitle}>{iface.Name}</Text>
                {iface.Speed ? (
                  <View style={s.speedBadge}><Text style={s.speedTxt}>{iface.Speed}</Text></View>
                ) : null}
              </View>
              <View style={[s.badge, !up && s.badgeDown]}>
                <Text style={[s.badgeTxt, !up && { color: C.textMute }]}>{iface.State.toUpperCase()}</Text>
              </View>
            </View>
            {(iface.IP || iface.MAC) ? (
              <View style={{ marginTop: 6 }}>
                {iface.IP ? <Text style={s.netMeta}>IP  {iface.IP}</Text> : null}
                {iface.MAC && iface.MAC !== '00:00:00:00:00:00'
                  ? <Text style={s.netMeta}>MAC  {iface.MAC}</Text> : null}
              </View>
            ) : null}
            {up && (iface.RxB > 0 || iface.TxB > 0) ? (
              <View style={[s.row, s.ioBar]}>
                <Text style={[s.ioTxt, { color: C.green }]}>↓ {formatBytes(iface.RxB)}</Text>
                <Text style={[s.ioTxt, { color: C.accent }]}>↑ {formatBytes(iface.TxB)}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Files tab ─────────────────────────────────────────────────

type FileEntry = { name: string; type: 'folder' | 'file'; size?: string; modified: string };
const MOCK_FILES: Record<string, FileEntry[]> = {
  '/': [
    { name: 'Dokumenty', type: 'folder', modified: '28 kwi' },
    { name: 'Zdjęcia',   type: 'folder', modified: '27 kwi' },
    { name: 'Multimedia',type: 'folder', modified: '20 kwi' },
    { name: 'Backup',    type: 'folder', modified: '15 kwi' },
    { name: 'README.txt',type: 'file',   size: '2 KB', modified: '1 kwi' },
  ],
  '/Dokumenty': [
    { name: 'Faktury 2024.pdf', type: 'file',   size: '1.2 MB', modified: '28 kwi' },
    { name: 'Umowy',            type: 'folder', modified: '15 mar' },
  ],
  '/Zdjęcia': [
    { name: 'Wakacje 2024', type: 'folder', modified: '5 sty' },
    { name: 'IMG_0042.jpg', type: 'file',   size: '4.1 MB', modified: '27 kwi' },
  ],
};
const FICONS: Record<string,string> = { pdf:'📄',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',mp4:'🎬',mp3:'🎵',zip:'🗜️',docx:'📝',txt:'📃',json:'📋' };

function FilesTab() {
  const [path, setPath] = useState('/');
  const files = MOCK_FILES[path] ?? MOCK_FILES['/'];
  function open(f: FileEntry) {
    if (f.type !== 'folder') return;
    const next = path === '/' ? '/' + f.name : path + '/' + f.name;
    if (MOCK_FILES[next]) setPath(next);
  }
  function goUp() {
    const parts = path.split('/').filter(Boolean); parts.pop();
    setPath(parts.length ? '/' + parts.join('/') : '/');
  }
  return (
    <ScrollView>
      <View style={[s.row, s.breadcrumb]}>
        <Text style={s.breadTxt}>{path}</Text>
        {path !== '/' && (
          <TouchableOpacity onPress={goUp} style={s.upBtn}><Text style={s.sub}>↑ Wyżej</Text></TouchableOpacity>
        )}
      </View>
      {files.map((f, i) => (
        <TouchableOpacity key={i} onPress={() => open(f)} activeOpacity={f.type === 'folder' ? 0.7 : 1} style={s.fileRow}>
          <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
            {f.type === 'folder' ? '📁' : (FICONS[f.name.split('.').pop()?.toLowerCase()??''] ?? '📄')}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
            <Text style={s.sub}>{[f.size, f.modified].filter(Boolean).join(' · ')}</Text>
          </View>
          {f.type === 'folder' && <Text style={{ color: C.textMute, fontSize: 16 }}>›</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Info tab ──────────────────────────────────────────────────

function StatBar({ pct, color = C.accent }: { pct: number; color?: string }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function InfoTab({ serverUrl, userData, onLogout }: {
  serverUrl: string; userData: Record<string, string> | null; onLogout: () => void;
}) {
  const [ov, setOv]        = useState<Overview | null>(null);
  const [loading, setLoad] = useState(true);
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    try {
      const res = await apiFetch(serverUrl, '/api/overview', userData);
      setOv(await res.json());
    } catch { /* show what we have */ }
    finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {loading && !ov ? (
        <LoadingView text="Ładowanie…" />
      ) : ov ? (
        <>
          {/* Uptime + hostname */}
          <View style={s.card}>
            <InfoRow k="Hostname" v={ov.hostname} />
            <InfoRow k="Uptime"   v={formatUptime(ov.uptime_secs)} />
            <InfoRow k="Kernel"   v={ov.kernel} mono />
          </View>

          {/* CPU */}
          <Text style={s.sectionLabel}>PROCESOR</Text>
          <View style={s.card}>
            <Text style={[s.sub, { marginBottom: 8 }]} numberOfLines={2}>{ov.cpu.model}</Text>
            <View style={s.row}>
              <Text style={s.sub}>{ov.cpu.cores} rdzenie · {ov.cpu.freq_ghz} GHz</Text>
              <Text style={[s.sub, { color: ov.cpu.percent > 80 ? C.red : C.accent }]}>{ov.cpu.percent.toFixed(1)}%</Text>
            </View>
            <StatBar pct={ov.cpu.percent} color={ov.cpu.percent > 80 ? C.red : C.accent} />
            <View style={[s.row, { marginTop: 8 }]}>
              <Text style={s.sub}>Temp: {ov.cpu.temp.toFixed(1)}°C</Text>
              <Text style={s.sub}>Load: {ov.cpu.load.map(l => l.toFixed(2)).join(' / ')}</Text>
            </View>
          </View>

          {/* Memory */}
          <Text style={s.sectionLabel}>PAMIĘĆ RAM</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.sub}>Użyte: {ov.memory.used_gb.toFixed(1)} / {ov.memory.total_gb.toFixed(1)} GB</Text>
              <Text style={[s.sub, { color: ov.memory.percent > 85 ? C.red : C.accent }]}>{ov.memory.percent.toFixed(0)}%</Text>
            </View>
            <StatBar pct={ov.memory.percent} color={ov.memory.percent > 85 ? C.red : C.accent} />
            <View style={[s.row, { marginTop: 8 }]}>
              <Text style={s.sub}>Dostępne: {ov.memory.avail_gb.toFixed(1)} GB</Text>
              <Text style={s.sub}>Cache: {ov.memory.cached_gb.toFixed(1)} GB</Text>
            </View>
          </View>

          {/* Swap */}
          {ov.memory.swap_total_gb > 0 && (
            <>
              <Text style={s.sectionLabel}>SWAP</Text>
              <View style={s.card}>
                <View style={s.row}>
                  <Text style={s.sub}>{ov.memory.swap_used_gb.toFixed(2)} / {ov.memory.swap_total_gb.toFixed(2)} GB</Text>
                  <Text style={s.sub}>{((ov.memory.swap_used_gb / ov.memory.swap_total_gb) * 100).toFixed(0)}%</Text>
                </View>
                <StatBar pct={(ov.memory.swap_used_gb / ov.memory.swap_total_gb) * 100} color={C.yellow} />
              </View>
            </>
          )}
        </>
      ) : null}

      {/* Server info */}
      <Text style={s.sectionLabel}>POŁĄCZENIE</Text>
      <View style={s.card}>
        <InfoRow k="Serwer"     v={serverUrl.replace(/^https?:\/\//, '')} mono />
        <InfoRow k="Użytkownik" v={userData?.username ?? 'admin'} />
        <InfoRow k="Status"     v="Online" />
      </View>

      <View style={{ marginTop: 4 }}>
        <Btn label="Wyloguj się" onPress={onLogout} variant="danger" />
      </View>
    </ScrollView>
  );
}

function InfoRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={[s.row, s.infoRow]}>
      <Text style={s.infoKey}>{k}</Text>
      <Text style={[s.infoVal, mono && { fontFamily: FONTS.mono }]} numberOfLines={1}>{v}</Text>
    </View>
  );
}

// ── Drawer ────────────────────────────────────────────────────

const NAV: { id: TabId; icon: string; label: string }[] = [
  { id: 'disks', icon: '💿', label: 'Dyski'  },
  { id: 'net',   icon: '🌐', label: 'Sieć'   },
  { id: 'files', icon: '📁', label: 'Pliki'  },
  { id: 'info',  icon: 'ℹ️', label: 'Info'   },
];

function Drawer({ open, activeTab, onSelect, onClose, serverUrl, username, onLogout }: {
  open: boolean; activeTab: TabId;
  onSelect: (id: TabId) => void; onClose: () => void;
  serverUrl: string; username: string; onLogout: () => void;
}) {
  const anim = useRef(new Animated.Value(-DRAWER_W)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(anim,  { toValue: 0,  tension: 80, friction: 14, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(anim,  { toValue: -DRAWER_W, tension: 80, friction: 14, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [open]);

  if (!visible) return null;

  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: opacAnim }]} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View style={[s.drawerPanel, { transform: [{ translateX: anim }] }]}>
        {/* Header */}
        <View style={s.drawerHeader}>
          <NasIcon size={32} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.drawerAppName}>Nimbus</Text>
            <Text style={s.drawerServer}>{display}</Text>
          </View>
        </View>

        <View style={s.drawerDivider} />

        {/* User chip */}
        <View style={s.drawerUserRow}>
          <View style={s.dot} />
          <Text style={s.drawerUser}>{username || 'admin'}</Text>
        </View>

        <View style={s.drawerDivider} />

        {/* Nav items */}
        {NAV.map(n => (
          <TouchableOpacity
            key={n.id}
            onPress={() => { onSelect(n.id); onClose(); }}
            style={[s.navItem, activeTab === n.id && s.navItemActive]}
          >
            <Text style={s.navIcon}>{n.icon}</Text>
            <Text style={[s.navLabel, activeTab === n.id && s.navLabelActive]}>{n.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />
        <View style={s.drawerDivider} />

        {/* Logout */}
        <TouchableOpacity onPress={() => { onClose(); onLogout(); }} style={s.drawerLogout}>
          <Text style={s.drawerLogoutTxt}>↩  Wyloguj się</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

const TAB_TITLES: Record<TabId, string> = {
  disks: 'Dyski', net: 'Sieć', files: 'Pliki', info: 'Info',
};

interface Props {
  serverUrl: string;
  userData: Record<string, string> | null;
  onLogout: () => void;
}

export default function HomeScreen({ serverUrl, userData, onLogout }: Props) {
  const [tab, setTab]       = useState<TabId>('disks');
  const [drawerOpen, setDrawer] = useState(false);
  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <View style={s.root}>
      <GridBg />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => setDrawer(true)} style={s.hamburger}>
          <Text style={s.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.pageTitle}>{TAB_TITLES[tab]}</Text>
          <Text style={s.serverAddr}>{display}</Text>
        </View>
        <View style={s.userBadge}>
          <Text style={s.userLabel}>{userData?.username || 'admin'}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Content */}
      <View style={s.content}>
        {tab === 'disks' && <DisksTab serverUrl={serverUrl} userData={userData} />}
        {tab === 'net'   && <NetworkTab serverUrl={serverUrl} userData={userData} />}
        {tab === 'files' && <FilesTab />}
        {tab === 'info'  && <InfoTab serverUrl={serverUrl} userData={userData} onLogout={onLogout} />}
      </View>

      {/* Drawer overlay */}
      <Drawer
        open={drawerOpen}
        activeTab={tab}
        onSelect={setTab}
        onClose={() => setDrawer(false)}
        serverUrl={serverUrl}
        username={userData?.username ?? ''}
        onLogout={onLogout}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: C.surface, marginBottom: 0 },

  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  hamburger:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  hamburgerIcon:{ color: C.textSub, fontSize: 18 },
  pageTitle:    { fontSize: 16, fontFamily: FONTS.bold, color: C.text, lineHeight: 20 },
  serverAddr:   { fontSize: 10, fontFamily: FONTS.mono, color: C.textMute },
  userBadge:    { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: 'rgba(49,170,64,0.3)' },
  userLabel:    { fontSize: 11, color: C.green, fontFamily: FONTS.semibold },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadTxt:   { color: C.textMute, fontFamily: FONTS.regular, fontSize: 13, marginTop: 12 },
  errTxt:    { color: C.red, fontFamily: FONTS.regular, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn:  { marginTop: 14, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  retryTxt:  { color: C.accent, fontFamily: FONTS.medium, fontSize: 13 },

  card:      { marginTop: 12, padding: 13, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  cardWarn:  { borderColor: 'rgba(244,149,0,0.35)' },
  cardTitle: { fontSize: 14, fontFamily: FONTS.bold, color: C.text, marginBottom: 2 },
  cardSub:   { fontSize: 11, fontFamily: FONTS.mono, color: C.textMute },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub:       { fontSize: 11, color: C.textMute, fontFamily: FONTS.regular },
  badge:     { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: 'rgba(49,170,64,0.3)' },
  badgeWarn: { backgroundColor: 'rgba(22,16,0,1)', borderColor: 'rgba(244,149,0,0.3)' },
  badgeDown: { backgroundColor: C.surface, borderColor: C.border },
  badgeTxt:  { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.7, color: C.green },
  badgeTxtWarn: { color: C.yellow },
  barTrack:  { height: 5, backgroundColor: 'rgba(24,32,40,1)', borderRadius: 3, overflow: 'hidden', marginVertical: 8 },
  barFill:   { height: '100%', borderRadius: 3 },
  ioBar:     { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },
  ioTxt:     { fontSize: 11, fontFamily: FONTS.mono, color: C.textSub },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginRight: 8 },

  // Network
  hostRow:   { marginTop: 12, padding: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  hostLabel: { fontSize: 10, fontFamily: FONTS.bold, color: C.textMute, letterSpacing: 1.0 },
  hostVal:   { fontSize: 13, fontFamily: FONTS.mono, color: C.accent },
  speedBadge:{ marginLeft: 8, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: C.accentBg, borderWidth: 1, borderColor: 'rgba(0,194,233,0.25)' },
  speedTxt:  { fontSize: 10, fontFamily: FONTS.mono, color: C.accent },
  netMeta:   { fontSize: 11, fontFamily: FONTS.mono, color: C.textSub, marginTop: 4 },

  // Files
  breadcrumb:{ marginTop: 12, padding: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  breadTxt:  { fontSize: 11, fontFamily: FONTS.mono, color: 'rgba(0,137,171,1)' },
  upBtn:     { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  fileRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  fileName:  { fontSize: 13, fontFamily: FONTS.medium, color: C.text },

  // Info
  sectionLabel: { fontSize: 10, fontFamily: FONTS.bold, color: C.textMute, letterSpacing: 1.2, marginTop: 16, marginBottom: 0, textTransform: 'uppercase' },
  infoRow:   { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.bg },
  infoKey:   { fontSize: 12, color: C.textMute, fontFamily: FONTS.semibold, textTransform: 'uppercase', letterSpacing: 0.7, flex: 1 },
  infoVal:   { fontSize: 12, color: C.textSub, fontFamily: FONTS.regular, flex: 2, textAlign: 'right' },

  // Drawer
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  drawerPanel:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W, backgroundColor: '#07101a', borderRightWidth: 1, borderRightColor: C.borderHi },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 24 },
  drawerAppName:{ fontSize: 18, fontFamily: FONTS.bold, color: C.text },
  drawerServer: { fontSize: 10, fontFamily: FONTS.mono, color: C.textMute },
  drawerDivider:{ height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  drawerUserRow:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  drawerUser:   { fontSize: 13, fontFamily: FONTS.medium, color: C.green },
  navItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  navItemActive:{ backgroundColor: C.accentBg, borderRightWidth: 3, borderRightColor: C.accent },
  navIcon:      { fontSize: 20, width: 28 },
  navLabel:     { fontSize: 15, fontFamily: FONTS.medium, color: C.textSub },
  navLabelActive:{ color: C.accent, fontFamily: FONTS.bold },
  drawerLogout: { padding: 20, paddingVertical: 16 },
  drawerLogoutTxt: { fontSize: 14, color: C.red, fontFamily: FONTS.medium },
});
