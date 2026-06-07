export interface UpdateInfo {
  version: string;
  url: string;
  notes: string;
}

function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map(n => parseInt(n, 10) || 0);
  const b = current.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch('https://api.github.com/repos/gekomod/nimbus-apk/releases/latest');
    if (!res.ok) return null;
    const json = await res.json();
    const latest = String(json.tag_name ?? '').replace(/^v/i, '').trim();
    if (!latest || !isNewer(latest, currentVersion)) return null;

    const apkAsset = (json.assets ?? []).find((a: any) => a.name?.toLowerCase().endsWith('.apk'));
    return {
      version: latest,
      url: apkAsset?.browser_download_url ?? json.html_url ?? 'https://github.com/gekomod/nimbus-apk/releases/latest',
      notes: String(json.body ?? '').trim(),
    };
  } catch {
    return null;
  }
}
