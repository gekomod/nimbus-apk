// Mock data for Nimbus NAS panel

export const SERVER = { name: 'nimbus-nas', host: '192.168.1.10', version: 'v3.5', uptime: '18d 04:21', os: 'Debian 12' };
export const SYSTEM = { cpu: 23, ram: 61, ramUsed: 19.6, ramTotal: 32, temp: 47, load: [0.84, 1.02, 0.91], down: 42.6, up: 8.3 };

export const POOLS = [
  { name: 'tank', status: 'healthy', usedPct: 68, used: 10.9, total: 16, raid: 'RAIDZ1 · 4×4TB', smart: 'passed' },
  { name: 'backup', status: 'healthy', usedPct: 41, used: 3.3, total: 8, raid: 'MIRROR · 2×4TB', smart: 'passed' },
  { name: 'fast', status: 'degraded', usedPct: 88, used: 0.88, total: 1, raid: 'NVMe · 1TB', smart: 'warn' },
];

export const DISKS = [
  { dev: '/dev/sda', model: 'WD Red 4TB', temp: 38, smart: 'passed', hours: '21 480 h' },
  { dev: '/dev/sdb', model: 'WD Red 4TB', temp: 39, smart: 'passed', hours: '21 480 h' },
  { dev: '/dev/sdc', model: 'WD Red 4TB', temp: 41, smart: 'passed', hours: '14 220 h' },
  { dev: '/dev/nvme0', model: 'Samsung 980 1TB', temp: 52, smart: 'warn', hours: '8 940 h' },
];

export const CONTAINERS = [
  { name: 'jellyfin', image: 'jellyfin/jellyfin', status: 'running', cpu: 12, ram: 640, port: '8096' },
  { name: 'nextcloud', image: 'nextcloud:28', status: 'running', cpu: 4, ram: 410, port: '443' },
  { name: 'postgres', image: 'postgres:16', status: 'running', cpu: 2, ram: 220, port: '5432' },
  { name: 'pihole', image: 'pihole/pihole', status: 'running', cpu: 1, ram: 96, port: '53' },
  { name: 'vaultwarden', image: 'vaultwarden/server', status: 'running', cpu: 1, ram: 64, port: '8000' },
  { name: 'gitea', image: 'gitea/gitea', status: 'stopped', cpu: 0, ram: 0, port: '3000' },
  { name: 'grafana', image: 'grafana/grafana', status: 'stopped', cpu: 0, ram: 0, port: '3001' },
];

export const SERVICES = [
  { name: 'Samba', desc: 'SMB / udziały sieciowe', on: true },
  { name: 'SSH', desc: 'OpenSSH · port 22', on: true },
  { name: 'NFS', desc: '3 eksporty', on: true },
  { name: 'FTP / SFTP', desc: 'vsftpd', on: false },
  { name: 'WebDAV', desc: 'port 8080', on: false },
];

export const INTERFACES = [
  { name: 'eth0', ip: '192.168.1.10', speed: '1 Gb/s', up: true },
  { name: 'eth1', ip: '10.0.0.1', speed: '2.5 Gb/s', up: true },
  { name: 'wg0', ip: '10.8.0.1', speed: 'VPN', up: true },
];

export const VPN = { peers: 4, online: 3 };
export const FIREWALL = { enabled: true, rules: 14 };

export const MEDIA = [
  { name: 'Jellyfin', kind: 'film', status: 'online', streams: 2, lib: '2 184 filmów' },
  { name: 'Plex', kind: 'film', status: 'online', streams: 0, lib: '418 seriali' },
  { name: 'Navidrome', kind: 'music', status: 'online', streams: 1, lib: '12 940 utworów' },
  { name: 'Emby', kind: 'film', status: 'offline', streams: 0, lib: '—' },
];

export const CLAMAV = { protected: true, lastScan: '2 godz. temu', threats: 0, quarantine: 3, scanned: 184302, realtime: true };
export const UPS = { battery: 100, mode: 'on_line', runtime: '47 min', voltage: 231, load: 28, model: 'PowerWalker VI 1500' };

export const PROCESSES = [
  { pid: 1442, name: 'jellyfin', cpu: 12.4, mem: 2.1, user: 'jellyfin' },
  { pid: 880, name: 'dockerd', cpu: 6.1, mem: 1.4, user: 'root' },
  { pid: 2231, name: 'postgres', cpu: 4.8, mem: 0.7, user: 'postgres' },
  { pid: 512, name: 'smbd', cpu: 2.2, mem: 0.3, user: 'root' },
  { pid: 99, name: 'zfs', cpu: 1.9, mem: 0.9, user: 'root' },
  { pid: 1, name: 'systemd', cpu: 0.4, mem: 0.1, user: 'root' },
];

export const LOGS = [
  { lvl: 'info', t: '09:41:02', src: 'nimbus', msg: 'Dashboard refreshed (14 handlers, 38ms)' },
  { lvl: 'info', t: '09:40:55', src: 'docker', msg: 'Container jellyfin healthcheck OK' },
  { lvl: 'warn', t: '09:38:11', src: 'smart', msg: 'nvme0: temperature 52°C above 50°C threshold' },
  { lvl: 'info', t: '09:35:00', src: 'cron', msg: 'Scheduled ZFS scrub on tank started' },
  { lvl: 'info', t: '09:31:48', src: 'auth', msg: 'User admin logged in from 192.168.1.44' },
  { lvl: 'err', t: '09:22:09', src: 'nfs', msg: 'Export /mnt/tank/media stalled, retrying (soft)' },
  { lvl: 'info', t: '09:15:30', src: 'clamav', msg: 'Signature database updated (freshclam)' },
];

export const USERS_LIST = [
  { name: 'admin', role: 'Administrator', groups: 'sudo, docker', on: true },
  { name: 'maria', role: 'Użytkownik', groups: 'media, users', on: true },
  { name: 'backup', role: 'Usługa', groups: 'backup', on: false },
  { name: 'jellyfin', role: 'Usługa', groups: 'media', on: true },
];

export const ALERTS = [
  { lvl: 'warn', title: 'Dysk nvme0 gorący', time: '3 min temu', text: 'Temperatura 52°C przekroczyła próg' },
  { lvl: 'ok', title: 'Backup ukończony', time: '1 godz. temu', text: 'tank → backup · 3.3 TB zsynchronizowane' },
  { lvl: 'info', title: 'Aktualizacje apt', time: '2 godz. temu', text: '7 pakietów do aktualizacji' },
];
