import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Animated, Dimensions, TouchableWithoutFeedback, Switch,
} from 'react-native';
import NasIcon from '../components/NasIcon';
import GridBg from '../components/GridBg';
import Spinner from '../components/Spinner';
import { C, FONTS } from '../tokens';

const DRAWER_W = 260;

// ── Types ─────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'disks' | 'docker' | 'net' | 'services' | 'logs' | 'info';

interface Overview {
  hostname: string; kernel: string; uptime_secs: number;
  cpu: { cores: string; freq_ghz: string; load: number[]; model: string; percent: number; temp: number };
  memory: { avail_gb: number; cached_gb: number; percent: number;
            swap_total_gb: number; swap_used_gb: number; total_gb: number; used_gb: number };
}
interface Pool {
  name: string; type: string; total: number; used: number;
  avail: number; health: string; iops: number; read_mbps: number; write_mbps: number;
}
interface Mount {
  device: string; mountpoint: string; fstype: string;
  total: number; used: number; free: number; percent: number;
}
interface Container {
  id: string; name: string; image: string; status: string; state: string;
  cpu?: number; mem_mb?: number;
}
interface NetIface {
  Name: string; RxB: number; TxB: number; State: string; IP: string; MAC: string; Speed: string;
}
interface LogEntry {
  time: string; source: string; level: string; message: string;
}

// ── Helpers ───────────────────────────────────────────────────────

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
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function logColor(level: string): string {
  if (level === 'error' || level === 'crit' || level === 'err') return C.red;
  if (level === 'warn' || level === 'warning') return C.yellow;
  return C.textMute;
}

// ── apiFetch ──────────────────────────────────────────────────────

async function apiFetch(
  serverUrl: string, path: string,
  userData: Record<string, string> | null,
  method = 'GET', body?: Record<string, any>,
) {
  const base = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl;
  const headers: Record<string, string> = {};
  if (userData?.token) headers['Authorization'] = `Bearer ${userData.token}`;
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(`${base.replace(/\/+$/, '')}${path}`, {
    method, headers, credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Shared UI ─────────────────────────────────────────────────────

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
function StatBar({ pct, color = C.accent }: { pct: number; color?: string }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}
function SLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

// ── Dashboard Tab ─────────────────────────────────────────────────

interface DashData {
  overview?: Overview;
  pools?: { pools: Pool[] };
  containers?: { containers: Container[] };
  smb?: { active: boolean };
  ssh?: { active: boolean };
  nfs?: { active: boolean };
  logs?: LogEntry[];
}

function DashboardTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [data, setData]      = useState<DashData>({});
  const [loading, setLoad]   = useState(true);
  const [error, setError]    = useState('');
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    setError('');
    try {
      const res = await apiFetch(serverUrl, '/api/dashboard', userData);
      if (!res.ok) throw new Error('dashboard');
      setData(await res.json());
    } catch {
      try {
        const res = await apiFetch(serverUrl, '/api/overview', userData);
        setData({ overview: await res.json() });
      } catch { setError('Nie można połączyć z serwerem'); }
    } finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingView text="Ładowanie pulpitu…" />;
  if (error && !data.overview) return <ErrorView msg={error} onRetry={fetch_} />;

  const ov = data.overview;
  const pools = data.pools?.pools ?? [];
  const containers = data.containers?.containers ?? [];
  const running = containers.filter(c => c.state === 'running').length;
  const healthy = pools.filter(p => p.health === 'ONLINE' || p.health === 'ok').length;
  const recentLogs = (data.logs ?? []).slice(0, 6);
  const cpuColor = (ov?.cpu.percent ?? 0) > 80 ? C.red : C.accent;
  const memColor = (ov?.memory.percent ?? 0) > 85 ? C.red : C.accent;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {ov && (
        <>
          <SLabel label="SYSTEM" />
          <View style={s.card}>
            <View style={[s.row, { marginBottom: 6 }]}>
              <Text style={s.cardTitle}>{ov.hostname}</Text>
              <View style={[s.dot, { backgroundColor: C.green, marginRight: 0 }]} />
            </View>
            <Text style={s.sub}>Uptime: {formatUptime(ov.uptime_secs)} · {ov.kernel}</Text>

            <View style={[s.row, { marginTop: 10 }]}>
              <Text style={s.metricLabel}>CPU</Text>
              <Text style={[s.metricVal, { color: cpuColor }]}>{ov.cpu.percent.toFixed(1)}%</Text>
            </View>
            <StatBar pct={ov.cpu.percent} color={cpuColor} />

            <View style={s.row}>
              <Text style={s.metricLabel}>RAM  {ov.memory.used_gb?.toFixed(1)} / {ov.memory.total_gb.toFixed(1)} GB</Text>
              <Text style={[s.metricVal, { color: memColor }]}>{ov.memory.percent.toFixed(0)}%</Text>
            </View>
            <StatBar pct={ov.memory.percent} color={memColor} />

            <View style={[s.row, { marginTop: 6 }]}>
              <Text style={s.sub}>Temp: {ov.cpu.temp.toFixed(1)}°C</Text>
              <Text style={s.sub}>Load: {ov.cpu.load.map(l => l.toFixed(2)).join(' / ')}</Text>
            </View>
          </View>
        </>
      )}

      {pools.length > 0 && (
        <>
          <SLabel label="DYSKI ZFS" />
          <View style={s.summaryRow}>
            <SummaryCard icon="💾" label="Pule" value={`${pools.length}`} ok />
            <SummaryCard icon="✅" label="Zdrowe" value={`${healthy}/${pools.length}`} ok={healthy === pools.length} />
            <SummaryCard icon="📊" label="Zajęte"
              value={`${Math.round(pools.reduce((a, p) => a + (p.used / p.total), 0) / pools.length * 100)}%`}
              ok />
          </View>
        </>
      )}

      {containers.length > 0 && (
        <>
          <SLabel label="DOCKER" />
          <View style={s.summaryRow}>
            <SummaryCard icon="🐳" label="Kontenery" value={`${containers.length}`} ok />
            <SummaryCard icon="▶" label="Aktywne" value={`${running}`} ok={running > 0} />
            <SummaryCard icon="⏹" label="Zatrzymane" value={`${containers.length - running}`} ok={containers.length - running === 0} />
          </View>
        </>
      )}

      <SLabel label="USŁUGI" />
      <View style={s.card}>
        <ServiceLine label="Samba (SMB)" active={data.smb?.active ?? false} />
        <ServiceLine label="SSH" active={data.ssh?.active ?? false} />
        <ServiceLine label="NFS" active={data.nfs?.active ?? false} last />
      </View>

      {recentLogs.length > 0 && (
        <>
          <SLabel label="OSTATNIE LOGI" />
          <View style={s.card}>
            {recentLogs.map((l, i) => (
              <View key={i} style={[s.logLine, i < recentLogs.length - 1 && { marginBottom: 7 }]}>
                <View style={[s.logDot, { backgroundColor: logColor(l.level) }]} />
                <Text style={s.logMsg} numberOfLines={2}>{l.message}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SummaryCard({ icon, label, value, ok }: { icon: string; label: string; value: string; ok: boolean }) {
  return (
    <View style={s.summaryCard}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[s.summaryVal, { color: ok ? C.text : C.yellow }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}
function ServiceLine({ label, active, last }: { label: string; active: boolean; last?: boolean }) {
  return (
    <View style={[s.row, { paddingVertical: 10 }, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <Text style={s.sub}>{label}</Text>
      <View style={[s.statusPill, {
        backgroundColor: active ? 'rgba(49,170,64,0.12)' : 'rgba(60,74,84,0.2)',
        borderColor: active ? 'rgba(49,170,64,0.35)' : C.border,
      }]}>
        <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: active ? C.green : C.textMute }}>
          {active ? 'AKTYWNA' : 'WYŁĄCZONA'}
        </Text>
      </View>
    </View>
  );
}

// ── Disks Tab ─────────────────────────────────────────────────────

function DisksTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [pools, setPools]    = useState<Pool[]>([]);
  const [mounts, setMounts]  = useState<Mount[]>([]);
  const [loading, setLoad]   = useState(true);
  const [error, setError]    = useState('');
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    setError('');
    let anyOk = false;
    try {
      const resP = await apiFetch(serverUrl, '/api/zfs/pools', userData);
      const jp = await resP.json();
      if (Array.isArray(jp.pools)) { setPools(jp.pools); anyOk = true; }
    } catch { /* ZFS może nie być zainstalowane */ }
    try {
      const resM = await apiFetch(serverUrl, '/api/storage/mounts', userData);
      if (resM.ok) {
        const jm = await resM.json();
        const arr = Array.isArray(jm) ? jm : (Array.isArray(jm?.mounts) ? jm.mounts : []);
        setMounts(arr); anyOk = true;
      }
    } catch { /* punkty montowania niedostępne */ }
    if (!anyOk) setError('Nie można pobrać danych dysków');
    setLoad(false); setRef(false);
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingView text="Ładowanie dysków…" />;
  if (error)   return <ErrorView msg={error} onRetry={fetch_} />;

  const visibleMounts = mounts.filter(m => m.mountpoint && !m.mountpoint.startsWith('/snap/'));

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {pools.length > 0 && (
        <>
          <SLabel label="PULE ZFS" />
          {pools.map(pool => {
            const pct = pool.total > 0 ? Math.round((pool.used / pool.total) * 100) : 0;
            const h = (pool.health ?? '').toUpperCase();
            const ok = h === 'ONLINE' || h === 'OK';
            return (
              <View key={pool.name} style={[s.card, !ok && s.cardWarn]}>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{pool.name}</Text>
                    <Text style={s.cardSub}>{pool.type} · {formatSize(pool.total)}</Text>
                  </View>
                  <View style={[s.badge, !ok && s.badgeWarn]}>
                    <Text style={[s.badgeTxt, !ok && { color: C.yellow }]}>{ok ? 'ONLINE' : h}</Text>
                  </View>
                </View>
                <StatBar pct={pct} color={pct > 80 ? C.yellow : C.accent} />
                <View style={s.row}>
                  <Text style={s.sub}>Zajęte: {formatSize(pool.used)} ({pct}%)</Text>
                  <Text style={s.sub}>Wolne: {formatSize(pool.avail)}</Text>
                </View>
                <View style={[s.row, s.ioBar]}>
                  <Text style={s.ioTxt}>↓ {(pool.read_mbps ?? 0).toFixed(2)} MB/s</Text>
                  <Text style={s.ioTxt}>↑ {(pool.write_mbps ?? 0).toFixed(2)} MB/s</Text>
                  <Text style={s.ioTxt}>IOPS: {pool.iops ?? 0}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {visibleMounts.length > 0 && (
        <>
          <SLabel label="PUNKTY MONTOWANIA" />
          {visibleMounts.map((m, i) => {
            const pct = m.percent ?? 0;
            return (
              <View key={i} style={s.card}>
                <View style={s.row}>
                  <Text style={[s.cardTitle, { flex: 1 }]} numberOfLines={1}>{m.mountpoint}</Text>
                  <Text style={[s.sub, { color: pct > 90 ? C.red : C.textMute }]}>{pct.toFixed(0)}%</Text>
                </View>
                <Text style={s.cardSub}>{m.fstype} · {m.device}</Text>
                <StatBar pct={pct} color={pct > 90 ? C.red : pct > 75 ? C.yellow : C.accent} />
                <View style={s.row}>
                  <Text style={s.sub}>Zajęte: {formatBytes(m.used)}</Text>
                  <Text style={s.sub}>Wolne: {formatBytes(m.free)}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {pools.length === 0 && visibleMounts.length === 0 && (
        <Text style={[s.loadTxt, { marginTop: 32, textAlign: 'center' }]}>Brak danych o dyskach</Text>
      )}
    </ScrollView>
  );
}

// ── Docker Tab ────────────────────────────────────────────────────

function DockerTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoad]   = useState(true);
  const [error, setError]    = useState('');
  const [refreshing, setRef] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    setError('');
    try {
      const res = await apiFetch(serverUrl, '/services/docker/containers', userData);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setContainers(json.containers ?? []);
    } catch (e: any) { setError(`Docker niedostępny: ${e.message}`); }
    finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function doAction(id: string, action: 'start' | 'stop' | 'restart') {
    setActionId(id);
    try {
      await apiFetch(serverUrl, `/services/docker/containers/${id}/action`, userData, 'POST', { action });
      await fetch_();
    } finally { setActionId(null); }
  }

  if (loading) return <LoadingView text="Ładowanie kontenerów…" />;
  if (error)   return <ErrorView msg={error} onRetry={fetch_} />;

  const running = containers.filter(c => c.state === 'running');
  const stopped = containers.filter(c => c.state !== 'running');

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {containers.length > 0 && (
        <View style={[s.row, { marginTop: 12, marginBottom: 4 }]}>
          <Text style={[s.sub, { color: C.green }]}>▶  {running.length} aktywnych</Text>
          <Text style={s.sub}>⏹  {stopped.length} zatrzymanych</Text>
        </View>
      )}

      {[...running, ...stopped].map(c => {
        const isRunning = c.state === 'running';
        const busy = actionId === c.id;
        return (
          <View key={c.id} style={[s.card, !isRunning && { opacity: 0.7 }]}>
            <View style={s.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                <View style={[s.dot, { backgroundColor: isRunning ? C.green : C.textMute, marginRight: 0 }]} />
                <Text style={[s.cardTitle, { flex: 1 }]} numberOfLines={1}>{c.name.replace(/^\//, '')}</Text>
              </View>
              {busy && <Spinner size={14} color={C.accent} />}
            </View>
            <Text style={s.cardSub} numberOfLines={1}>{c.image}</Text>
            <Text style={[s.sub, { marginTop: 4 }]}>{c.status}</Text>
            {(c.cpu !== undefined || c.mem_mb !== undefined) && (
              <View style={[s.row, { marginTop: 6 }]}>
                {c.cpu !== undefined && <Text style={s.sub}>CPU: {c.cpu.toFixed(1)}%</Text>}
                {c.mem_mb !== undefined && <Text style={s.sub}>RAM: {c.mem_mb.toFixed(0)} MB</Text>}
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              {isRunning ? (
                <>
                  <ActionBtn label="Restart" color={C.accent} onPress={() => doAction(c.id, 'restart')} disabled={busy} />
                  <ActionBtn label="Stop"    color={C.red}    onPress={() => doAction(c.id, 'stop')}    disabled={busy} />
                </>
              ) : (
                <ActionBtn label="Start" color={C.green} onPress={() => doAction(c.id, 'start')} disabled={busy} />
              )}
            </View>
          </View>
        );
      })}

      {containers.length === 0 && (
        <Text style={[s.loadTxt, { marginTop: 32, textAlign: 'center' }]}>Brak kontenerów Docker</Text>
      )}
    </ScrollView>
  );
}

function ActionBtn({ label, color, onPress, disabled }: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={[s.actionBtn, { borderColor: color + '66', opacity: disabled ? 0.45 : 1 }]}>
      <Text style={[s.actionBtnTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Network Tab ───────────────────────────────────────────────────

function normalizeIface(raw: any): NetIface {
  return {
    Name:  raw.Name  ?? raw.name  ?? raw.iface ?? '',
    RxB:   raw.RxB   ?? raw.rxb   ?? raw.rx_bytes ?? raw.rx ?? 0,
    TxB:   raw.TxB   ?? raw.txb   ?? raw.tx_bytes ?? raw.tx ?? 0,
    State: raw.State ?? raw.state ?? raw.flags ?? 'unknown',
    IP:    raw.IP    ?? raw.ip    ?? raw.addr ?? raw.ipv4 ?? '',
    MAC:   raw.MAC   ?? raw.mac   ?? '',
    Speed: raw.Speed ?? raw.speed ?? '',
  };
}

function NetworkTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [hostname, setHost]  = useState('');
  const [ifaces, setIfaces]  = useState<NetIface[]>([]);
  const [loading, setLoad]   = useState(true);
  const [error, setError]    = useState('');
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    setError('');
    try {
      const res = await apiFetch(serverUrl, '/api/network', userData);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setHost(json.hostname ?? '');
      setIfaces((json.interfaces ?? []).map(normalizeIface));
    } catch (e: any) { setError(`Błąd sieci: ${e?.message ?? 'nieznany'}`); }
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
      <SLabel label="INTERFEJSY" />
      {ifaces.map(iface => {
        const stateStr = (iface.State ?? '').toLowerCase();
        const up = stateStr === 'up' || stateStr === 'active' || stateStr === 'connected';
        return (
          <View key={iface.Name || String(Math.random())} style={[s.card, !up && { opacity: 0.55 }]}>
            <View style={s.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.dot, { backgroundColor: up ? C.green : C.textMute, marginRight: 0 }]} />
                <Text style={s.cardTitle}>{iface.Name}</Text>
                {iface.Speed ? (
                  <View style={s.speedBadge}><Text style={s.speedTxt}>{iface.Speed}</Text></View>
                ) : null}
              </View>
              <View style={[s.badge, !up && s.badgeDown]}>
                <Text style={[s.badgeTxt, !up && { color: C.textMute }]}>{(iface.State ?? 'unknown').toUpperCase()}</Text>
              </View>
            </View>
            {(iface.IP || iface.MAC) ? (
              <View style={{ marginTop: 6 }}>
                {iface.IP ? <Text style={s.netMeta}>IP   {iface.IP}</Text> : null}
                {iface.MAC && iface.MAC !== '00:00:00:00:00:00' ? <Text style={s.netMeta}>MAC  {iface.MAC}</Text> : null}
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

// ── Services Tab ──────────────────────────────────────────────────

interface SvcData {
  id: string; label: string; icon: string;
  statusPath: string; togglePath: string | null;
  active: boolean; installed: boolean; details: string; toggling: boolean;
}

const SVC_DEFS = [
  { id: 'smb', label: 'Samba (SMB)', icon: '🗂️', statusPath: '/services/samba/status',        togglePath: '/services/samba/toggle' },
  { id: 'ssh', label: 'SSH',         icon: '🔐', statusPath: '/services/ssh/status',           togglePath: '/services/ssh/toggle' },
  { id: 'nfs', label: 'NFS',         icon: '📂', statusPath: '/api/nfs-server/status',         togglePath: null },
  { id: 'ftp', label: 'FTP/SFTP',    icon: '📡', statusPath: '/api/services/ftp-sftp/status',  togglePath: '/api/services/ftp-sftp/toggle' },
];

function ServicesTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [services, setServices] = useState<SvcData[]>(
    SVC_DEFS.map(d => ({ ...d, active: false, installed: false, details: '', toggling: false }))
  );
  const [loading, setLoad]   = useState(true);
  const [refreshing, setRef] = useState(false);

  const fetchAll = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    try {
      const results = await Promise.all(SVC_DEFS.map(async def => {
        try {
          const res = await apiFetch(serverUrl, def.statusPath, userData);
          const json = await res.json();
          let details = '';
          if (def.id === 'smb' && json.workgroup)        details = `Workgroup: ${json.workgroup}`;
          if (def.id === 'ssh' && json.port)             details = `Port: ${json.port}`;
          if (def.id === 'nfs' && json.export_count != null) details = `Eksporty: ${json.export_count}`;
          if (def.id === 'ftp' && json.service)          details = json.service;
          return { ...def, active: json.active ?? false, installed: json.installed ?? true, details, toggling: false };
        } catch {
          return { ...def, active: false, installed: false, details: 'Niedostępna', toggling: false };
        }
      }));
      setServices(results);
    } finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function toggle(svc: SvcData) {
    if (!svc.togglePath) return;
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, toggling: true } : s));
    try {
      await apiFetch(serverUrl, svc.togglePath, userData, 'POST', { enable: !svc.active });
      await fetchAll();
    } finally {
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, toggling: false } : s));
    }
  }

  if (loading) return <LoadingView text="Ładowanie usług…" />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.accent} />}>
      <SLabel label="USŁUGI SIECIOWE" />
      {services.map(svc => (
        <View key={svc.id} style={s.card}>
          <View style={s.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>{svc.icon}</Text>
              <View>
                <Text style={s.cardTitle}>{svc.label}</Text>
                {svc.details ? <Text style={s.cardSub}>{svc.details}</Text> : null}
                {!svc.installed && <Text style={[s.sub, { color: C.yellow }]}>Niezainstalowana</Text>}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {svc.toggling ? (
                <Spinner size={18} color={C.accent} />
              ) : (
                <>
                  <View style={[s.statusPill, {
                    backgroundColor: svc.active ? 'rgba(49,170,64,0.12)' : 'rgba(60,74,84,0.2)',
                    borderColor: svc.active ? 'rgba(49,170,64,0.35)' : C.border,
                  }]}>
                    <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: svc.active ? C.green : C.textMute }}>
                      {svc.active ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                  {svc.togglePath && svc.installed && (
                    <Switch
                      value={svc.active}
                      onValueChange={() => toggle(svc)}
                      trackColor={{ false: C.border, true: 'rgba(49,170,64,0.5)' }}
                      thumbColor={svc.active ? C.green : C.textMute}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Logs Tab ──────────────────────────────────────────────────────

function LogsTab({ serverUrl, userData }: { serverUrl: string; userData: Record<string, string> | null }) {
  const [logs, setLogs]      = useState<LogEntry[]>([]);
  const [loading, setLoad]   = useState(true);
  const [error, setError]    = useState('');
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    setError('');
    try {
      const res = await apiFetch(serverUrl, '/api/system/logs?n=100', userData);
      const json = await res.json();
      setLogs(Array.isArray(json) ? json : []);
    } catch { setError('Nie można pobrać logów'); }
    finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingView text="Ładowanie logów…" />;
  if (error)   return <ErrorView msg={error} onRetry={fetch_} />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {logs.length === 0 && (
        <Text style={[s.loadTxt, { marginTop: 32, textAlign: 'center' }]}>Brak logów</Text>
      )}
      {logs.map((l, i) => (
        <View key={i} style={[s.logCard, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
          <View style={s.row}>
            <Text style={[s.logLevel, { color: logColor(l.level) }]}>{l.level.toUpperCase()}</Text>
            <Text style={s.logTime} numberOfLines={1}>{l.time}</Text>
          </View>
          <Text style={s.logSource}>{l.source}</Text>
          <Text style={s.logText}>{l.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────

function InfoRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={[s.row, s.infoRow]}>
      <Text style={s.infoKey}>{k}</Text>
      <Text style={[s.infoVal, mono && { fontFamily: FONTS.mono }]} numberOfLines={1}>{v}</Text>
    </View>
  );
}

function InfoTab({ serverUrl, userData, onLogout }: {
  serverUrl: string; userData: Record<string, string> | null; onLogout: () => void;
}) {
  const [ov, setOv]          = useState<Overview | null>(null);
  const [loading, setLoad]   = useState(true);
  const [refreshing, setRef] = useState(false);

  const fetch_ = useCallback(async (isRef = false) => {
    isRef ? setRef(true) : setLoad(true);
    try {
      const res = await apiFetch(serverUrl, '/api/overview', userData);
      setOv(await res.json());
    } catch { /* keep previous */ }
    finally { setLoad(false); setRef(false); }
  }, [serverUrl, userData]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={C.accent} />}>
      {loading && !ov ? <LoadingView text="Ładowanie…" /> : ov ? (
        <>
          <View style={s.card}>
            <InfoRow k="Hostname" v={ov.hostname} />
            <InfoRow k="Uptime"   v={formatUptime(ov.uptime_secs)} />
            <InfoRow k="Kernel"   v={ov.kernel} mono />
          </View>

          <SLabel label="PROCESOR" />
          <View style={s.card}>
            <Text style={[s.sub, { marginBottom: 8 }]} numberOfLines={2}>{ov.cpu.model}</Text>
            <View style={s.row}>
              <Text style={s.sub}>{ov.cpu.cores} rdzenie · {ov.cpu.freq_ghz} GHz</Text>
              <Text style={[s.sub, { color: ov.cpu.percent > 80 ? C.red : C.accent }]}>{ov.cpu.percent.toFixed(1)}%</Text>
            </View>
            <StatBar pct={ov.cpu.percent} color={ov.cpu.percent > 80 ? C.red : C.accent} />
            <View style={[s.row, { marginTop: 6 }]}>
              <Text style={s.sub}>Temp: {ov.cpu.temp.toFixed(1)}°C</Text>
              <Text style={s.sub}>Load: {ov.cpu.load.map(l => l.toFixed(2)).join(' / ')}</Text>
            </View>
          </View>

          <SLabel label="PAMIĘĆ RAM" />
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.sub}>Użyte: {(ov.memory as any).used_gb?.toFixed(1)} / {ov.memory.total_gb.toFixed(1)} GB</Text>
              <Text style={[s.sub, { color: ov.memory.percent > 85 ? C.red : C.accent }]}>{ov.memory.percent.toFixed(0)}%</Text>
            </View>
            <StatBar pct={ov.memory.percent} color={ov.memory.percent > 85 ? C.red : C.accent} />
            <View style={[s.row, { marginTop: 6 }]}>
              <Text style={s.sub}>Dostępne: {ov.memory.avail_gb.toFixed(1)} GB</Text>
              <Text style={s.sub}>Cache: {ov.memory.cached_gb.toFixed(1)} GB</Text>
            </View>
          </View>

          {ov.memory.swap_total_gb > 0 && (
            <>
              <SLabel label="SWAP" />
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

      <SLabel label="POŁĄCZENIE" />
      <View style={s.card}>
        <InfoRow k="Serwer"     v={serverUrl.replace(/^https?:\/\//, '')} mono />
        <InfoRow k="Użytkownik" v={userData?.username ?? 'admin'} />
        <InfoRow k="Status"     v="Online" />
      </View>

      <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
        <Text style={s.logoutTxt}>↩  Wyloguj się</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Nav config ────────────────────────────────────────────────────

const NAV: { id: TabId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Pulpit'  },
  { id: 'disks',     icon: '💾', label: 'Dyski'   },
  { id: 'docker',    icon: '🐳', label: 'Docker'  },
  { id: 'net',       icon: '🌐', label: 'Sieć'    },
  { id: 'services',  icon: '⚙️',  label: 'Usługi'  },
  { id: 'logs',      icon: '📋', label: 'Logi'    },
  { id: 'info',      icon: 'ℹ️',  label: 'Info'    },
];

const TAB_TITLES: Record<TabId, string> = {
  dashboard: 'Pulpit', disks: 'Dyski', docker: 'Docker',
  net: 'Sieć', services: 'Usługi', logs: 'Logi', info: 'Info',
};

// ── Drawer ────────────────────────────────────────────────────────

function Drawer({ open, activeTab, onSelect, onClose, serverUrl, username, onLogout }: {
  open: boolean; activeTab: TabId;
  onSelect: (id: TabId) => void; onClose: () => void;
  serverUrl: string; username: string; onLogout: () => void;
}) {
  const anim     = useRef(new Animated.Value(-DRAWER_W)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(anim,     { toValue: 0,        tension: 80, friction: 14, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 1, duration: 200,      useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(anim,     { toValue: -DRAWER_W, tension: 80, friction: 14, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 0, duration: 200,       useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [open]);

  if (!visible) return null;

  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: opacAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[s.drawerPanel, { transform: [{ translateX: anim }] }]}>
        <View style={s.drawerHeader}>
          <NasIcon size={32} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.drawerAppName}>Nimbus</Text>
            <Text style={s.drawerServer}>{display}</Text>
          </View>
        </View>

        <View style={s.drawerDivider} />

        <View style={s.drawerUserRow}>
          <View style={[s.dot, { backgroundColor: C.green }]} />
          <Text style={s.drawerUser}>{username || 'admin'}</Text>
        </View>

        <View style={s.drawerDivider} />

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
        </ScrollView>

        <View style={s.drawerDivider} />

        <TouchableOpacity onPress={() => { onClose(); onLogout(); }} style={s.drawerLogout}>
          <Text style={s.drawerLogoutTxt}>↩  Wyloguj się</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────

interface Props {
  serverUrl: string;
  userData: Record<string, string> | null;
  onLogout: () => void;
}

export default function HomeScreen({ serverUrl, userData, onLogout }: Props) {
  const [tab, setTab]           = useState<TabId>('dashboard');
  const [drawerOpen, setDrawer] = useState(false);
  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <View style={s.root}>
      <GridBg />

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

      <View style={s.content}>
        {tab === 'dashboard' && <DashboardTab serverUrl={serverUrl} userData={userData} />}
        {tab === 'disks'     && <DisksTab     serverUrl={serverUrl} userData={userData} />}
        {tab === 'docker'    && <DockerTab    serverUrl={serverUrl} userData={userData} />}
        {tab === 'net'       && <NetworkTab   serverUrl={serverUrl} userData={userData} />}
        {tab === 'services'  && <ServicesTab  serverUrl={serverUrl} userData={userData} />}
        {tab === 'logs'      && <LogsTab      serverUrl={serverUrl} userData={userData} />}
        {tab === 'info'      && <InfoTab      serverUrl={serverUrl} userData={userData} onLogout={onLogout} />}
      </View>

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

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: C.surface },

  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  hamburger:     { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  hamburgerIcon: { color: C.textSub, fontSize: 18 },
  pageTitle:     { fontSize: 16, fontFamily: FONTS.bold, color: C.text, lineHeight: 20 },
  serverAddr:    { fontSize: 10, fontFamily: FONTS.mono, color: C.textMute },
  userBadge:     { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: 'rgba(49,170,64,0.3)' },
  userLabel:     { fontSize: 11, color: C.green, fontFamily: FONTS.semibold },

  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadTxt:  { color: C.textMute, fontFamily: FONTS.regular, fontSize: 13, marginTop: 12 },
  errTxt:   { color: C.red, fontFamily: FONTS.regular, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  retryTxt: { color: C.accent, fontFamily: FONTS.medium, fontSize: 13 },
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub:      { fontSize: 11, color: C.textMute, fontFamily: FONTS.regular },
  sectionLabel: { fontSize: 10, fontFamily: FONTS.bold, color: C.textMute, letterSpacing: 1.2, marginTop: 16, marginBottom: 2, textTransform: 'uppercase' },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginRight: 8 },

  card:       { marginTop: 8, padding: 13, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  cardWarn:   { borderColor: 'rgba(244,149,0,0.35)' },
  cardTitle:  { fontSize: 14, fontFamily: FONTS.bold, color: C.text, marginBottom: 2 },
  cardSub:    { fontSize: 11, fontFamily: FONTS.mono, color: C.textMute },
  badge:      { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: 'rgba(49,170,64,0.3)' },
  badgeWarn:  { backgroundColor: 'rgba(22,16,0,1)', borderColor: 'rgba(244,149,0,0.3)' },
  badgeDown:  { backgroundColor: C.surface, borderColor: C.border },
  badgeTxt:   { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.7, color: C.green },
  barTrack:   { height: 5, backgroundColor: 'rgba(24,32,40,1)', borderRadius: 3, overflow: 'hidden', marginVertical: 8 },
  barFill:    { height: '100%', borderRadius: 3 },
  ioBar:      { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },
  ioTxt:      { fontSize: 11, fontFamily: FONTS.mono, color: C.textSub },
  statusPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1 },

  metricLabel:  { fontSize: 12, color: C.textSub, fontFamily: FONTS.regular },
  metricVal:    { fontSize: 12, fontFamily: FONTS.bold },
  summaryRow:   { flexDirection: 'row', gap: 8, marginTop: 8 },
  summaryCard:  { flex: 1, padding: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 4 },
  summaryVal:   { fontSize: 18, fontFamily: FONTS.bold, color: C.text },
  summaryLabel: { fontSize: 10, color: C.textMute, fontFamily: FONTS.medium, textAlign: 'center' },
  logLine:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  logDot:   { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  logMsg:   { flex: 1, fontSize: 11, color: C.textSub, fontFamily: FONTS.regular },

  actionBtn:    { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  actionBtnTxt: { fontSize: 12, fontFamily: FONTS.semibold },

  hostRow:    { marginTop: 12, padding: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  hostLabel:  { fontSize: 10, fontFamily: FONTS.bold, color: C.textMute, letterSpacing: 1.0 },
  hostVal:    { fontSize: 13, fontFamily: FONTS.mono, color: C.accent },
  speedBadge: { marginLeft: 8, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: C.accentBg, borderWidth: 1, borderColor: 'rgba(0,194,233,0.25)' },
  speedTxt:   { fontSize: 10, fontFamily: FONTS.mono, color: C.accent },
  netMeta:    { fontSize: 11, fontFamily: FONTS.mono, color: C.textSub, marginTop: 4 },

  logCard:   { padding: 12, backgroundColor: C.surface },
  logLevel:  { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.8 },
  logTime:   { fontSize: 10, color: C.textMute, fontFamily: FONTS.mono, flex: 1, textAlign: 'right' },
  logSource: { fontSize: 11, color: C.textMute, fontFamily: FONTS.mono, marginTop: 2 },
  logText:   { fontSize: 12, color: C.textSub, fontFamily: FONTS.regular, marginTop: 4 },

  infoRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.bg },
  infoKey: { fontSize: 12, color: C.textMute, fontFamily: FONTS.semibold, textTransform: 'uppercase', letterSpacing: 0.7, flex: 1 },
  infoVal: { fontSize: 12, color: C.textSub, fontFamily: FONTS.regular, flex: 2, textAlign: 'right' },
  logoutBtn: { marginTop: 8, marginBottom: 16, padding: 14, borderRadius: 10, backgroundColor: 'rgba(22,3,3,1)', borderWidth: 1, borderColor: 'rgba(241,77,76,0.3)', alignItems: 'center' },
  logoutTxt: { fontSize: 14, color: C.red, fontFamily: FONTS.medium },

  backdrop:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  drawerPanel:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W, backgroundColor: '#07101a', borderRightWidth: 1, borderRightColor: C.borderHi },
  drawerHeader:  { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 24 },
  drawerAppName: { fontSize: 18, fontFamily: FONTS.bold, color: C.text },
  drawerServer:  { fontSize: 10, fontFamily: FONTS.mono, color: C.textMute },
  drawerDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  drawerUserRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  drawerUser:    { fontSize: 13, fontFamily: FONTS.medium, color: C.green },
  navItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  navItemActive: { backgroundColor: C.accentBg, borderRightWidth: 3, borderRightColor: C.accent },
  navIcon:       { fontSize: 20, width: 28 },
  navLabel:      { fontSize: 15, fontFamily: FONTS.medium, color: C.textSub },
  navLabelActive:{ color: C.accent, fontFamily: FONTS.bold },
  drawerLogout:  { padding: 20, paddingVertical: 16 },
  drawerLogoutTxt: { fontSize: 14, color: C.red, fontFamily: FONTS.medium },
});
