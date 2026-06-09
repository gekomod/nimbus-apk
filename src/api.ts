// Nimbus API client — all real backend calls go here
// Backend: https://github.com/gekomod/nimbus

let _base = '';
let _token = '';

export function initApi(serverUrl: string, token: string) {
  _base = serverUrl.replace(/\/+$/, '');
  _token = token;
}

export function getBase() { return _base; }

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${_base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...((_token) ? { Authorization: `Bearer ${_token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token?: string;
  username?: string;
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
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

export async function apiDashboard(): Promise<DashboardData> {
  return req('/api/dashboard');
}

export async function apiOverview(): Promise<any> {
  return req('/api/overview');
}

// ── ZFS / Storage ─────────────────────────────────────────────────────────────
export interface Pool {
  name: string;
  status: string;
  usedPct: number;
  used: number;
  total: number;
  raid: string;
  smart?: string;
}

export interface Disk {
  dev: string;
  model: string;
  temp: number;
  smart: string;
  hours?: string;
}

export async function apiPools(): Promise<Pool[]> {
  const data = await req<any>('/api/zfs/pools');
  // Normalize various response shapes
  const arr = Array.isArray(data) ? data : (data.pools ?? data.data ?? []);
  return arr.map((p: any) => ({
    name: p.name ?? p.pool ?? '—',
    status: (p.status ?? p.state ?? 'unknown').toLowerCase(),
    usedPct: p.usedPct ?? p.used_pct ?? (p.used && p.size ? Math.round((p.used / p.size) * 100) : 0),
    used: p.used ?? p.usedBytes ?? 0,
    total: p.total ?? p.size ?? 0,
    raid: p.raid ?? p.vdev ?? p.config ?? '—',
    smart: p.smart ?? 'unknown',
  }));
}

export async function apiDisks(): Promise<Disk[]> {
  const data = await req<any>('/api/storage/disks');
  const arr = Array.isArray(data) ? data : (data.disks ?? data.data ?? []);
  return arr.map((d: any) => ({
    dev: d.dev ?? d.device ?? d.path ?? '—',
    model: d.model ?? d.name ?? '—',
    temp: d.temp ?? d.temperature ?? 0,
    smart: d.smart ?? d.health ?? 'unknown',
    hours: d.hours ?? d.power_on_hours ?? undefined,
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
    id: c.id ?? c.Id ?? c.name ?? '',
    name: (c.name ?? c.Names?.[0] ?? '—').replace(/^\//, ''),
    image: c.image ?? c.Image ?? '—',
    status: (c.status ?? c.State?.Status ?? c.state ?? 'unknown').toLowerCase(),
    cpu: c.cpu ?? c.cpu_percent ?? 0,
    ram: c.ram ?? c.memory_usage ?? c.mem ?? 0,
    port: c.port ?? (c.Ports?.[0] ? `${c.Ports[0].PublicPort ?? c.Ports[0].PrivatePort}` : undefined),
  }));
}

export async function apiContainerAction(id: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  await fetch(`${_base}/services/docker/containers/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
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
}

export async function apiNetwork(): Promise<{ interfaces: NetInterface[]; vpn?: any; firewall?: any }> {
  const data = await req<any>('/api/network');
  const ifaces = Array.isArray(data) ? data : (data.interfaces ?? data.data ?? []);
  return {
    interfaces: ifaces.map((i: any) => ({
      name: i.name ?? i.interface ?? '—',
      ip: i.ip ?? i.address ?? i.addr ?? '—',
      speed: i.speed ?? '—',
      up: i.up != null ? i.up : i.state === 'up',
      rx: i.rx ?? i.rx_bytes ?? undefined,
      tx: i.tx ?? i.tx_bytes ?? undefined,
    })),
    vpn: data.vpn ?? data.wireguard ?? null,
    firewall: data.firewall ?? data.ufw ?? null,
  };
}

// ── Services ──────────────────────────────────────────────────────────────────
export interface Service {
  name: string;
  desc: string;
  on: boolean;
}

export async function apiServices(): Promise<Service[]> {
  const endpoints = [
    { key: 'samba', name: 'Samba', desc: 'SMB / udziały sieciowe', url: '/services/samba/status' },
    { key: 'ssh', name: 'SSH', desc: 'OpenSSH · port 22', url: '/services/ssh/status' },
    { key: 'nfs', name: 'NFS', desc: 'NFS exports', url: '/services/nfs/status' },
    { key: 'ftp', name: 'FTP / SFTP', desc: 'vsftpd', url: '/services/ftp/status' },
  ];
  const results = await Promise.allSettled(endpoints.map(e => req<any>(e.url)));
  return endpoints.map((e, i) => {
    const r = results[i];
    const data = r.status === 'fulfilled' ? r.value : null;
    return {
      name: e.name,
      desc: e.desc,
      on: data?.running ?? data?.active ?? (data?.status === 'running' || false),
    };
  });
}

export async function apiServiceToggle(key: string, on: boolean): Promise<void> {
  await fetch(`${_base}/services/${key}/${on ? 'start' : 'stop'}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${_token}` },
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
  const data = await req<any>(`/api/system/logs?n=${n}`);
  const arr = Array.isArray(data) ? data : (data.logs ?? data.entries ?? data.data ?? []);
  return arr.map((e: any) => ({
    lvl: (e.level ?? e.lvl ?? e.severity ?? 'info').toLowerCase().replace('error', 'err'),
    t: e.time ?? e.t ?? e.timestamp ?? '',
    src: e.source ?? e.src ?? e.service ?? '',
    msg: e.message ?? e.msg ?? e.text ?? '',
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
  const data = await req<any>('/api/system/processes');
  const arr = Array.isArray(data) ? data : (data.processes ?? data.data ?? []);
  return arr.map((p: any) => ({
    pid: p.pid ?? 0,
    name: p.name ?? p.cmd ?? '—',
    cpu: p.cpu ?? p.cpu_percent ?? 0,
    mem: p.mem ?? p.mem_percent ?? p.memory ?? 0,
    user: p.user ?? p.username ?? '—',
  }));
}

export async function apiKillProcess(pid: number): Promise<void> {
  await fetch(`${_base}/api/system/processes/${pid}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${_token}` },
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
  const data = await req<any>('/api/users');
  const arr = Array.isArray(data) ? data : (data.users ?? data.data ?? []);
  return arr.map((u: any) => ({
    name: u.name ?? u.username ?? '—',
    role: u.role ?? u.group ?? '—',
    groups: Array.isArray(u.groups) ? u.groups.join(', ') : (u.groups ?? ''),
    on: u.enabled ?? u.active ?? u.on ?? true,
  }));
}

// ── Media ─────────────────────────────────────────────────────────────────────
export interface MediaService {
  name: string;
  kind: string;
  status: string;
  streams: number;
  lib: string;
}

export async function apiMedia(): Promise<MediaService[]> {
  const data = await req<any>('/api/media');
  const arr = Array.isArray(data) ? data : (data.services ?? data.data ?? []);
  return arr.map((m: any) => ({
    name: m.name ?? '—',
    kind: m.kind ?? m.type ?? 'film',
    status: m.status ?? 'unknown',
    streams: m.streams ?? m.active_streams ?? 0,
    lib: m.lib ?? m.library ?? '—',
  }));
}

// ── Antivirus ─────────────────────────────────────────────────────────────────
export interface ClamavStatus {
  protected: boolean;
  lastScan: string;
  threats: number;
  quarantine: number;
  scanned: number;
  realtime: boolean;
}

export async function apiClamav(): Promise<ClamavStatus> {
  const data = await req<any>('/api/antivirus/status');
  return {
    protected: data.protected ?? data.enabled ?? false,
    lastScan: data.lastScan ?? data.last_scan ?? '—',
    threats: data.threats ?? data.threats_found ?? 0,
    quarantine: data.quarantine ?? data.quarantined ?? 0,
    scanned: data.scanned ?? data.files_scanned ?? 0,
    realtime: data.realtime ?? data.real_time_protection ?? false,
  };
}

export async function apiClamavScan(): Promise<void> {
  await fetch(`${_base}/api/antivirus/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${_token}` },
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
  const data = await req<any>('/api/ups/status');
  return {
    battery: data.battery ?? data.battery_charge ?? 0,
    mode: data.mode ?? data.ups_status ?? 'unknown',
    runtime: data.runtime ?? data.battery_runtime ?? '—',
    voltage: data.voltage ?? data.input_voltage ?? 0,
    load: data.load ?? data.ups_load ?? 0,
    model: data.model ?? data.name ?? '—',
  };
}

// ── Alerts / Notifications ────────────────────────────────────────────────────
export interface Alert {
  lvl: string;
  title: string;
  time: string;
  text: string;
}

export async function apiAlerts(): Promise<Alert[]> {
  const data = await req<any>('/api/notifications');
  const arr = Array.isArray(data) ? data : (data.notifications ?? data.alerts ?? data.data ?? []);
  return arr.map((a: any) => ({
    lvl: a.level ?? a.lvl ?? a.type ?? 'info',
    title: a.title ?? a.name ?? '—',
    time: a.time ?? a.timestamp ?? a.created_at ?? '',
    text: a.message ?? a.text ?? a.body ?? '',
  }));
}
