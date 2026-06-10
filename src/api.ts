// Nimbus API client — cookie-based session auth (nimbus_session cookie)
// Based on gekomod/nimbus backend source

let _base = '';

export function initApi(serverUrl: string, _token?: string) {
  _base = serverUrl.replace(/\/+$/, '');
}

export function getBase() { return _base; }

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${_base}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  success?: boolean;
  needs_2fa?: boolean;
  tmp_token?: string;
  user?: { username?: string; uid?: number; groups?: string[] };
  [key: string]: any;
}

export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${_base}/api/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function apiVerifyTotp(tmpToken: string, code: string): Promise<LoginResponse> {
  const res = await fetch(`${_base}/api/login/verify-totp`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmp_token: tmpToken, code }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function apiLogout(): Promise<void> {
  await fetch(`${_base}/api/logout`, { method: 'POST', credentials: 'include' });
}

export async function apiCheckAuth(): Promise<{ authenticated: boolean; username: string }> {
  return req('/api/check-auth');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
// /api/dashboard returns combined object:
// { overview, pools, containers, mounts, network, processes, logs,
//   smb, ssh, nfs, ftp, users, fstab, media }
export interface DashboardData {
  cpu?: number;
  ram?: number;
  ramUsed?: number;
  ramTotal?: number;
  temp?: number;
  uptime?: string;
  load?: number[];
  download?: number;
  upload?: number;
  hostname?: string;
  os?: string;
  version?: string;
}

function fmtUptime(secs: number): string {
  if (!secs) return '—';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function apiDashboard(): Promise<DashboardData> {
  const data = await req<any>('/api/dashboard');
  // /api/dashboard returns combined object; overview key has nested cpu/memory objects
  // structure from handleOverview: { cpu: {percent, model, cores, temp, load}, memory: {total_gb, used_gb, avail_gb, percent}, uptime_secs, hostname, ... }
  const ov = data.overview ?? data;
  const uptimeSecs = ov.uptime_secs ?? ov.uptime ?? 0;
  // network from dashboard.network array — pick first non-loopback interface
  const netArr: any[] = Array.isArray(data.network) ? data.network : [];
  const netIf = netArr.find((n: any) => n.name && !n.name.startsWith('lo')) ?? netArr[0] ?? null;
  return {
    cpu:      typeof ov.cpu === 'object' ? (ov.cpu?.percent ?? 0) : (ov.cpu ?? ov.cpu_percent ?? 0),
    ram:      typeof ov.memory === 'object' ? (ov.memory?.percent ?? 0) : (ov.ram ?? ov.memory_percent ?? 0),
    ramUsed:  typeof ov.memory === 'object' ? (ov.memory?.used_gb ?? 0) : (ov.ramUsed ?? ov.ram_used ?? 0),
    ramTotal: typeof ov.memory === 'object' ? (ov.memory?.total_gb ?? 0) : (ov.ramTotal ?? ov.ram_total ?? 0),
    temp:     typeof ov.cpu === 'object' ? (ov.cpu?.temp ?? 0) : (ov.temp ?? ov.cpu_temp ?? 0),
    uptime:   typeof uptimeSecs === 'number' ? fmtUptime(uptimeSecs) : (uptimeSecs || '—'),
    load:     typeof ov.cpu === 'object' ? (ov.cpu?.load ?? []) : (ov.load ?? ov.load_avg ?? []),
    download: netIf?.rx_mbps ?? netIf?.rx ?? ov.download ?? ov.rx ?? 0,
    upload:   netIf?.tx_mbps ?? netIf?.tx ?? ov.upload ?? ov.tx ?? 0,
    hostname: ov.hostname ?? '—',
    os:       ov.os_name ?? ov.os ?? ov.distro ?? '—',
    version:  ov.kernel ?? ov.version ?? '—',
  };
}

export async function apiOverview(): Promise<any> {
  return req('/api/overview');
}

// ── ZFS / Storage ─────────────────────────────────────────────────────────────
export interface Pool {
  name: string;
  status: string;
  health: string;
  usedPct: number;
  used: string;
  avail: string;
  total: string;
  raid: string;
  smart?: string;
  iops?: number;
  read_mbps?: number;
  write_mbps?: number;
}

export interface Disk {
  dev: string;
  model: string;
  serial?: string;
  vendor?: string;
  temp: number;
  smart: string;
  hours?: string;
  size?: string;
  io?: number;
  read_mbps?: number;
  write_mbps?: number;
  iops?: number;
  pool?: string;
  fs?: string;
  mount?: string;
}

/** Parse a ZFS size value to bytes for ratio calculation.
 * Backend sys.ZFSPools() returns used/avail/total as float64 GB values (plain numbers).
 * lsblk returns sizes as strings with unit suffixes like "500G", "1.8T". */
function parseSizeToBytes(s: string | number | undefined | null): number {
  if (s == null) return 0;
  if (typeof s === 'number') return s * (1024 ** 3); // assume GB
  const str = String(s).trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  const unit = str.replace(/[0-9.]/g, '').toUpperCase();
  const mult: Record<string, number> = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4, P: 1024 ** 5 };
  return num * (mult[unit] ?? (1024 ** 3)); // no unit → assume GB
}

/** Format a size value for display: number → "X.X GB", string with unit → as-is */
function fmtSize(s: string | number | undefined | null): string {
  if (s == null || s === '0' || s === 0) return '—';
  if (typeof s === 'number') {
    if (s >= 1024) return `${(s / 1024).toFixed(2)} TB`;
    return `${s % 1 === 0 ? s : s.toFixed(1)} GB`;
  }
  const str = String(s).trim();
  if (!str || str === '0') return '—';
  // already has unit suffix
  return str;
}

export async function apiPools(): Promise<Pool[]> {
  const data = await req<any>('/api/zfs/pools');
  const arr = data.pools ?? (Array.isArray(data) ? data : []);
  return arr.map((p: any) => {
    const usedRaw  = p.used  ?? p.usedBytes ?? 0;
    const totalRaw = p.total ?? p.size ?? 0;
    const availRaw = p.avail ?? 0;
    const usedBytes  = parseSizeToBytes(usedRaw);
    const totalBytes = parseSizeToBytes(totalRaw);
    const healthRaw  = String(p.health ?? p.status ?? p.state ?? 'unknown');
    return {
      name:       p.name ?? '—',
      status:     healthRaw.toLowerCase(),
      health:     healthRaw.toUpperCase(),
      usedPct:    totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : (p.usedPct ?? 0),
      used:       fmtSize(usedRaw),
      avail:      fmtSize(availRaw),
      total:      fmtSize(totalRaw),
      raid:       p.type ?? p.raid ?? p.vdev ?? '—',
      smart:      p.smart ?? undefined,
      iops:       p.iops ?? undefined,
      read_mbps:  p.read_mbps ?? undefined,
      write_mbps: p.write_mbps ?? undefined,
    };
  });
}

export async function apiDisks(): Promise<Disk[]> {
  // Response: { devices: [...] }
  // Each device: { bay, type, model, serial, vendor, size, fs, mount,
  //                temp, hours, smart, io, read_mbps, write_mbps, iops, pool }
  const data = await req<any>('/api/storage/devices');
  const arr = data.devices ?? (Array.isArray(data) ? data : []);
  return arr
    .filter((d: any) => d.type === 'disk')
    .map((d: any) => ({
      dev:        d.bay ?? d.name ?? d.dev ?? d.device ?? '—',
      model:      d.model ?? d.vendor ?? '—',
      serial:     d.serial ?? undefined,
      vendor:     d.vendor ?? undefined,
      temp:       d.temp ?? d.temperature ?? 0,
      smart:      d.smart ?? d.health ?? 'unknown',
      hours:      d.hours != null ? String(d.hours) : undefined,
      size:       d.size ?? undefined,
      io:         d.io ?? d.util ?? 0,
      read_mbps:  d.read_mbps ?? undefined,
      write_mbps: d.write_mbps ?? undefined,
      iops:       d.iops ?? undefined,
      pool:       d.pool ?? undefined,
      fs:         d.fs ?? undefined,
      mount:      d.mount ?? undefined,
    }));
}

// ── Docker ────────────────────────────────────────────────────────────────────
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  cpu: number;
  ram: number;
  port?: string;
}

export async function apiContainers(): Promise<Container[]> {
  const data = await req<any>('/services/docker/containers');
  const arr = Array.isArray(data) ? data : (data.containers ?? data.data ?? []);
  return arr.map((c: any) => ({
    id:     c.id ?? c.Id ?? c.name ?? '',
    name:   (c.name ?? c.Names?.[0] ?? '—').replace(/^\//, ''),
    image:  c.image ?? c.Image ?? '—',
    status: (c.status ?? c.State?.Status ?? c.state ?? 'unknown').toLowerCase(),
    cpu:    c.cpu ?? c.cpu_percent ?? 0,
    ram:    c.ram ?? c.memory_usage ?? c.mem ?? 0,
    port:   c.port ?? (c.Ports?.[0] ? `${c.Ports[0].PublicPort ?? c.Ports[0].PrivatePort}` : undefined),
  }));
}

export async function apiContainerAction(id: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  // POST /services/docker/container/{id}  body: { action }
  await fetch(`${_base}/services/docker/container/${encodeURIComponent(id)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

// ── Network ───────────────────────────────────────────────────────────────────
export interface NetInterface {
  name: string;
  ip: string;
  speed: string;
  up: boolean;
  rx?: number;
  tx?: number;
  rx_mbps?: number;
  tx_mbps?: number;
}

function normalizeIface(i: any): NetInterface {
  const stateStr = String(i.state ?? i.operstate ?? i.flags ?? '').toUpperCase();
  const upBool = i.up != null ? Boolean(i.up)
    : stateStr.includes('UP') ? true
    : stateStr.includes('DOWN') ? false
    : true; // default visible = up

  const ip = i.ip ?? i.address ?? i.addr ?? i.inet ?? i.ipv4 ?? '—';
  const speed = i.speed != null ? `${i.speed} Mbps` : i.link_speed ?? '—';

  return {
    name:    i.name ?? i.interface ?? i.iface ?? '—',
    ip:      ip === '' ? '—' : ip,
    speed,
    up:      upBool,
    rx:      i.rx ?? i.rx_bytes ?? undefined,
    tx:      i.tx ?? i.tx_bytes ?? undefined,
    rx_mbps: i.rx_mbps ?? (i.rx_speed != null ? parseFloat(i.rx_speed) : undefined),
    tx_mbps: i.tx_mbps ?? (i.tx_speed != null ? parseFloat(i.tx_speed) : undefined),
  };
}

export async function apiNetwork(): Promise<{ interfaces: NetInterface[]; vpn?: any; firewall?: any }> {
  let ifaces: any[] = [];
  let vpn: any = null;
  let firewall: any = null;

  // Try dedicated /api/network first (lighter endpoint)
  try {
    const data = await req<any>('/api/network');
    // May return array directly OR object with interfaces key
    const arr = Array.isArray(data) ? data
      : Array.isArray(data.interfaces) ? data.interfaces
      : Array.isArray(data.data) ? data.data
      : [];
    if (arr.length > 0) {
      ifaces = arr;
      vpn = data.vpn ?? data.wireguard ?? null;
      firewall = data.firewall ?? data.ufw ?? null;
    }
  } catch {}

  // Fallback: pull from dashboard response
  if (ifaces.length === 0) {
    try {
      const dash = await req<any>('/api/dashboard');
      const netField = dash.network ?? dash.interfaces ?? [];
      ifaces = Array.isArray(netField) ? netField : [];
      vpn = dash.vpn ?? dash.wireguard ?? vpn;
      firewall = dash.firewall ?? dash.ufw ?? firewall;
    } catch {}
  }

  return {
    interfaces: ifaces.map(normalizeIface),
    vpn,
    firewall,
  };
}

// ── Services ──────────────────────────────────────────────────────────────────
export interface Service {
  name: string;
  desc: string;
  key: string;
  on: boolean;
}

export async function apiServices(): Promise<Service[]> {
  // Endpoints verified against server.go routes
  const endpoints = [
    { key: 'samba', name: 'Samba',     desc: 'SMB / udziały sieciowe', url: '/services/samba/status' },
    { key: 'ssh',   name: 'SSH',        desc: 'OpenSSH · port 22',      url: '/services/ssh/status' },
    { key: 'nfs',   name: 'NFS',        desc: 'NFS exports',            url: '/api/nfs-server/status' },
    { key: 'ftp',   name: 'FTP / SFTP', desc: 'vsftpd / sftp',         url: '/api/services/ftp-sftp/status' },
  ];
  const results = await Promise.allSettled(endpoints.map(e => req<any>(e.url)));
  return endpoints.map((e, i) => {
    const r = results[i];
    const d = r.status === 'fulfilled' ? r.value : null;
    // NFS returns { active, installed, enabled, ... }
    // Samba/SSH return { running, active, ... }
    return {
      key:  e.key,
      name: e.name,
      desc: e.desc,
      on:   d?.running ?? d?.active ?? d?.enabled ?? false,
    };
  });
}

export async function apiServiceToggle(key: string, on: boolean): Promise<void> {
  const toggleUrls: Record<string, string> = {
    samba: '/services/samba/toggle',
    ssh:   '/services/ssh/toggle',
    nfs:   '/api/nfs-server/toggle',
    ftp:   '/api/services/ftp-sftp/toggle',
  };
  const url = toggleUrls[key] ?? `/services/${key}/toggle`;
  // NFS toggle uses { enable: bool }, others use { running: bool }
  const body = key === 'nfs'
    ? JSON.stringify({ enable: on })
    : JSON.stringify({ running: on });
  await fetch(`${_base}${url}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// ── Logs ──────────────────────────────────────────────────────────────────────
export interface LogEntry {
  lvl: string;
  t: string;
  src: string;
  msg: string;
}

export async function apiLogs(n = 100): Promise<LogEntry[]> {
  // Correct endpoint: /api/logs  (NOT /api/system/logs)
  const data = await req<any>(`/api/logs?n=${n}`);
  const arr = Array.isArray(data) ? data : (data.logs ?? data.entries ?? data.data ?? []);
  return arr.map((e: any) => ({
    lvl: (e.level ?? e.lvl ?? e.severity ?? 'info').toLowerCase().replace('error', 'err'),
    t:   e.time ?? e.t ?? e.timestamp ?? '',
    src: e.source ?? e.src ?? e.service ?? e.unit ?? '',
    msg: e.message ?? e.msg ?? e.text ?? (typeof e === 'string' ? e : ''),
  }));
}

// ── Processes ─────────────────────────────────────────────────────────────────
export interface Process {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  user: string;
}

export async function apiProcesses(): Promise<Process[]> {
  // Correct endpoint: /api/processes  (NOT /api/system/processes)
  const data = await req<any>('/api/processes');
  const arr = Array.isArray(data) ? data : (data.processes ?? data.data ?? []);
  return arr.map((p: any) => ({
    pid:  p.pid ?? 0,
    name: p.name ?? p.cmd ?? p.command ?? '—',
    cpu:  p.cpu ?? p.cpu_percent ?? 0,
    mem:  p.mem ?? p.mem_percent ?? p.memory ?? 0,
    user: p.user ?? p.username ?? '—',
  }));
}

export async function apiKillProcess(pid: number): Promise<void> {
  // Correct endpoint: POST /diagnostics/processes/kill  body: { pid }
  await fetch(`${_base}/diagnostics/processes/kill`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pid }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface User {
  name: string;
  role: string;
  groups: string;
  on: boolean;
}

export async function apiUsers(): Promise<User[]> {
  // Correct endpoint: /api/system/users
  const data = await req<any>('/api/system/users');
  const arr = Array.isArray(data) ? data : (data.users ?? data.data ?? []);
  return arr.map((u: any) => ({
    name:   u.name ?? u.username ?? '—',
    role:   u.role ?? u.group ?? '—',
    groups: Array.isArray(u.groups) ? u.groups.join(', ') : (u.groups ?? ''),
    on:     u.enabled ?? u.active ?? u.on ?? true,
  }));
}

// ── Media ─────────────────────────────────────────────────────────────────────
export interface MediaService {
  id: string;
  name: string;
  kind: string;
  status: string;
  streams: number;
  lib: string;
  version?: string;
}

export async function apiMedia(): Promise<MediaService[]> {
  // handleMediaStatusAll returns a map keyed by server ID, e.g.:
  // { "jellyfin": { active, installed, version, active_streams, port, url, name }, ... }
  const data = await req<any>('/api/media/status/all');
  if (Array.isArray(data)) {
    return data.map((m: any) => ({
      id:      m.id ?? m.name ?? '—',
      name:    m.name ?? m.id ?? '—',
      kind:    m.kind ?? m.type ?? 'film',
      status:  m.active ? 'running' : 'stopped',
      streams: m.active_streams ?? m.streams ?? 0,
      lib:     m.lib ?? m.library ?? '—',
      version: m.version ?? undefined,
    }));
  }
  // map form
  return Object.entries(data).map(([id, m]: [string, any]) => ({
    id,
    name:    m.name ?? id,
    kind:    id === 'navidrome' ? 'music' : 'film',
    status:  m.active ? 'running' : 'stopped',
    streams: m.active_streams ?? 0,
    lib:     m.libraries?.map((l: any) => l.name).join(', ') ?? '—',
    version: m.version ?? undefined,
  }));
}

export async function apiMediaAction(id: string, action: 'start' | 'stop'): Promise<void> {
  await fetch(`${_base}/api/media/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ── ClamAV / Antivirus ────────────────────────────────────────────────────────
export interface ClamavStatus {
  protected: boolean;
  lastScan: string;
  threats: number;
  quarantine: number;
  scanned: number;
  realtime: boolean;
}

export async function apiClamav(): Promise<ClamavStatus> {
  // handleAVStatus returns: { installed: bool, active: bool, version: string }
  const data = await req<any>('/api/antivirus/status');
  return {
    protected:  data.active ?? data.installed ?? false,
    lastScan:   data.last_scan ?? data.lastScan ?? '—',
    threats:    data.threats ?? 0,
    quarantine: data.quarantine ?? 0,
    scanned:    data.scanned ?? 0,
    realtime:   data.active ?? false,
  };
}

export async function apiClamavScan(): Promise<void> {
  await fetch(`${_base}/api/clamav/scan`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function apiClamavRealtimeStatus(): Promise<{ active: boolean }> {
  return req('/api/antivirus/realtime');
}

export async function apiClamavRealtimeToggle(enable: boolean): Promise<void> {
  await fetch(`${_base}/api/antivirus/realtime`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enable }),
  });
}

// ── UPS ───────────────────────────────────────────────────────────────────────
export interface UpsStatus {
  battery: number;
  mode: string;
  runtime: string;
  voltage: number;
  load: number;
  model: string;
}

export async function apiUps(): Promise<UpsStatus> {
  // upsStatusHandler returns:
  // { connected: bool, status: { battery_pct, ups_load, status, runtime_min, input_voltage, temperature, ups_name, last_update, ... }, config, nut_raw }
  const data = await req<any>('/api/ups/status');
  const s = data.status ?? data;
  const runtimeMin = s.runtime_min ?? 0;
  const runtimeStr = runtimeMin > 0
    ? `${Math.floor(runtimeMin / 60)}h ${runtimeMin % 60}m`
    : '—';
  return {
    battery: s.battery_pct  ?? s.battery_charge ?? s.battery ?? 0,
    mode:    s.status       ?? s.ups_status_raw  ?? 'unknown',
    runtime: runtimeStr,
    voltage: s.input_voltage ?? s.voltage ?? 0,
    load:    s.ups_load      ?? s.load    ?? 0,
    model:   data.config?.ups_name ?? s.ups_name ?? data.model ?? '—',
  };
}

// ── Terminal / Exec ───────────────────────────────────────────────────────────
export async function apiExec(command: string): Promise<{ output: string; ok: boolean }> {
  const res = await fetch(`${_base}/api/storage/exec`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Alerts / Notifications ────────────────────────────────────────────────────
export interface Alert {
  lvl: string;
  title: string;
  time: string;
  text: string;
}

export async function apiAlerts(): Promise<Alert[]> {
  // GET /api/notifications/history → returns cfg.History array directly
  // Each entry: { t, sev, rule, ch, msg, delivered }
  const data = await req<any>('/api/notifications/history');
  const arr = Array.isArray(data) ? data : (data.history ?? data.notifications ?? data.data ?? []);
  return arr.map((a: any) => ({
    lvl:   a.sev ?? a.level ?? a.lvl ?? a.type ?? 'info',
    title: a.rule ?? a.title ?? a.name ?? '—',
    time:  a.t ?? a.time ?? a.timestamp ?? '',
    text:  a.msg ?? a.message ?? a.text ?? '',
  }));
}
