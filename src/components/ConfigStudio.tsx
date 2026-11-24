import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FolderUp,
  GitBranch,
  Grid3X3,
  Headphones,
  ImagePlus,
  LayoutGrid,
  MapPin,
  Maximize,
  Palette,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  StickyNote,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  AndroidAppShortcut,
  APP_VERSION,
  AppIconType,
  ChassisSkin,
  ContactEntry,
  DesktopWidgetId,
  GithubBuildInfo,
  LauncherConfig,
  MainMenuSlot,
  ScreenId,
  WalkmanTrack,
  WallpaperStyle,
} from '../types/launcher';
import {
  DEFAULT_MENU_ITEMS,
  parseExternalConfig,
  WEATHER_CITIES,
  WIDGET_CATALOG,
} from '../utils/configParser';
import { AndroidSettingsTarget } from '../utils/nativeLauncher';
import { renderShortcutIcon } from './screens/PhoneScreens';

type StudioTab = 'apps' | 'menu' | 'customize' | 'widgets' | 'android' | 'import';

interface ConfigStudioProps {
  config: LauncherConfig;
  onUpdateConfig: (updater: (prev: LauncherConfig) => LauncherConfig) => void;
  onResetConfig: () => void;
  onAddLocalTracks: (tracks: WalkmanTrack[]) => void;
  onNavigatePhone: (screen: ScreenId) => void;
  isNativeApk: boolean;
  isDefaultLauncher: boolean;
  syncingNativeApps: boolean;
  apkDownloadProgress: number | null;
  apkUpdateError?: string | null;
  onSetDefaultLauncher: () => void;
  onSyncNativeApps: () => void;
  onOpenAndroidSettings: (target: AndroidSettingsTarget) => void;
  githubInfo: GithubBuildInfo;
  onCheckGithubBuild: (repoOverride?: string) => void;
  onInstallGithubApk: () => void;
  onFallbackBrowserApk?: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => void;
  onSendCustomSonyNotification: (title: string, body: string, appName: string) => void;
  fullscreenActive: boolean;
  onToggleFullscreen: () => void;
  onLaunchApp: (app: AndroidAppShortcut) => void;
}

const SCREEN_OPTIONS: Array<{ id: ScreenId; label: string }> = [
  { id: 'walkman', label: 'Walkman HUD' },
  { id: 'apps', label: 'Apps Android' },
  { id: 'dialer', label: 'Teléfono / Marcador' },
  { id: 'messages', label: 'Mensajes T9' },
  { id: 'contacts', label: 'Contactos' },
  { id: 'camera', label: 'Cámara 2MP' },
  { id: 'gallery', label: 'Galería' },
  { id: 'game', label: 'Hyper Snake' },
  { id: 'radio', label: 'Radio FM' },
  { id: 'organizer', label: 'Calculadora' },
  { id: 'notifications', label: 'Notificaciones Sony' },
  { id: 'settings', label: 'Centro Config' },
  { id: 'standby', label: 'Escritorio Standby' },
];

const ACCENT_PRESETS = ['#FF731D', '#00E5FF', '#10B981', '#EC4899', '#FACC15', '#A855F7'];

async function compressImageToDataUrl(
  file: File,
  maxDim: number,
  mime: 'image/png' | 'image/jpeg',
  quality = 0.86
): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/svg+xml') {
    return rawUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(mime, quality));
    };
    img.onerror = () => resolve(rawUrl);
    img.src = rawUrl;
  });
}

export const ConfigStudio: React.FC<ConfigStudioProps> = ({
  config,
  onUpdateConfig,
  onResetConfig,
  onAddLocalTracks,
  onNavigatePhone,
  isNativeApk,
  isDefaultLauncher,
  syncingNativeApps,
  apkDownloadProgress,
  apkUpdateError,
  onSetDefaultLauncher,
  onSyncNativeApps,
  onOpenAndroidSettings,
  githubInfo,
  onCheckGithubBuild,
  onInstallGithubApk,
  onFallbackBrowserApk,
  notificationPermission,
  onRequestNotifications,
  onSendCustomSonyNotification,
  fullscreenActive,
  onToggleFullscreen,
  onLaunchApp,
}) => {
  const [tab, setTab] = useState<StudioTab>('apps');
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ type: 'ok' | 'err'; lines: string[] } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [githubRepoInput, setGithubRepoInput] = useState(config.githubRepo);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);

  useEffect(() => {
    setGithubRepoInput(config.githubRepo);
  }, [config.githubRepo]);

  const showStudioNotice = (msg: string) => {
    setStudioNotice(msg);
    window.setTimeout(() => {
      setStudioNotice((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Custom notification tester
  const [notifApp, setNotifApp] = useState('WhatsApp');
  const [notifTitle, setNotifTitle] = useState('Lucía Méndez');
  const [notifBody, setNotifBody] = useState('¿Pasamos por el estudio a las 19:00?');

  // New Android App form
  const [newName, setNewName] = useState('');
  const [newPackage, setNewPackage] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newQuickKey, setNewQuickKey] = useState('');
  const [newIconType, setNewIconType] = useState<AppIconType>('globe');
  const [newIconDataUrl, setNewIconDataUrl] = useState<string>('');

  // New Contact & Quick Note form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const newAppIconInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const pkg = newPackage.trim();
    const url =
      newUrl.trim() ||
      (pkg ? `https://play.google.com/store/apps/details?id=${pkg}` : 'https://www.google.com/');

    const app: AndroidAppShortcut = {
      id: `app-${Date.now()}`,
      name: newName.trim().slice(0, 22),
      packageName: pkg,
      urlScheme: url,
      category: pkg ? 'Android App' : 'Acceso Web',
      quickKey: newQuickKey.trim().slice(0, 1) || undefined,
      iconType: newIconType,
      iconDataUrl: newIconDataUrl || undefined,
    };

    onUpdateConfig((prev) => ({
      ...prev,
      apps: [...prev.apps, app],
    }));

    setNewName('');
    setNewPackage('');
    setNewUrl('');
    setNewQuickKey('');
    setNewIconDataUrl('');
    onNavigatePhone('apps');
  };

  const handleMoveApp = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= config.apps.length) return;
    onUpdateConfig((prev) => {
      const list = [...prev.apps];
      const [item] = list.splice(idx, 1);
      list.splice(nextIdx, 0, item);
      return { ...prev, apps: list };
    });
  };

  const handleUploadAppIcon = async (appId: string, file: File) => {
    const dataUrl = await compressImageToDataUrl(file, 128, 'image/png');
    onUpdateConfig((prev) => ({
      ...prev,
      apps: prev.apps.map((a) => (a.id === appId ? { ...a, iconDataUrl: dataUrl } : a)),
    }));
    showStudioNotice('Icono personalizado guardado.');
  };

  const handleUploadMenuSlotIcon = async (slotId: string, file: File) => {
    const dataUrl = await compressImageToDataUrl(file, 128, 'image/png');
    onUpdateConfig((prev) => ({
      ...prev,
      menuItems: prev.menuItems.map((m) => (m.id === slotId ? { ...m, iconDataUrl: dataUrl } : m)),
    }));
    showStudioNotice('Icono del menú actualizado.');
  };

  const handleUploadWallpaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageToDataUrl(file, 720, 'image/jpeg', 0.82);
    onUpdateConfig((prev) => ({ ...prev, customWallpaperUrl: dataUrl }));
    showStudioNotice('Fondo OLED personalizado aplicado.');
    e.target.value = '';
  };

  const handleDeleteApp = (id: string) => {
    onUpdateConfig((prev) => ({
      ...prev,
      apps: prev.apps.filter((a) => a.id !== id),
    }));
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    const entry: ContactEntry = {
      id: `c-${Date.now()}`,
      name: contactName.trim().slice(0, 22),
      phone: contactPhone.trim().slice(0, 20),
    };
    onUpdateConfig((prev) => ({
      ...prev,
      contacts: [...prev.contacts, entry],
    }));
    setContactName('');
    setContactPhone('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    onUpdateConfig((prev) => ({
      ...prev,
      quickNotes: [noteInput.trim(), ...prev.quickNotes],
    }));
    setNoteInput('');
  };

  const handleParseAndImport = () => {
    const result = parseExternalConfig(importText);
    if (result.error) {
      setImportFeedback({ type: 'err', lines: [result.error] });
      return;
    }
    onUpdateConfig((prev) => ({
      ...prev,
      ...result.patch,
    }));
    setImportFeedback({ type: 'ok', lines: result.detectedItems });
  };

  const handleUploadJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setImportText(content);
      const result = parseExternalConfig(content);
      if (result.error) {
        setImportFeedback({ type: 'err', lines: [result.error] });
      } else {
        onUpdateConfig((prev) => ({ ...prev, ...result.patch }));
        setImportFeedback({ type: 'ok', lines: result.detectedItems });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUploadAudioFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newTracks: WalkmanTrack[] = files.map((file, idx) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      return {
        id: `local-${Date.now()}-${idx}`,
        artist: parts.length > 1 ? parts[0].trim() : 'Archivo Local',
        album: 'Memoria Android',
        title: parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName,
        durationSec: 180,
        bpm: 115,
        baseFreq: 329.63,
        customUrl: URL.createObjectURL(file),
      };
    });

    onAddLocalTracks(newTracks);
    onNavigatePhone('walkman');
    e.target.value = '';
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      setImportText(JSON.stringify(config, null, 2));
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'w800i-launcher-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
      {/* Native APK & Launcher Banner Card */}
      <section className="rounded-2xl bg-white border border-[#E2E0D8] p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div className="max-w-xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1A1C22]">
                APK Nativo Android Launcher · W800i
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                  isNativeApk
                    ? isDefaultLauncher
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-orange-50 text-[#C84A0E] border border-orange-200'
                    : 'bg-[#F3F2EE] text-[#4A4D56] border border-[#DCDAD1]'
                }`}
              >
                {isNativeApk
                  ? isDefaultLauncher
                    ? 'Launcher Home Activo'
                    : 'APK Nativo Instalado'
                  : 'Vista Web · APK en GitHub'}
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-[#575A63] leading-relaxed">
              Proyecto nativo con <strong>Home Launcher</strong>, lectura real de apps e iconos Android (<span className="font-mono">PackageManager</span>), notificaciones reales y actualización de APK desde GitHub. Personaliza los 12 iconos del menú, dock, carcasa, fondo OLED y widgets.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-[#6B6E78]">
              <span className="font-mono">{APP_VERSION}</span>
              <span aria-hidden="true">·</span>
              <span>Capacitor + Java Plugin Nativo</span>
              <span aria-hidden="true">·</span>
              <span>Sin PWA</span>
            </div>
          </div>

          <div className="w-full xl:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (isNativeApk) {
                  onSetDefaultLauncher();
                } else {
                  setTab('android');
                  showStudioNotice('Compila el APK en GitHub e instálalo para fijarlo como Launcher Home.');
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-[11.5px] sm:text-xs font-semibold transition-colors min-w-0 text-center cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isDefaultLauncher ? 'Launcher Activo ✓' : 'Elegir Launcher'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isNativeApk) {
                  onSyncNativeApps();
                } else {
                  setTab('apps');
                  showStudioNotice('En el APK instalado, este botón carga automáticamente todas tus apps e iconos PNG reales.');
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-xl border border-[#DCDAD1] hover:border-[#E85D1A] text-[#1A1C22] text-[11.5px] sm:text-xs font-semibold transition-colors min-w-0 text-center cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 text-[#E85D1A] ${syncingNativeApps ? 'animate-spin' : ''}`} />
              <span className="truncate">Sincronizar Apps</span>
            </button>

            {githubInfo.apkUrl ? (
              <button
                type="button"
                onClick={onInstallGithubApk}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-xl bg-[#1A1C22] hover:bg-[#2B2E38] text-white text-[11.5px] sm:text-xs font-semibold transition-colors min-w-0 text-center cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0 text-[#FF8C38]" />
                <span className="truncate">{githubInfo.updateAvailable ? 'Actualizar APK' : 'Descargar APK'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTab('android')}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-xl bg-[#1A1C22] hover:bg-[#2B2E38] text-white text-[11.5px] sm:text-xs font-semibold transition-colors min-w-0 text-center cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 shrink-0 text-[#FF8C38]" />
                <span className="truncate">APK GitHub</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl border border-[#DCDAD1] hover:border-[#1A1C22] text-[#1A1C22] text-[11.5px] sm:text-xs font-semibold transition-colors min-w-0 text-center cursor-pointer"
            >
              <Maximize className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{fullscreenActive ? 'Salir' : 'Inmersivo'}</span>
            </button>
          </div>
        </div>

        {apkDownloadProgress !== null && (
          <div className="mt-4 space-y-1.5">
            <div className="h-2 w-full rounded-full bg-[#ECEAE3] overflow-hidden">
              <div
                className="h-full bg-[#E85D1A] transition-all duration-150"
                style={{ width: `${Math.max(4, apkDownloadProgress)}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-mono text-[#E85D1A]">
                Descargando e iniciando instalador Android del APK: {apkDownloadProgress}%
              </p>
              {githubInfo.apkUrl && onFallbackBrowserApk && (
                <button
                  type="button"
                  onClick={onFallbackBrowserApk}
                  className="font-semibold text-[#1A1C22] underline hover:text-[#E85D1A] cursor-pointer"
                >
                  Descargar con navegador
                </button>
              )}
            </div>
          </div>
        )}

        {apkUpdateError && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>{apkUpdateError}</span>
            {githubInfo.apkUrl && onFallbackBrowserApk && (
              <button
                type="button"
                onClick={onFallbackBrowserApk}
                className="px-3 py-1 rounded-lg bg-[#E85D1A] text-white font-semibold cursor-pointer"
              >
                Descargar con navegador
              </button>
            )}
          </div>
        )}

        {studioNotice && (
          <div className="mt-3 rounded-xl bg-[#FFF7F3] border border-[#F0C8B2] px-3.5 py-2 text-xs text-[#9C3B0B] font-medium">
            {studioNotice}
          </div>
        )}
      </section>

      {/* Main Segmented Studio Panel */}
      <section className="rounded-2xl bg-white border border-[#E2E0D8] overflow-hidden">
        <div className="p-2.5 sm:p-4 border-b border-[#ECEAE3] bg-[#FAF9F6]">
          <div className="grid grid-cols-2 sm:inline-flex sm:flex-wrap items-center gap-1 p-1 rounded-xl bg-[#ECEAE2] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTab('apps')}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11.5px] sm:text-xs font-semibold transition-colors text-center truncate cursor-pointer ${
                tab === 'apps' ? 'bg-white text-[#1A1C22] shadow-sm' : 'text-[#5C5F68] hover:text-[#1A1C22]'
              }`}
            >
              Apps e Iconos ({config.apps.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('menu')}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11.5px] sm:text-xs font-semibold transition-colors text-center truncate cursor-pointer ${
                tab === 'menu' ? 'bg-white text-[#1A1C22] shadow-sm' : 'text-[#5C5F68] hover:text-[#1A1C22]'
              }`}
            >
              Menú 12 Iconos
            </button>
            <button
              type="button"
              onClick={() => setTab('customize')}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11.5px] sm:text-xs font-semibold transition-colors text-center truncate cursor-pointer ${
                tab === 'customize' ? 'bg-white text-[#1A1C22] shadow-sm' : 'text-[#5C5F68] hover:text-[#1A1C22]'
              }`}
            >
              Personalizar Todo
            </button>
            <button
              type="button"
              onClick={() => setTab('widgets')}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11.5px] sm:text-xs font-semibold transition-colors text-center truncate cursor-pointer ${
                tab === 'widgets' ? 'bg-white text-[#1A1C22] shadow-sm' : 'text-[#5C5F68] hover:text-[#1A1C22]'
              }`}
            >
              Widgets ({config.enabledWidgets.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('android')}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11.5px] sm:text-xs font-semibold transition-colors text-center truncate cursor-pointer ${
                tab === 'android' ? 'bg-white text-[#1A1C22] shadow-sm' : 'text-[#5C5F68] hover:text-[#1A1C22]'
              }`}
            >
              APK Nativo y GitHub
            </button>
            <button
              type="button"
              onClick={() => setTab('import')}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11.5px] sm:text-xs font-semibold transition-colors text-center truncate cursor-pointer ${
                tab === 'import' ? 'bg-white text-[#1A1C22] shadow-sm' : 'text-[#5C5F68] hover:text-[#1A1C22]'
              }`}
            >
              Importar / Backup
            </button>
          </div>
        </div>

        {/* TAB: APPS E ICONOS REALES */}
        {tab === 'apps' && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FAF9F6] border border-[#ECEAE3] p-3.5">
              <div>
                <h3 className="text-sm font-bold text-[#1A1C22]">Apps nativas e iconos reales</h3>
                <p className="mt-0.5 text-xs text-[#575A63]">
                  Las primeras <strong>4 apps</strong> aparecen en el dock rápido del escritorio. Sube iconos PNG/SVG o sincroniza todas las apps instaladas desde el APK.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isNativeApk) {
                    onSyncNativeApps();
                  } else {
                    showStudioNotice('Instala el APK en tu Android para leer automáticamente los iconos reales del teléfono. También puedes subir iconos PNG manualmente abajo.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingNativeApps ? 'animate-spin' : ''}`} />
                Sincronizar del Teléfono
              </button>
            </div>

            <div className="divide-y divide-[#ECEAE3] border border-[#E6E4DC] rounded-xl overflow-hidden">
              {config.apps.map((app, idx) => (
                <div
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-[#FAF9F6] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {app.iconDataUrl ? (
                      <img
                        src={app.iconDataUrl}
                        alt={app.name}
                        className="w-9 h-9 rounded-xl object-cover border border-[#E2E0D8] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#1A1C22] text-[#FF8C38] flex items-center justify-center shrink-0">
                        {renderShortcutIcon(app.iconType, 'w-4 h-4')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1A1C22] truncate">{app.name}</span>
                        {idx < 4 && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[10px] font-bold text-[#C84A0E]">
                            Dock {idx + 1}
                          </span>
                        )}
                        {app.quickKey && (
                          <span className="font-mono text-xs text-[#E85D1A] font-semibold">
                            Tecla {app.quickKey}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6B6E78] truncate">
                        <span>{app.category}</span>
                        {app.packageName && (
                          <>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span className="font-mono">{app.packageName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveApp(idx, -1)}
                      aria-label={`Subir ${app.name}`}
                      className="p-1.5 rounded-lg border border-[#E2E0D8] text-[#575A63] hover:text-[#1A1C22] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === config.apps.length - 1}
                      onClick={() => handleMoveApp(idx, 1)}
                      aria-label={`Bajar ${app.name}`}
                      className="p-1.5 rounded-lg border border-[#E2E0D8] text-[#575A63] hover:text-[#1A1C22] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCDAD1] text-xs font-semibold text-[#2B2D33] hover:border-[#E85D1A] hover:text-[#E85D1A] transition-colors cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" />
                      Icono
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadAppIcon(app.id, f);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onLaunchApp(app)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1A1C22] text-white text-xs font-semibold hover:bg-[#2E313B] transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteApp(app.id)}
                      aria-label={`Eliminar ${app.name}`}
                      className="p-1.5 rounded-lg text-[#7A7D87] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddApp} className="pt-2 space-y-4">
              <h3 className="text-sm font-bold text-[#1A1C22]">Agregar app nativa o acceso directo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#575A63] mb-1">Nombre de la app</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Telegram"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D6CE] text-sm focus:outline-none focus:border-[#E85D1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575A63] mb-1">Paquete Android (para APK)</label>
                  <input
                    type="text"
                    value={newPackage}
                    onChange={(e) => setNewPackage(e.target.value)}
                    placeholder="Ej. org.telegram.messenger"
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D6CE] text-sm font-mono focus:outline-none focus:border-[#E85D1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575A63] mb-1">URL / Esquema fallback</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://t.me/ o tel:"
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D6CE] text-sm focus:outline-none focus:border-[#E85D1A]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-[#575A63] mb-1">Tecla rápida</label>
                    <input
                      type="text"
                      maxLength={1}
                      value={newQuickKey}
                      onChange={(e) => setNewQuickKey(e.target.value)}
                      placeholder="9"
                      className="w-full px-3 py-2 rounded-lg border border-[#D8D6CE] text-sm font-mono focus:outline-none focus:border-[#E85D1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#575A63] mb-1">Icono HUD</label>
                    <select
                      value={newIconType}
                      onChange={(e) => setNewIconType(e.target.value as AppIconType)}
                      className="w-full px-2.5 py-2 rounded-lg border border-[#D8D6CE] text-sm bg-white focus:outline-none focus:border-[#E85D1A]"
                    >
                      <option value="globe">Web</option>
                      <option value="chat">Chat</option>
                      <option value="music">Música</option>
                      <option value="map">Mapa</option>
                      <option value="video">Video</option>
                      <option value="mail">Correo</option>
                      <option value="phone">Teléfono</option>
                      <option value="social">Social</option>
                      <option value="tools">Herramientas</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1C22] hover:bg-[#2E313B] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Añadir al Launcher
                </button>
                <button
                  type="button"
                  onClick={() => newAppIconInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D8D6CE] hover:border-[#E85D1A] text-xs font-semibold text-[#1A1C22] cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4 text-[#E85D1A]" />
                  {newIconDataUrl ? 'Icono PNG cargado ✓' : 'Subir icono personalizado'}
                </button>
                <input
                  ref={newAppIconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const url = await compressImageToDataUrl(f, 128, 'image/png');
                      setNewIconDataUrl(url);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </form>
          </div>
        )}

        {/* TAB: MENU 12 ICONOS PERSONALIZABLE */}
        {tab === 'menu' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1A1C22]">Editor del Menú Principal (12 Casillas)</h3>
                <p className="mt-0.5 text-xs text-[#575A63]">
                  Cambia el nombre, sube iconos PNG/SVG propios o asigna cualquier casilla directamente a una app nativa instalada.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigatePhone('menu')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E85D1A] text-white text-xs font-semibold cursor-pointer"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  Ver Menú en Sony
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateConfig((prev) => ({ ...prev, menuItems: DEFAULT_MENU_ITEMS }));
                    showStudioNotice('12 casillas del menú restauradas.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D8D6CE] text-xs font-semibold text-[#575A63] hover:text-[#1A1C22] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config.menuItems.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="rounded-xl border border-[#E6E4DC] bg-[#FCFBF9] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {slot.iconDataUrl ? (
                        <img
                          src={slot.iconDataUrl}
                          alt={slot.label}
                          className="w-8 h-8 rounded-lg object-cover border border-[#DCDAD1] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#1A1C22] text-[#FF8C38] flex items-center justify-center shrink-0 text-xs font-mono font-bold">
                          {slot.keyHint}
                        </div>
                      )}
                      <span className="text-xs font-mono text-[#6B6E78]">
                        Casilla #{idx + 1} · Tecla [{slot.keyHint}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#DCDAD1] bg-white text-[11px] font-semibold text-[#1A1C22] hover:border-[#E85D1A] cursor-pointer">
                        <ImagePlus className="w-3 h-3 text-[#E85D1A]" />
                        Icono
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadMenuSlotIcon(slot.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {slot.iconDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateConfig((prev) => ({
                              ...prev,
                              menuItems: prev.menuItems.map((m) =>
                                m.id === slot.id ? { ...m, iconDataUrl: undefined } : m
                              ),
                            }))
                          }
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-[#575A63] mb-0.5">Etiqueta</label>
                      <input
                        type="text"
                        value={slot.label}
                        maxLength={18}
                        onChange={(e) =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            menuItems: prev.menuItems.map((m) =>
                              m.id === slot.id ? { ...m, label: e.target.value } : m
                            ),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D6CE] bg-white text-xs focus:outline-none focus:border-[#E85D1A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#575A63] mb-0.5">Acción</label>
                      <select
                        value={slot.actionType}
                        onChange={(e) => {
                          const actionType = e.target.value as 'screen' | 'app';
                          const firstApp = config.apps[0];
                          onUpdateConfig((prev) => ({
                            ...prev,
                            menuItems: prev.menuItems.map((m) =>
                              m.id === slot.id
                                ? {
                                    ...m,
                                    actionType,
                                    packageName: actionType === 'app' ? m.packageName || firstApp?.packageName : m.packageName,
                                    urlScheme: actionType === 'app' ? m.urlScheme || firstApp?.urlScheme : m.urlScheme,
                                    iconDataUrl: actionType === 'app' && !m.iconDataUrl ? firstApp?.iconDataUrl : m.iconDataUrl,
                                  }
                                : m
                            ),
                          }));
                        }}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#D8D6CE] bg-white text-xs focus:outline-none focus:border-[#E85D1A]"
                      >
                        <option value="screen">Pantalla W800i</option>
                        <option value="app">Abrir App Nativa</option>
                      </select>
                    </div>
                  </div>

                  {slot.actionType === 'screen' ? (
                    <div>
                      <label className="block text-[11px] font-medium text-[#575A63] mb-0.5">Pantalla destino</label>
                      <select
                        value={slot.targetScreen}
                        onChange={(e) =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            menuItems: prev.menuItems.map((m) =>
                              m.id === slot.id ? { ...m, targetScreen: e.target.value as ScreenId } : m
                            ),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D6CE] bg-white text-xs focus:outline-none focus:border-[#E85D1A]"
                      >
                        {SCREEN_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-[#575A63] mb-0.5">App instalada</label>
                        <select
                          value={slot.packageName || ''}
                          onChange={(e) => {
                            const selected = config.apps.find((a) => a.packageName === e.target.value);
                            if (!selected) return;
                            onUpdateConfig((prev) => ({
                              ...prev,
                              menuItems: prev.menuItems.map((m) =>
                                m.id === slot.id
                                  ? {
                                      ...m,
                                      label: selected.name.slice(0, 16),
                                      packageName: selected.packageName,
                                      urlScheme: selected.urlScheme,
                                      iconType: selected.iconType,
                                      iconDataUrl: selected.iconDataUrl || m.iconDataUrl,
                                    }
                                  : m
                              ),
                            }));
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#D8D6CE] bg-white text-xs focus:outline-none focus:border-[#E85D1A]"
                        >
                          <option value="">-- Elegir app --</option>
                          {config.apps.map((a) => (
                            <option key={a.id} value={a.packageName || a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#575A63] mb-0.5">Paquete Android</label>
                        <input
                          type="text"
                          value={slot.packageName || ''}
                          placeholder="com.whatsapp"
                          onChange={(e) =>
                            onUpdateConfig((prev) => ({
                              ...prev,
                              menuItems: prev.menuItems.map((m) =>
                                m.id === slot.id ? { ...m, packageName: e.target.value.trim() } : m
                              ),
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D6CE] bg-white text-xs font-mono focus:outline-none focus:border-[#E85D1A]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PERSONALIZAR TODO (CHASSIS, COLORES, FONDO, CONTACTOS, NOTAS, MÚSICA) */}
        {tab === 'customize' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Chassis Skin + Custom Colors */}
            <div>
              <label className="block text-xs font-bold text-[#1A1C22] mb-2">Modelo de carcasa Sony Ericsson</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(
                  [
                    { id: 'w800i-white', label: 'W800i Blanco/Naranja', swatch: 'bg-gradient-to-r from-[#F4F3EE] to-[#E85D1A]' },
                    { id: 'w810i-black', label: 'W810i Negro Walkman', swatch: 'bg-gradient-to-r from-[#1E2026] to-[#E85D1A]' },
                    { id: 'w580i-silver', label: 'W580i Plata Urbano', swatch: 'bg-gradient-to-r from-[#D9DCE2] to-[#E85D1A]' },
                    { id: 'custom', label: 'Carcasa Personalizada', swatch: 'bg-gradient-to-r from-[#0EA5E9] via-[#EC4899] to-[#F59E0B]' },
                  ] as Array<{ id: ChassisSkin; label: string; swatch: string }>
                ).map((item) => {
                  const active = config.skin === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateConfig((prev) => ({ ...prev, skin: item.id }))}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active ? 'border-[#E85D1A] bg-[#FFF7F3]' : 'border-[#E2E0D8] hover:border-[#C5C2B8]'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full shrink-0 border border-black/15 ${item.swatch}`} />
                      <span className="text-xs font-semibold text-[#1A1C22]">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {config.skin === 'custom' && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-[#FAF9F6] border border-[#E2E0D8] p-3.5">
                  <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#1A1C22]">
                    <span>Color marco / lateral (Bezel)</span>
                    <input
                      type="color"
                      value={config.customBezelColor || '#D44A0F'}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({ ...prev, customBezelColor: e.target.value }))
                      }
                      className="w-10 h-8 rounded cursor-pointer border border-[#D8D6CE]"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#1A1C22]">
                    <span>Color frontal / teclado (Faceplate)</span>
                    <input
                      type="color"
                      value={config.customFaceColor || '#EEEDE6'}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({ ...prev, customFaceColor: e.target.value }))
                      }
                      className="w-10 h-8 rounded cursor-pointer border border-[#D8D6CE]"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* HUD Accent Color */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1A1C22] mb-2">
                <Palette className="w-3.5 h-3.5 text-[#E85D1A]" />
                Color de acento Hyper-HUD y menú
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onUpdateConfig((prev) => ({ ...prev, accentColor: hex }))}
                    aria-label={`Color ${hex}`}
                    className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${
                      config.accentColor === hex ? 'border-[#1A1C22] scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <label className="inline-flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg border border-[#D8D6CE] text-xs font-semibold cursor-pointer">
                  <span>Libre:</span>
                  <input
                    type="color"
                    value={config.accentColor || '#FF731D'}
                    onChange={(e) => onUpdateConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Texts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#575A63] mb-1">Texto superior del chasis</label>
                <input
                  type="text"
                  value={config.ownerName}
                  onChange={(e) => onUpdateConfig((prev) => ({ ...prev, ownerName: e.target.value }))}
                  maxLength={22}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D6CE] text-sm focus:outline-none focus:border-[#E85D1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#575A63] mb-1">Operadora en Standby</label>
                <input
                  type="text"
                  value={config.carrierText}
                  onChange={(e) => onUpdateConfig((prev) => ({ ...prev, carrierText: e.target.value }))}
                  maxLength={18}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D6CE] text-sm focus:outline-none focus:border-[#E85D1A]"
                />
              </div>
            </div>

            {/* Wallpaper & Custom Wallpaper Photo */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#1A1C22]">Fondo de pantalla OLED / Imagen propia</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'walkman-wave', label: 'Plasma Walkman' },
                    { id: 'orange-pulse', label: 'Naranja Neón' },
                    { id: 'pearl-minimal', label: 'Ciber Claro' },
                    { id: 'midnight-grid', label: 'Obsidiana 5G' },
                  ] as Array<{ id: WallpaperStyle; label: string }>
                ).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onUpdateConfig((prev) => ({ ...prev, wallpaper: w.id }))}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                      config.wallpaper === w.id
                        ? 'border-[#E85D1A] bg-[#E85D1A] text-white'
                        : 'border-[#DCDAD1] text-[#2B2D33] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FAF9F6] border border-[#ECEAE3] p-3">
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A1C22] text-white text-xs font-semibold cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#FF8C38]" />
                  {config.customWallpaperUrl ? 'Cambiar foto de fondo' : 'Subir foto de fondo'}
                </button>
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadWallpaper}
                  className="hidden"
                />
                {config.customWallpaperUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateConfig((prev) => ({ ...prev, customWallpaperUrl: '' }))}
                      className="px-3 py-2 rounded-xl border border-[#D8D6CE] text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Quitar fondo
                    </button>
                    <label className="flex items-center gap-2 text-xs font-medium text-[#575A63] sm:ml-auto">
                      <span className="shrink-0">Oscuridad ({config.wallpaperDim ?? 65}%):</span>
                      <input
                        type="range"
                        min={15}
                        max={90}
                        value={config.wallpaperDim ?? 65}
                        onChange={(e) =>
                          onUpdateConfig((prev) => ({ ...prev, wallpaperDim: Number(e.target.value) }))
                        }
                        className="accent-[#E85D1A] w-28 max-w-full"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Hardware & Audio Toggles */}
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B2D33] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.soundEnabled}
                  onChange={(e) => onUpdateConfig((prev) => ({ ...prev, soundEnabled: e.target.checked }))}
                  className="accent-[#E85D1A] w-4 h-4"
                />
                Sonido de teclas y DTMF
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B2D33] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hapticEnabled}
                  onChange={(e) => onUpdateConfig((prev) => ({ ...prev, hapticEnabled: e.target.checked }))}
                  className="accent-[#E85D1A] w-4 h-4"
                />
                Vibración háptica Android
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B2D33] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.lcdScanlines}
                  onChange={(e) => onUpdateConfig((prev) => ({ ...prev, lcdScanlines: e.target.checked }))}
                  className="accent-[#E85D1A] w-4 h-4"
                />
                Líneas de escaneo HUD
              </label>
            </div>

            {/* Contacts Editor */}
            <div className="pt-4 border-t border-[#ECEAE3] space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#E85D1A]" />
                <h4 className="text-sm font-bold text-[#1A1C22]">Agenda de Contactos ({config.contacts.length})</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[#E6E4DC] bg-[#FAF9F6] text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#1A1C22] truncate">{c.name}</div>
                      <div className="font-mono text-[#575A63] truncate">{c.phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          contacts: prev.contacts.filter((x) => x.id !== c.id),
                        }))
                      }
                      aria-label={`Eliminar contacto ${c.name}`}
                      className="p-1 text-[#7A7D87] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddContact} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre contacto"
                  className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-[#D8D6CE] text-xs"
                />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+54911..."
                  className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-[#D8D6CE] text-xs font-mono"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#1A1C22] text-white text-xs font-semibold cursor-pointer"
                >
                  + Contacto
                </button>
              </form>
            </div>

            {/* Quick Notes Editor */}
            <div className="pt-4 border-t border-[#ECEAE3] space-y-3">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#E85D1A]" />
                <h4 className="text-sm font-bold text-[#1A1C22]">Notas Rápidas ({config.quickNotes.length})</h4>
              </div>
              <div className="space-y-1.5">
                {config.quickNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[#E6E4DC] bg-[#FAF9F6] text-xs"
                  >
                    <span className="text-[#1A1C22] truncate">{note}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          quickNotes: prev.quickNotes.filter((_, i) => i !== idx),
                        }))
                      }
                      className="p-1 text-[#7A7D87] hover:text-red-600 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Escribe una nota para el widget HUD..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#D8D6CE] text-xs"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#1A1C22] text-white text-xs font-semibold cursor-pointer"
                >
                  + Nota
                </button>
              </form>
            </div>

            {/* Walkman Music Manager */}
            <div className="pt-4 border-t border-[#ECEAE3] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#1A1C22]">
                  Música del Walkman ({config.tracks.length} pistas)
                </div>
                <div className="text-xs text-[#6B6E78]">
                  Carga archivos MP3, M4A o WAV desde tu Android o PC.
                </div>
              </div>
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Headphones className="w-4 h-4" />
                Agregar MP3 / Audio
              </button>
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleUploadAudioFiles}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* TAB: DESKTOP WIDGETS HUD */}
        {tab === 'widgets' && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1A1C22]">Widgets de Escritorio Hyper-HUD</h3>
                <p className="mt-0.5 text-xs text-[#575A63]">
                  Activa o desactiva widgets para la pantalla de inicio del W800i. En el teléfono usa ◄ ► para rotarlos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigatePhone('standby')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Ver Escritorio W800i
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1C22] mb-2">Disposición en pantalla</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onUpdateConfig((prev) => ({ ...prev, widgetLayout: 'carousel' }))}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    config.widgetLayout === 'carousel'
                      ? 'border-[#E85D1A] bg-[#FFF7F3]'
                      : 'border-[#E2E0D8] hover:border-[#C5C2B8]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1C22]">Carrusel Completo</div>
                  <div className="text-[11px] text-[#575A63] mt-0.5">Un widget grande por vista (Calendario/Clima)</div>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig((prev) => ({ ...prev, widgetLayout: 'stacked' }))}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    config.widgetLayout === 'stacked'
                      ? 'border-[#E85D1A] bg-[#FFF7F3]'
                      : 'border-[#E2E0D8] hover:border-[#C5C2B8]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1C22]">Doble Apilado</div>
                  <div className="text-[11px] text-[#575A63] mt-0.5">Dos widgets simultáneos en la pantalla OLED</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WIDGET_CATALOG.map((w) => {
                const active = config.enabledWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      onUpdateConfig((prev) => {
                        const exists = prev.enabledWidgets.includes(w.id);
                        if (exists && prev.enabledWidgets.length <= 1) return prev;
                        const next: DesktopWidgetId[] = exists
                          ? prev.enabledWidgets.filter((item) => item !== w.id)
                          : [...prev.enabledWidgets, w.id];
                        return { ...prev, enabledWidgets: next };
                      });
                    }}
                    className={`flex items-start justify-between gap-2 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      active ? 'border-[#E85D1A] bg-[#FFF7F3]' : 'border-[#E2E0D8] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1A1C22]">{w.name}</div>
                      <div className="text-[11px] text-[#575A63] mt-0.5">{w.desc}</div>
                    </div>
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        active ? 'bg-[#E85D1A] text-white' : 'border border-[#C8C5BC] text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#ECEAE3] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#1A1C22]">Ubicación para Widget de Clima</label>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition((pos) => {
                      onUpdateConfig((prev) => ({
                        ...prev,
                        weatherLocation: {
                          city: 'Mi Ubicación',
                          lat: Number(pos.coords.latitude.toFixed(4)),
                          lon: Number(pos.coords.longitude.toFixed(4)),
                        },
                      }));
                    });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#E85D1A] hover:underline cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Detectar GPS actual
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEATHER_CITIES.map((c) => {
                  const selected = config.weatherLocation.city === c.city;
                  return (
                    <button
                      key={c.city}
                      type="button"
                      onClick={() => onUpdateConfig((prev) => ({ ...prev, weatherLocation: c }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        selected
                          ? 'border-[#1A1C22] bg-[#1A1C22] text-white'
                          : 'border-[#DCDAD1] text-[#2B2D33] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      {c.city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: APK NATIVO, PERMISOS ANDROID Y GITHUB */}
        {tab === 'android' && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* GitHub Compilation Direct Installer & Updater */}
            <div className="rounded-xl border border-[#F0C8B2] bg-[#FFF8F4] p-4 space-y-3.5 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#E85D1A] shrink-0" />
                    <span className="text-sm font-bold text-[#1A1C22]">
                      Actualizar e Instalar APK desde GitHub
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#575A63] leading-relaxed">
                    Conecta tu repositorio de GitHub donde subiste este proyecto para descargar o actualizar el APK directamente desde la app.
                  </p>
                </div>
                {githubInfo.lastCheckedAt && (
                  <span className="font-mono text-[11px] text-[#6B6E78] bg-white px-2 py-0.5 rounded-md border border-[#ECEAE3]">
                    {githubInfo.lastCheckedAt}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1A1C22]">
                  Repositorio GitHub (<span className="font-mono text-[#E85D1A]">usuario/repositorio</span> o enlace completo)
                </label>
                <input
                  type="text"
                  value={githubRepoInput}
                  onChange={(e) => setGithubRepoInput(e.target.value)}
                  onBlur={() =>
                    onUpdateConfig((prev) => ({ ...prev, githubRepo: githubRepoInput.trim() }))
                  }
                  placeholder="ej. somosmomodsomosmomod/w800i-launcher"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D8D6CE] bg-white text-xs font-mono text-[#1A1C22] placeholder:text-[#8E929C] focus:outline-none focus:border-[#E85D1A]"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const clean = githubRepoInput.trim();
                      onUpdateConfig((prev) => ({ ...prev, githubRepo: clean }));
                      onCheckGithubBuild(clean);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#D8D6CE] bg-white hover:bg-[#F3F2EE] text-xs font-semibold text-[#1A1C22] cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#E85D1A] ${githubInfo.checking ? 'animate-spin' : ''}`} />
                    Comprobar GitHub
                  </button>

                  {githubInfo.apkUrl ? (
                    <button
                      type="button"
                      onClick={onInstallGithubApk}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {githubInfo.updateAvailable ? 'Actualizar APK ahora' : 'Instalar / Descargar APK'}
                    </button>
                  ) : githubInfo.repo && githubInfo.repo.includes('/') ? (
                    <a
                      href={`https://github.com/${githubInfo.repo}/releases`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1A1C22] hover:bg-[#2B2E38] text-white text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#FF8C38]" />
                      Abrir Releases en GitHub
                    </a>
                  ) : (
                    <div className="hidden sm:flex items-center px-3 py-2 rounded-xl bg-white/70 border border-[#EDE3DC] text-[11px] text-[#6B6E78]">
                      Ejemplo: <span className="font-mono ml-1 text-[#1A1C22]">tu-usuario/w800i</span>
                    </div>
                  )}
                </div>
              </div>

              {apkDownloadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-[#ECEAE3] overflow-hidden">
                    <div
                      className="h-full bg-[#E85D1A] transition-all duration-150"
                      style={{ width: `${Math.max(4, apkDownloadProgress)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p className="font-mono text-[#E85D1A]">Descargando e instalando APK: {apkDownloadProgress}%</p>
                    {githubInfo.apkUrl && onFallbackBrowserApk && (
                      <button
                        type="button"
                        onClick={onFallbackBrowserApk}
                        className="font-semibold text-[#1A1C22] underline hover:text-[#E85D1A] cursor-pointer"
                      >
                        ¿Se queda en 0%? Descargar con navegador
                      </button>
                    )}
                  </div>
                </div>
              )}

              {apkUpdateError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 space-y-2">
                  <p>{apkUpdateError}</p>
                  {githubInfo.apkUrl && onFallbackBrowserApk && (
                    <button
                      type="button"
                      onClick={onFallbackBrowserApk}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E85D1A] text-white font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar APK con navegador
                    </button>
                  )}
                </div>
              )}

              {/* Status or Clear 3-Step Guide */}
              {githubInfo.apkUrl ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-emerald-800 truncate">
                      ✓ {githubInfo.apkName || 'w800i-walkman-launcher.apk'} listo
                    </div>
                    <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                      Release: {githubInfo.releaseTag || 'latest'}
                      {githubInfo.apkSizeMb ? ` · ${githubInfo.apkSizeMb}` : ''}
                    </div>
                  </div>
                  {githubInfo.latestRunUrl && (
                    <a
                      href={githubInfo.latestRunUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 underline shrink-0"
                    >
                      Actions {githubInfo.latestRunSha || ''}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-white border border-[#EFE2D9] p-3 space-y-2 text-xs">
                  {githubInfo.error && (
                    <p className="font-medium text-red-700 leading-snug">{githubInfo.error}</p>
                  )}

                  {githubInfo.latestRunStatus && (
                    <a
                      href={githubInfo.latestRunUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#E85D1A] font-semibold underline"
                    >
                      Actions: {githubInfo.latestRunStatus} ({githubInfo.latestRunConclusion || 'en curso'})
                      {githubInfo.latestRunSha ? ` · ${githubInfo.latestRunSha}` : ''}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <div className="text-[11px] text-[#575A63] leading-relaxed space-y-1 pt-0.5">
                    <p className="font-bold text-[#1A1C22]">¿Qué pongo aquí?</p>
                    <p>
                      1. En tu cuenta de GitHub, copia tu <span className="font-mono font-semibold text-[#1A1C22]">usuario/nombre-del-repo</span> (o la URL completa del repositorio).
                    </p>
                    <p>
                      2. El archivo <span className="font-mono">.github/workflows/build-apk.yml</span> compila y publica el APK en <span className="font-semibold">Releases → latest</span>.
                    </p>
                    <p>
                      3. Cuando esté en verde, pulsa <strong>Comprobar GitHub</strong> y ya podrás descargar o actualizar directo desde aquí o desde el menú del Sony.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Native Android System Permissions */}
            <div className="rounded-xl border border-[#E6E4DC] bg-[#FAF9F6] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#E85D1A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#1A1C22]">
                    Permisos del Sistema Android (dentro del APK)
                  </h3>
                  <p className="mt-0.5 text-xs text-[#575A63]">
                    {isNativeApk
                      ? 'Ejecutándose dentro del APK nativo: abre los ajustes del sistema para conceder los permisos al W800i.'
                      : 'Cuando instales el APK en tu teléfono Android, estos botones abrirán los permisos reales del sistema.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    isNativeApk
                      ? onOpenAndroidSettings('home')
                      : showStudioNotice('Disponible al abrir la app como APK instalado en Android.')
                  }
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#DCDAD1] hover:border-[#E85D1A] text-left text-xs font-semibold text-[#1A1C22] cursor-pointer"
                >
                  <span>1. Fijar como Launcher Home</span>
                  {isDefaultLauncher ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-[#E85D1A]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    isNativeApk
                      ? onOpenAndroidSettings('notifications')
                      : showStudioNotice('En el APK activa el servicio SonyNotificationService para leer WhatsApp, SMS y llamadas.')
                  }
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#DCDAD1] hover:border-[#E85D1A] text-left text-xs font-semibold text-[#1A1C22] cursor-pointer"
                >
                  <span>2. Lector de Notificaciones</span>
                  <Bell className="w-4 h-4 text-[#E85D1A]" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    isNativeApk
                      ? onOpenAndroidSettings('overlay')
                      : showStudioNotice('Disponible en Android dentro del APK para superposición sobre ventanas.')
                  }
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#DCDAD1] hover:border-[#E85D1A] text-left text-xs font-semibold text-[#1A1C22] cursor-pointer"
                >
                  <span>3. Pasar sobre ventanas (Overlay)</span>
                  <ExternalLink className="w-4 h-4 text-[#575A63]" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    isNativeApk
                      ? onOpenAndroidSettings('unknown_sources')
                      : showStudioNotice('Permite instalar actualizaciones APK descargadas desde GitHub Releases.')
                  }
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#DCDAD1] hover:border-[#E85D1A] text-left text-xs font-semibold text-[#1A1C22] cursor-pointer"
                >
                  <span>4. Permitir actualizar APK</span>
                  <Download className="w-4 h-4 text-[#575A63]" />
                </button>
              </div>
            </div>

            {/* Sony Notifications Simulator */}
            <div className="space-y-3 pt-2 border-t border-[#ECEAE3]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#1A1C22]">Probar notificaciones flotantes estilo Sony</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B6E78]">
                    Estado: <strong>{isNativeApk ? 'Servicio Nativo APK' : notificationPermission}</strong>
                  </span>
                  {!isNativeApk && notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={onRequestNotifications}
                      className="px-3 py-1.5 rounded-lg bg-[#1A1C22] text-white text-xs font-semibold cursor-pointer"
                    >
                      Activar permisos
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={notifApp}
                  onChange={(e) => setNotifApp(e.target.value)}
                  placeholder="App (ej. WhatsApp)"
                  className="px-3 py-2 rounded-lg border border-[#D8D6CE] text-xs focus:outline-none focus:border-[#E85D1A]"
                />
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Remitente / Título"
                  className="px-3 py-2 rounded-lg border border-[#D8D6CE] text-xs focus:outline-none focus:border-[#E85D1A]"
                />
                <input
                  type="text"
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Mensaje"
                  className="px-3 py-2 rounded-lg border border-[#D8D6CE] text-xs focus:outline-none focus:border-[#E85D1A]"
                />
              </div>

              <button
                type="button"
                onClick={() => onSendCustomSonyNotification(notifTitle, notifBody, notifApp)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-xs font-semibold cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                Enviar notificación flotante Sony
              </button>
            </div>
          </div>
        )}

        {/* TAB: IMPORT / EXPORT CONFIG */}
        {tab === 'import' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E2D8] p-4 text-sm text-[#43464F] leading-relaxed">
              <p className="font-semibold text-[#1A1C22]">
                Importar o hacer copia completa de tu Launcher W800i
              </p>
              <p className="mt-1 text-xs text-[#5E616B]">
                Pega un JSON exportado o código con paquetes Android (<span className="font-mono">com.ejemplo.app</span>): importa automáticamente tus apps, menú de 12 iconos, contactos, colores y canciones.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#2B2D33]">
                  Pega aquí el JSON o código de configuración
                </label>
                <button
                  type="button"
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E85D1A] hover:underline cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir .json
                </button>
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  onChange={handleUploadJsonFile}
                  className="hidden"
                />
              </div>

              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`{\n  "ownerName": "Sony Ericsson",\n  "carrierText": "5G HYPER",\n  "apps": [{ "name": "Telegram", "packageName": "org.telegram.messenger", "url": "https://t.me/", "quickKey": "1" }]\n}`}
                className="w-full p-3 rounded-xl border border-[#D8D6CE] font-mono text-xs bg-[#FCFBF9] focus:outline-none focus:border-[#E85D1A]"
              />
            </div>

            {importFeedback && (
              <div
                className={`rounded-xl p-3.5 text-xs border ${
                  importFeedback.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <p className="font-bold">
                  {importFeedback.type === 'ok' ? 'Configuración aplicada:' : 'No se pudo importar:'}
                </p>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {importFeedback.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleParseAndImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E85D1A] hover:bg-[#D14D10] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <FolderUp className="w-4 h-4" />
                Analizar e Importar
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D8D6CE] hover:bg-[#F5F4F0] text-[#1A1C22] text-sm font-semibold transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                {copiedJson ? 'Copiado' : 'Copiar JSON'}
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D8D6CE] hover:bg-[#F5F4F0] text-[#1A1C22] text-sm font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Descargar .json
              </button>
              <button
                type="button"
                onClick={onResetConfig}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#6B6E78] hover:text-red-600 transition-colors cursor-pointer ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar W800i
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
