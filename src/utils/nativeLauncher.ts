import { AndroidAppShortcut } from '../types/launcher';
import { buildAndroidLaunchUrl } from './configParser';

export interface NativeInstalledApp {
  name: string;
  packageName: string;
  iconDataUrl: string;
}

export type AndroidSettingsTarget =
  | 'home'
  | 'notifications'
  | 'overlay'
  | 'unknown_sources'
  | 'wifi'
  | 'bluetooth'
  | 'app_details';

interface W800iNativePlugin {
  getInstalledApps: () => Promise<{ apps: NativeInstalledApp[] }>;
  launchApp: (opts: { packageName: string }) => Promise<{ launched: boolean }>;
  openExternalUrl?: (opts: { url: string }) => Promise<{ opened: boolean }>;
  isDefaultLauncher: () => Promise<{ isDefault: boolean }>;
  openSystemSettings: (opts: { target: AndroidSettingsTarget }) => Promise<{ opened: boolean }>;
  downloadAndInstallApk: (opts: {
    url: string;
    fileName?: string;
  }) => Promise<{ started: boolean; needsPermission?: boolean }>;
  addListener?: (
    eventName: string,
    cb: (data: { progress?: number }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
}

interface CapacitorBridgeWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      W800iLauncher?: W800iNativePlugin;
    };
  };
}

function getNativePlugin(): W800iNativePlugin | null {
  if (typeof window === 'undefined') return null;
  const win = window as CapacitorBridgeWindow;
  return win.Capacitor?.Plugins?.W800iLauncher || null;
}

export function isNativeAndroidApk(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as CapacitorBridgeWindow;
  return Boolean(win.Capacitor?.isNativePlatform?.() || win.Capacitor?.Plugins?.W800iLauncher);
}

export async function fetchNativeInstalledApps(): Promise<NativeInstalledApp[]> {
  const plugin = getNativePlugin();
  if (!plugin) return [];
  try {
    const res = await plugin.getInstalledApps();
    return Array.isArray(res?.apps) ? res.apps : [];
  } catch {
    return [];
  }
}

export async function launchNativeOrFallbackApp(app: AndroidAppShortcut): Promise<{
  mode: 'native' | 'web';
  ok: boolean;
}> {
  const plugin = getNativePlugin();
  if (plugin && app.packageName) {
    try {
      await plugin.launchApp({ packageName: app.packageName });
      return { mode: 'native', ok: true };
    } catch {
      // Fallback to intent/URL if package missing
    }
  }

  const targetUrl = buildAndroidLaunchUrl(app);
  const link = document.createElement('a');
  link.href = targetUrl;
  if (targetUrl.startsWith('http')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { mode: 'web', ok: true };
}

export async function openExternalUrlNative(url: string): Promise<boolean> {
  const plugin = getNativePlugin();
  if (plugin?.openExternalUrl) {
    try {
      await plugin.openExternalUrl({ url });
      return true;
    } catch {
      // Fall through to link click
    }
  }
  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
  return false;
}

export async function checkIsDefaultHomeLauncher(): Promise<boolean> {
  const plugin = getNativePlugin();
  if (!plugin) return false;
  try {
    const res = await plugin.isDefaultLauncher();
    return Boolean(res?.isDefault);
  } catch {
    return false;
  }
}

export async function openAndroidSystemSettings(target: AndroidSettingsTarget): Promise<boolean> {
  const plugin = getNativePlugin();
  if (!plugin) return false;
  try {
    await plugin.openSystemSettings({ target });
    return true;
  } catch {
    return false;
  }
}

export async function downloadAndInstallApkNative(
  url: string,
  fileName?: string | null
): Promise<{ started: boolean; needsPermission?: boolean; error?: string }> {
  const plugin = getNativePlugin();
  if (!plugin) {
    return { started: false, error: 'Solo disponible dentro del APK nativo.' };
  }
  try {
    const res = await plugin.downloadAndInstallApk({
      url,
      fileName: fileName || 'w800i-walkman-launcher.apk',
    });
    return {
      started: Boolean(res?.started),
      needsPermission: Boolean(res?.needsPermission),
    };
  } catch (err) {
    return {
      started: false,
      error: err instanceof Error ? err.message : 'Error descargando APK.',
    };
  }
}

export async function attachApkDownloadProgressListener(
  onProgress: (pct: number) => void
): Promise<() => void> {
  const plugin = getNativePlugin();
  if (!plugin?.addListener) return () => {};
  try {
    const handle = await plugin.addListener('apkDownloadProgress', (data) => {
      if (typeof data?.progress === 'number') {
        onProgress(data.progress);
      }
    });
    return () => {
      handle.remove().catch(() => {});
    };
  } catch {
    return () => {};
  }
}

export function listenNativeApkDownloadProgress(onProgress: (pct: number) => void): () => void {
  const plugin = getNativePlugin();
  if (!plugin?.addListener) return () => {};

  let removed = false;
  let handleRef: { remove: () => Promise<void> } | null = null;

  plugin
    .addListener('apkDownloadProgress', (data) => {
      if (!removed && typeof data?.progress === 'number') {
        onProgress(data.progress);
      }
    })
    .then((handle) => {
      if (removed) {
        handle.remove().catch(() => {});
      } else {
        handleRef = handle;
      }
    })
    .catch(() => {});

  return () => {
    removed = true;
    handleRef?.remove().catch(() => {});
  };
}
