import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import NasIcon from '../components/NasIcon';
import Btn from '../components/Btn';
import GridBg from '../components/GridBg';
import Spinner from '../components/Spinner';
import { C, FONTS } from '../tokens';

// ── Types ─────────────────────────────────────────────────────

interface Pool {
  name: string;
  type: string;
  total: number;
  used: number;
  avail: number;
  health: string;
  iops: number;
  read_mbps: number;
  write_mbps: number;
}

// ── Helpers ───────────────────────────────────────────────────

function formatSize(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(0)} GB`;
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

// ── Mock file data (kept for Files tab) ───────────────────────

type FileEntry = { name: string; type: 'folder' | 'file'; size?: string; modified: string };

const MOCK_FILES: Record<string, FileEntry[]> = {
  '/': [
    { name: 'Dokumenty',  type: 'folder', modified: '28 kwi' },
    { name: 'Zdjęcia',    type: 'folder', modified: '27 kwi' },
    { name: 'Multimedia', type: 'folder', modified: '20 kwi' },
    { name: 'Backup',     type: 'folder', modified: '15 kwi' },
    { name: 'README.txt', type: 'file', size: '2 KB', modified: '1 kwi' },
  ],
  '/Dokumenty': [
    { name: 'Faktury 2024.pdf', type: 'file', size: '1.2 MB', modified: '28 kwi' },
    { name: 'Umowy',            type: 'folder', modified: '15 mar' },
    { name: 'Notatki.docx',     type: 'file', size: '340 KB', modified: '22 kwi' },
  ],
  '/Zdjęcia': [
    { name: 'Wakacje 2024', type: 'folder', modified: '5 sty' },
    { name: 'IMG_0042.jpg', type: 'file', size: '4.1 MB', modified: '27 kwi' },
    { name: 'IMG_0043.jpg', type: 'file', size: '3.8 MB', modified: '27 kwi' },
  ],
};

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
  mp4: '🎬', mp3: '🎵', zip: '🗜️', docx: '📝', txt: '📃', json: '📋',
};
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? '📄';
}

// ── Disks tab ─────────────────────────────────────────────────

function DisksTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [pools, setPools]       = useState<Pool[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [refreshing, setRefresh] = useState(false);

  const fetchPools = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    setError('');
    try {
      const base = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl;
      const headers: Record<string, string> = {};
      if (userData?.token) headers['Authorization'] = `Bearer ${userData.token}`;
      const res = await fetch(`${base.replace(/\/+$/, '')}/api/zfs/pools`, {
        headers,
        credentials: 'include',
      });
      const json = await res.json();
      setPools(json.pools ?? []);
    } catch {
      setError('Nie można pobrać danych z serwera');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [serverUrl, userData]);

  useEffect(() => { fetchPools(); }, [fetchPools]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Spinner size={28} color={C.accent} />
        <Text style={styles.loadingText}>Ładowanie dysków…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => fetchPools()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPools(true)} tintColor={C.accent} />}
    >
      {pools.map(d => {
        const usagePct = d.total > 0 ? Math.round((d.used / d.total) * 100) : 0;
        const isOk = d.health === 'ok' || d.health === 'ONLINE';
        const isWarn = !isOk;

        return (
          <View key={d.name} style={[styles.diskCard, isWarn && styles.diskCardWarning]}>
            <View style={styles.diskHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diskName}>{d.name}</Text>
                <Text style={styles.diskMeta}>{d.type} · {formatSize(d.total)}</Text>
              </View>
              <View style={[styles.statusBadge, isWarn && styles.statusBadgeWarn]}>
                <Text style={[styles.statusText, isWarn && styles.statusTextWarn]}>
                  {isOk ? 'OK' : d.health.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.barTrack}>
              <View style={[styles.barFill, {
                width: `${usagePct}%` as any,
                backgroundColor: usagePct > 80 ? C.yellow : C.accent,
              }]} />
            </View>
            <View style={styles.diskFooter}>
              <Text style={styles.diskStat}>Użyte: {formatSize(d.used)} ({usagePct}%)</Text>
              <Text style={styles.diskStat}>Wolne: {formatSize(d.avail)}</Text>
            </View>

            {/* I/O stats */}
            <View style={styles.ioRow}>
              <Text style={styles.ioStat}>↓ {fmt(d.read_mbps)} MB/s</Text>
              <Text style={styles.ioStat}>↑ {fmt(d.write_mbps)} MB/s</Text>
              <Text style={styles.ioStat}>IOPS: {d.iops}</Text>
            </View>
          </View>
        );
      })}
      {pools.length === 0 && (
        <Text style={[styles.loadingText, { marginTop: 20 }]}>Brak puli ZFS</Text>
      )}
    </ScrollView>
  );
}

// ── Files tab ─────────────────────────────────────────────────

function FilesTab() {
  const [path, setPath] = useState('/');
  const files = MOCK_FILES[path] ?? MOCK_FILES['/'];

  function openEntry(f: FileEntry) {
    if (f.type !== 'folder') return;
    const next = path === '/' ? '/' + f.name : path + '/' + f.name;
    if (MOCK_FILES[next]) setPath(next);
  }
  function goUp() {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    setPath(parts.length ? '/' + parts.join('/') : '/');
  }

  return (
    <>
      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>{path}</Text>
        {path !== '/' && (
          <TouchableOpacity onPress={goUp} style={styles.upBtn}>
            <Text style={styles.upBtnText}>↑ Wyżej</Text>
          </TouchableOpacity>
        )}
      </View>
      {files.map((f, i) => (
        <TouchableOpacity key={i} onPress={() => openEntry(f)} activeOpacity={f.type === 'folder' ? 0.7 : 1} style={styles.fileRow}>
          <Text style={styles.fileIcon}>{f.type === 'folder' ? '📁' : getFileIcon(f.name)}</Text>
          <View style={styles.fileMeta}>
            <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
            <Text style={styles.fileInfo}>{[f.size, f.modified].filter(Boolean).join(' · ')}</Text>
          </View>
          {f.type === 'folder' && <Text style={styles.chevron}>›</Text>}
        </TouchableOpacity>
      ))}
    </>
  );
}

// ── Info tab ──────────────────────────────────────────────────

function InfoTab({ display, userData, onLogout }: { display: string; userData: Record<string, string> | null; onLogout: () => void }) {
  const rows: [string, string, boolean][] = [
    ['Serwer',     display,                       true ],
    ['Użytkownik', userData?.username || 'admin', false],
    ['Endpoint',   '/api/zfs/pools',              true ],
    ['Status',     'Online',                      false],
  ];
  return (
    <>
      <View style={styles.infoCard}>
        {rows.map(([k, v, mono]) => (
          <View key={k} style={styles.infoRow}>
            <Text style={styles.infoKey}>{k}</Text>
            <Text style={[styles.infoVal, mono && { fontFamily: FONTS.mono }]}>{v}</Text>
          </View>
        ))}
      </View>
      <Btn label="Wyloguj się" onPress={onLogout} variant="danger" />
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────

interface Props {
  serverUrl: string;
  userData: Record<string, string> | null;
  onLogout: () => void;
}

const TABS = [
  { id: 'disks', label: '💿 Dyski' },
  { id: 'files', label: '📁 Pliki' },
  { id: 'info',  label: '⚙️ Info'  },
] as const;
type TabId = typeof TABS[number]['id'];

export default function HomeScreen({ serverUrl, userData, onLogout }: Props) {
  const [tab, setTab] = useState<TabId>('disks');
  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <View style={styles.root}>
      <GridBg />

      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <NasIcon size={26} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.appName}>Nimbus</Text>
            <Text style={styles.serverAddr}>{display}</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <View style={styles.userBadge}>
            <Text style={styles.userLabel}>{userData?.username || 'admin'}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutIcon}>↩</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.divider} />

      <View style={styles.content}>
        {tab === 'disks' && <DisksTab serverUrl={serverUrl} userData={userData} />}
        {tab === 'files' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <FilesTab />
          </ScrollView>
        )}
        {tab === 'info' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <InfoTab display={display} userData={userData} onLogout={onLogout} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingTop: 12, paddingBottom: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadingText: { color: C.textMute, fontFamily: FONTS.regular, fontSize: 13, marginTop: 12 },
  errorText: { color: C.red, fontFamily: FONTS.regular, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  retryText: { color: C.accent, fontFamily: FONTS.medium, fontSize: 13 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, marginBottom: 10 },
  topLeft: { flexDirection: 'row', alignItems: 'center' },
  appName: { fontSize: 16, fontFamily: FONTS.bold, color: C.text, lineHeight: 20 },
  serverAddr: { fontSize: 10, fontFamily: FONTS.mono, color: C.textMute },
  topRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  userBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: 'rgba(49,170,64,0.3)' },
  userLabel: { fontSize: 11, color: C.green, fontFamily: FONTS.semibold },
  logoutBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  logoutIcon: { color: C.textSub, fontSize: 15 },

  tabRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabLabel: { fontSize: 12, fontFamily: FONTS.semibold, color: C.textMute },
  tabLabelActive: { color: C.bg },
  divider: { height: 1, backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 0 },

  diskCard: { padding: 13, borderRadius: 12, marginBottom: 10, marginTop: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  diskCardWarning: { borderColor: 'rgba(244,149,0,0.35)' },
  diskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  diskName: { fontSize: 14, fontFamily: FONTS.bold, color: C.text, marginBottom: 3 },
  diskMeta: { fontSize: 11, fontFamily: FONTS.mono, color: C.textMute },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: 'rgba(49,170,64,0.3)' },
  statusBadgeWarn: { backgroundColor: 'rgba(22,16,0,1)', borderColor: 'rgba(244,149,0,0.3)' },
  statusText: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.7, color: C.green },
  statusTextWarn: { color: C.yellow },
  barTrack: { height: 5, backgroundColor: 'rgba(24,32,40,1)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  diskFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  diskStat: { fontSize: 11, color: C.textMute, fontFamily: FONTS.regular },
  ioRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  ioStat: { fontSize: 11, fontFamily: FONTS.mono, color: C.textSub },

  breadcrumb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, marginBottom: 10, marginTop: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  breadcrumbText: { fontSize: 11, fontFamily: FONTS.mono, color: 'rgba(0,137,171,1)' },
  upBtn: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  upBtnText: { fontSize: 11, color: C.textSub, fontFamily: FONTS.regular },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  fileIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 13, fontFamily: FONTS.medium, color: C.text },
  fileInfo: { fontSize: 11, color: C.textMute, fontFamily: FONTS.regular },
  chevron: { color: C.textMute, fontSize: 16 },

  infoCard: { padding: 14, borderRadius: 12, marginBottom: 12, marginTop: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.bg },
  infoKey: { fontSize: 12, color: C.textMute, textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: FONTS.semibold },
  infoVal: { fontSize: 12, color: C.textSub, fontFamily: FONTS.regular, maxWidth: '60%', textAlign: 'right' },
});
