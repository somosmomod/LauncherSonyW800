import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, SlidersHorizontal, Smartphone } from 'lucide-react';
import { ConfigStudio } from './components/ConfigStudio';
import { HardwareKey, W800iPhone } from './components/W800iPhone';
import { PhoneScreens, SnakeState } from './components/screens/PhoneScreens';
import {
  AndroidAppShortcut,
  APP_VERSION,
  AppIconType,
  CallLogEntry,
  ChassisSkin,
  ControlCenterState,
  GalleryPhoto,
  GithubBuildInfo,
  LauncherConfig,
  MainMenuSlot,
  ScreenId,
  SonyNotification,
  WallpaperStyle,
} from './types/launcher';
import {
  DEFAULT_LAUNCHER_CONFIG,
  DEFAULT_MENU_ITEMS,
  T9_KEYPAD_MAP,
} from './utils/configParser';
import {
  createInitialGithubBuildInfo,
  fetchGithubBuildInfo,
  normalizeGithubRepo,
  STORAGE_KEY_GITHUB_INSTALLED_TAG,
  triggerGithubApkDownload,
} from './utils/githubUpdater';
import {
  AndroidSettingsTarget,
  attachApkDownloadProgressListener,
  checkIsDefaultHomeLauncher,
  downloadAndInstallApkNative,
  fetchNativeInstalledApps,
  isNativeAndroidApk,
  launchNativeOrFallbackApp,
  openAndroidSystemSettings,
  openExternalUrlNative,
} from './utils/nativeLauncher';
import {
  playDtmfTone,
  playFmStaticBurst,
  playKeyClick,
  playNavTick,
  playShutterSound,
  playWalkmanStep,
  triggerHaptic,
} from './utils/soundEngine';

const STORAGE_KEY_CONFIG = 'w800i_launcher_config_v1';
const STORAGE_KEY_CALLS = 'w800i_call_log_v1';
const STORAGE_KEY_PHOTOS = 'w800i_gallery_v1';
const STORAGE_KEY_HIGHSCORE = 'w800i_snake_highscore_v1';

const INITIAL_SONY_NOTIFICATIONS: SonyNotification[] = [
  {
    id: 'n-welcome',
    appName: 'Sony Walkman OS',
    title: 'Sistema Hyper-HUD activo',
    body: 'Toca la barra superior para abrir el Centro de Control y Notificaciones.',
    timestamp: 'Ahora',
    category: 'system',
    unread: true,
    actionScreen: 'settings',
  },
  {
    id: 'n-msg-1',
    appName: 'WhatsApp',
    title: 'Lucía Méndez',
    body: '¿Nos vemos en el ensayo a las 19:00?',
    timestamp: '09:02',
    category: 'message',
    unread: true,
    actionScreen: 'messages',
  },
  {
    id: 'n-walkman',
    appName: 'Walkman Hi-Res',
    title: 'The Mops · Working Hours',
    body: 'Pista 03/12 lista en cola neural.',
    timestamp: '08:55',
    category: 'music',
    unread: false,
    actionScreen: 'walkman',
  },
];

function inferAppIconType(name: string, pkg: string): AppIconType {
  const hay = `${name} ${pkg}`.toLowerCase();
  if (hay.includes('whatsapp') || hay.includes('telegram') || hay.includes('sms') || hay.includes('message')) {
    return 'chat';
  }
  if (hay.includes('spotify') || hay.includes('music') || hay.includes('walkman') || hay.includes('audio')) {
    return 'music';
  }
  if (hay.includes('map') || hay.includes('waze')) return 'map';
  if (hay.includes('youtube') || hay.includes('video') || hay.includes('netflix')) return 'video';
  if (hay.includes('mail') || hay.includes('gmail')) return 'mail';
  if (hay.includes('cam') || hay.includes('photo')) return 'camera';
  if (hay.includes('dialer') || hay.includes('phone') || hay.includes('tel')) return 'phone';
  if (hay.includes('insta') || hay.includes('tiktok') || hay.includes('facebook')) return 'social';
  if (hay.includes('chrome') || hay.includes('browser')) return 'browser';
  return 'tools';
}

function loadSavedConfig(): LauncherConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return DEFAULT_LAUNCHER_CONFIG;
    const parsed = JSON.parse(raw) as Partial<LauncherConfig>;
    return {
      ...DEFAULT_LAUNCHER_CONFIG,
      ...parsed,
      version: 2,
      accentColor:
        typeof parsed.accentColor === 'string' && parsed.accentColor.trim()
          ? parsed.accentColor
          : DEFAULT_LAUNCHER_CONFIG.accentColor,
      githubRepo:
        typeof parsed.githubRepo === 'string' && parsed.githubRepo.trim()
          ? parsed.githubRepo.trim()
          : DEFAULT_LAUNCHER_CONFIG.githubRepo,
      customBezelColor:
        typeof parsed.customBezelColor === 'string'
          ? parsed.customBezelColor
          : DEFAULT_LAUNCHER_CONFIG.customBezelColor,
      customFaceColor:
        typeof parsed.customFaceColor === 'string'
          ? parsed.customFaceColor
          : DEFAULT_LAUNCHER_CONFIG.customFaceColor,
      wallpaperDim:
        typeof parsed.wallpaperDim === 'number'
          ? parsed.wallpaperDim
          : DEFAULT_LAUNCHER_CONFIG.wallpaperDim,
      enabledWidgets:
        Array.isArray(parsed.enabledWidgets) && parsed.enabledWidgets.length > 0
          ? parsed.enabledWidgets
          : DEFAULT_LAUNCHER_CONFIG.enabledWidgets,
      widgetLayout: parsed.widgetLayout || DEFAULT_LAUNCHER_CONFIG.widgetLayout,
      weatherLocation: parsed.weatherLocation || DEFAULT_LAUNCHER_CONFIG.weatherLocation,
      menuItems:
        Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0
          ? parsed.menuItems
          : DEFAULT_MENU_ITEMS,
      apps:
        Array.isArray(parsed.apps) && parsed.apps.length > 0
          ? parsed.apps
          : DEFAULT_LAUNCHER_CONFIG.apps,
      tracks:
        Array.isArray(parsed.tracks) && parsed.tracks.length > 0
          ? parsed.tracks
          : DEFAULT_LAUNCHER_CONFIG.tracks,
      contacts:
        Array.isArray(parsed.contacts) && parsed.contacts.length > 0
          ? parsed.contacts
          : DEFAULT_LAUNCHER_CONFIG.contacts,
      quickNotes:
        Array.isArray(parsed.quickNotes) && parsed.quickNotes.length > 0
          ? parsed.quickNotes
          : DEFAULT_LAUNCHER_CONFIG.quickNotes,
    };
  } catch {
    return DEFAULT_LAUNCHER_CONFIG;
  }
}

declare global {
  interface Window {
    pushSonyNotification?: (payload: { appName?: string; title?: string; body?: string }) => void;
  }
}

export default function App() {
  const [config, setConfig] = useState<LauncherConfig>(loadSavedConfig);
  const [screen, setScreen] = useState<ScreenId>('standby');
  const [activeWidgetIndex, setActiveWidgetIndex] = useState(1);
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeKey, setActiveKey] = useState<HardwareKey | null>(null);
  const [lcdNotice, setLcdNotice] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [focusPhoneOnly, setFocusPhoneOnly] = useState(false);

  // Native Android APK Launcher state
  const [isNativeApk] = useState<boolean>(() => isNativeAndroidApk());
  const [isDefaultLauncher, setIsDefaultLauncher] = useState(false);
  const [syncingNativeApps, setSyncingNativeApps] = useState(false);
  const [apkDownloadProgress, setApkDownloadProgress] = useState<number | null>(null);
  const [apkUpdateError, setApkUpdateError] = useState<string | null>(null);

  // Sony Shade, Notifications & Control Center
  const [shadeOpen, setShadeOpen] = useState(false);
  const [notifications, setNotifications] = useState<SonyNotification[]>(INITIAL_SONY_NOTIFICATIONS);
  const [headsUpNotification, setHeadsUpNotification] = useState<SonyNotification | null>(null);
  const [controlCenter, setControlCenter] = useState<ControlCenterState>({
    wifi: true,
    mobileData: true,
    bluetooth: true,
    dnd: false,
    brightness: 100,
    fullscreenActive: false,
  });

  // Notification permission (Web fallback when outside APK)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  // GitHub Compilation APK Updater
  const [githubInfo, setGithubInfo] = useState<GithubBuildInfo>(() =>
    createInitialGithubBuildInfo(config.githubRepo)
  );

  // Menu navigation
  const [menuIndex, setMenuIndex] = useState(0);

  // Walkman state (starts at track 03/12: The Mops - Late July - Working Hours at 01:22)
  const [trackIndex, setTrackIndex] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackElapsed, setTrackElapsed] = useState(82);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const synthStepRef = useRef(0);

  // Apps Android state
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);

  // Dialer & Call log
  const [dialNumber, setDialNumber] = useState('');
  const [callLog, setCallLog] = useState<CallLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CALLS);
      return raw ? (JSON.parse(raw) as CallLogEntry[]) : [];
    } catch {
      return [];
    }
  });

  // Messages T9 state
  const [smsText, setSmsText] = useState('');
  const [smsRecipientIndex, setSmsRecipientIndex] = useState(0);
  const [t9Uppercase, setT9Uppercase] = useState(false);
  const t9StateRef = useRef<{ key: string; tapIdx: number; timer: number | null }>({
    key: '',
    tapIdx: 0,
    timer: null,
  });

  // Contacts state
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);

  // Camera & Gallery
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PHOTOS);
      return raw ? (JSON.parse(raw) as GalleryPhoto[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Snake Game
  const [snakeState, setSnakeState] = useState<SnakeState>({
    snake: [
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 6 },
    ],
    food: { x: 8, y: 4 },
    score: 0,
    gameOver: false,
  });
  const snakeDirRef = useRef<{ dx: number; dy: number }>({ dx: 1, dy: 0 });
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY_HIGHSCORE) || '0');
    return Number.isFinite(saved) ? saved : 0;
  });

  // FM Radio
  const [fmFreq, setFmFreq] = useState(98.5);
  const [fmPlaying, setFmPlaying] = useState(false);

  // Calculator
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState('');
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // Settings cursor
  const [settingsIndex, setSettingsIndex] = useState(0);

  const showNotice = useCallback((msg: string) => {
    setLcdNotice(msg);
    window.setTimeout(() => {
      setLcdNotice((curr) => (curr === msg ? null : curr));
    }, 2600);
  }, []);

  const pushSonyNotification = useCallback(
    (title: string, body: string, appName = 'Sony Walkman OS', actionScreen?: ScreenId) => {
      const notif: SonyNotification = {
        id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        appName,
        title,
        body,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        category: 'message',
        unread: true,
        actionScreen,
      };
      setNotifications((prev) => [notif, ...prev]);
      setHeadsUpNotification(notif);
      window.setTimeout(() => {
        setHeadsUpNotification((curr) => (curr?.id === notif.id ? null : curr));
      }, 4200);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${appName} · ${title}`, {
            body,
          });
        } catch {
          // ignore if blocked in webview
        }
      }
    },
    []
  );

  // Expose Android Native Bridge hook for SonyNotificationService
  useEffect(() => {
    window.pushSonyNotification = (payload) => {
      pushSonyNotification(
        payload?.title || 'Nueva alerta Android',
        payload?.body || '',
        payload?.appName || 'Android'
      );
    };
    return () => {
      delete window.pushSonyNotification;
    };
  }, [pushSonyNotification]);

  // Sync real installed Android apps & PNG icons from PackageManager when running inside APK
  const handleSyncNativeApps = useCallback(
    async (silent = false) => {
      if (!isNativeApk) {
        if (!silent) showNotice('Disponible dentro del APK instalado');
        return;
      }
      setSyncingNativeApps(true);
      try {
        const installed = await fetchNativeInstalledApps();
        if (installed.length === 0) {
          if (!silent) showNotice('No se detectaron apps adicionales');
          return;
        }
        const byPkg = new Map(installed.map((item) => [item.packageName, item]));

        setConfig((prev) => {
          const updatedExisting = prev.apps.map((existing) => {
            const match = existing.packageName ? byPkg.get(existing.packageName) : undefined;
            if (!match) return existing;
            return {
              ...existing,
              iconDataUrl: existing.iconDataUrl || match.iconDataUrl,
            };
          });

          const existingPkgs = new Set(updatedExisting.map((a) => a.packageName).filter(Boolean));
          const extraApps: AndroidAppShortcut[] = installed
            .filter((item) => !existingPkgs.has(item.packageName))
            .map((item, idx) => ({
              id: `native-${item.packageName}`,
              name: item.name.slice(0, 22),
              packageName: item.packageName,
              urlScheme: '',
              category: 'App Nativa',
              quickKey:
                updatedExisting.length + idx < 9
                  ? String(updatedExisting.length + idx + 1)
                  : undefined,
              iconType: inferAppIconType(item.name, item.packageName),
              iconDataUrl: item.iconDataUrl,
            }));

          const updatedMenu = prev.menuItems.map((slot) => {
            if (slot.actionType === 'app' && slot.packageName && !slot.iconDataUrl) {
              const match = byPkg.get(slot.packageName);
              if (match) return { ...slot, iconDataUrl: match.iconDataUrl };
            }
            return slot;
          });

          return {
            ...prev,
            apps: [...updatedExisting, ...extraApps],
            menuItems: updatedMenu,
          };
        });

        if (!silent) {
          showNotice(`${installed.length} apps e iconos reales cargados`);
        }
      } finally {
        setSyncingNativeApps(false);
      }
    },
    [isNativeApk, showNotice]
  );

  // Check default Home launcher state & initial native app icon sync inside APK
  useEffect(() => {
    if (!isNativeApk) return;
    checkIsDefaultHomeLauncher().then(setIsDefaultLauncher);
    handleSyncNativeApps(true);

    const recheckDefault = () => {
      checkIsDefaultHomeLauncher().then(setIsDefaultLauncher);
    };
    window.addEventListener('focus', recheckDefault);
    document.addEventListener('visibilitychange', recheckDefault);
    return () => {
      window.removeEventListener('focus', recheckDefault);
      document.removeEventListener('visibilitychange', recheckDefault);
    };
  }, [isNativeApk, handleSyncNativeApps]);

  const handleSetDefaultLauncher = useCallback(async () => {
    if (!isNativeApk) {
      setMobilePanelOpen(true);
      showNotice('Compila e instala el APK en GitHub para fijarlo');
      return;
    }
    await openAndroidSystemSettings('home');
    showNotice('Elige W800i Walkman como Inicio');
  }, [isNativeApk, showNotice]);

  const handleOpenAndroidSettings = useCallback(
    async (target: AndroidSettingsTarget) => {
      if (!isNativeApk) {
        showNotice('Disponible dentro del APK nativo');
        return;
      }
      await openAndroidSystemSettings(target);
    },
    [isNativeApk, showNotice]
  );

  const handleRequestNotifications = useCallback(async () => {
    if (isNativeApk) {
      await openAndroidSystemSettings('notifications');
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showNotice('Notificaciones no soportadas');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        pushSonyNotification('Permiso concedido', 'Las alertas Sony HUD están activas.', 'Sistema Sony');
      } else {
        showNotice('Permiso denegado en navegador');
      }
    } catch {
      showNotice('No se pudo solicitar permiso');
    }
  }, [isNativeApk, pushSonyNotification, showNotice]);

  const handleCheckGithubBuild = useCallback(
    async (repoOverride?: string) => {
      const target = (repoOverride ?? config.githubRepo).trim();
      const normalized = normalizeGithubRepo(target);
      setGithubInfo((prev) => ({
        ...prev,
        repo: normalized || target,
        checking: true,
        error: null,
      }));
      const result = await fetchGithubBuildInfo(target);
      setGithubInfo(result);
      if (result.repo && normalizeGithubRepo(result.repo)) {
        setConfig((prev) => (prev.githubRepo === result.repo ? prev : { ...prev, githubRepo: result.repo }));
      }
      if (result.apkUrl) {
        if (result.updateAvailable) {
          showNotice(`APK ${result.releaseTag || 'nuevo'} listo`);
          pushSonyNotification(
            'Actualización APK en GitHub',
            `${result.apkName || 'w800i-walkman-launcher.apk'} (${result.releaseTag || 'latest'}) listo para instalar.`,
            'GitHub Updater',
            'settings'
          );
        } else {
          showNotice(`APK GitHub verificado (${result.releaseTag || 'latest'})`);
        }
      } else if (result.error) {
        showNotice('Revisa el repositorio GitHub');
      }
    },
    [config.githubRepo, pushSonyNotification, showNotice]
  );

  const handleFallbackBrowserApkDownload = useCallback(async () => {
    if (!githubInfo.apkUrl) return;
    setApkUpdateError(null);
    setApkDownloadProgress(null);
    const marker = githubInfo.releaseTag
      ? `${githubInfo.releaseTag}:${githubInfo.publishedAt || ''}`
      : githubInfo.latestRunSha;
    if (marker) {
      try {
        localStorage.setItem(STORAGE_KEY_GITHUB_INSTALLED_TAG, marker);
      } catch {
        // ignore
      }
    }
    if (isNativeApk) {
      await openExternalUrlNative(githubInfo.apkUrl);
      showNotice('Abriendo navegador para descargar APK...');
    } else {
      triggerGithubApkDownload(githubInfo.apkUrl, githubInfo.apkName, marker);
      showNotice('Descargando APK de GitHub...');
    }
    setGithubInfo((prev) => ({ ...prev, updateAvailable: false }));
  }, [githubInfo, isNativeApk, showNotice]);

  const handleInstallGithubApk = useCallback(async () => {
    if (!githubInfo.apkUrl) {
      showNotice('Comprueba primero el repo GitHub');
      return;
    }
    const marker = githubInfo.releaseTag
      ? `${githubInfo.releaseTag}:${githubInfo.publishedAt || ''}`
      : githubInfo.latestRunSha;

    if (marker) {
      try {
        localStorage.setItem(STORAGE_KEY_GITHUB_INSTALLED_TAG, marker);
      } catch {
        // ignore storage errors
      }
    }

    if (isNativeApk) {
      setApkUpdateError(null);
      setApkDownloadProgress(0);
      showNotice('Descargando actualización APK...');
      let moved = false;
      const stopListening = await attachApkDownloadProgressListener((pct) => {
        if (pct > 0) moved = true;
        setApkDownloadProgress(pct);
      });
      const stallTimer = window.setTimeout(() => {
        if (!moved) {
          setApkUpdateError(
            'La descarga nativa tarda en responder (o tu APK actual tiene el descargador antiguo). Usa "Descargar con navegador" abajo para instalar la versión nueva.'
          );
        }
      }, 9000);
      try {
        const res = await downloadAndInstallApkNative(githubInfo.apkUrl, githubInfo.apkName);
        if (res.needsPermission) {
          setApkUpdateError('Activa "Instalar apps desconocidas" en los ajustes que se abrieron y vuelve a intentarlo.');
          showNotice('Activa "Instalar apps desconocidas" y reintenta');
        } else if (!res.started) {
          setApkUpdateError(res.error || 'No se pudo iniciar el instalador nativo. Prueba con "Descargar con navegador".');
          showNotice(res.error || 'Error al iniciar instalador APK');
        } else {
          setApkUpdateError(null);
          setGithubInfo((prev) => ({ ...prev, updateAvailable: false }));
          showNotice('Abriendo instalador Android...');
        }
      } finally {
        window.clearTimeout(stallTimer);
        stopListening();
        setApkDownloadProgress(null);
      }
      return;
    }

    setApkUpdateError(null);
    triggerGithubApkDownload(githubInfo.apkUrl, githubInfo.apkName, marker);
    setGithubInfo((prev) => ({ ...prev, updateAvailable: false }));
    showNotice('Descargando APK de GitHub...');
  }, [githubInfo, isNativeApk, showNotice]);

  useEffect(() => {
    if (config.githubRepo) {
      fetchGithubBuildInfo(config.githubRepo).then((res) => {
        setGithubInfo(res);
      });
    }
    // Check once on startup if repo is configured
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setControlCenter((prev) => ({ ...prev, fullscreenActive: true }));
        setFocusPhoneOnly(true);
      } else {
        await document.exitFullscreen();
        setControlCenter((prev) => ({ ...prev, fullscreenActive: false }));
      }
    } catch {
      setFocusPhoneOnly((v) => !v);
      setControlCenter((prev) => ({ ...prev, fullscreenActive: !prev.fullscreenActive }));
      showNotice('Modo enfoque activado');
    }
  }, [showNotice]);

  useEffect(() => {
    const onFsChange = () => {
      setControlCenter((prev) => ({ ...prev, fullscreenActive: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleControl = useCallback(
    (key: keyof Omit<ControlCenterState, 'brightness'>) => {
      if (key === 'fullscreenActive') {
        handleToggleFullscreen();
        return;
      }
      setControlCenter((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [handleToggleFullscreen]
  );

  // Persist config, calls, photos, highScore
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch {
      // ignore storage quota errors
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(callLog.slice(0, 20)));
    } catch {
      // ignore
    }
  }, [callLog]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos.slice(0, 12)));
    } catch {
      // ignore
    }
  }, [photos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HIGHSCORE, String(highScore));
  }, [highScore]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const currentTrack = config.tracks[trackIndex] || config.tracks[0];

  // Walkman Playback Loop
  useEffect(() => {
    let targetEl = audioElementRef.current;
    if (currentTrack?.customUrl) {
      if (!targetEl) {
        targetEl = new Audio(currentTrack.customUrl);
        audioElementRef.current = targetEl;
      } else if (targetEl.src !== currentTrack.customUrl) {
        targetEl.src = currentTrack.customUrl;
      }
      if (isPlaying) {
        targetEl.play().catch(() => {});
      } else {
        targetEl.pause();
      }
    } else if (targetEl) {
      targetEl.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const secTimer = window.setInterval(() => {
      if (currentTrack.customUrl && audioElementRef.current) {
        setTrackElapsed(Math.floor(audioElementRef.current.currentTime));
        if (audioElementRef.current.ended) {
          setTrackIndex((idx) => (idx + 1) % config.tracks.length);
          setTrackElapsed(0);
        }
      } else {
        setTrackElapsed((prev) => {
          if (prev + 1 >= currentTrack.durationSec) {
            setTrackIndex((idx) => (idx + 1) % config.tracks.length);
            return 0;
          }
          return prev + 1;
        });
      }
    }, 1000);

    let synthTimer: number | null = null;
    if (!currentTrack.customUrl) {
      const intervalMs = Math.round((60 / Math.max(80, currentTrack.bpm)) * 500);
      synthTimer = window.setInterval(() => {
        synthStepRef.current += 1;
        playWalkmanStep(config.soundEnabled, currentTrack.baseFreq, synthStepRef.current);
      }, intervalMs);
    }

    return () => {
      window.clearInterval(secTimer);
      if (synthTimer !== null) window.clearInterval(synthTimer);
    };
  }, [isPlaying, currentTrack, config.tracks.length, config.soundEnabled]);

  useEffect(() => {
    if (!fmPlaying || screen !== 'radio') return;
    const id = window.setInterval(() => {
      const base = 220 + ((fmFreq - 87.5) / 20.5) * 220;
      synthStepRef.current += 1;
      playWalkmanStep(config.soundEnabled, base, synthStepRef.current);
    }, 320);
    return () => window.clearInterval(id);
  }, [fmPlaying, fmFreq, screen, config.soundEnabled]);

  // Camera lifecycle
  useEffect(() => {
    if (screen !== 'camera') {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      return;
    }

    let cancelled = false;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setCameraError(null);
          setCameraStream(stream);
        })
        .catch(() => {
          if (!cancelled) {
            setCameraError('Sin permiso de cámara. Pulsa Capturar para crear postal retro.');
          }
        });
    } else {
      setCameraError('Cámara no disponible en este navegador.');
    }

    return () => {
      cancelled = true;
    };
  }, [screen]);

  // Snake game tick
  useEffect(() => {
    if (screen !== 'game' || snakeState.gameOver) return;
    const id = window.setInterval(() => {
      setSnakeState((prev) => {
        if (prev.gameOver) return prev;
        const head = prev.snake[0];
        const next = {
          x: head.x + snakeDirRef.current.dx,
          y: head.y + snakeDirRef.current.dy,
        };
        if (
          next.x < 0 ||
          next.x >= 12 ||
          next.y < 0 ||
          next.y >= 12 ||
          prev.snake.some((seg) => seg.x === next.x && seg.y === next.y)
        ) {
          setHighScore((hs) => Math.max(hs, prev.score));
          return { ...prev, gameOver: true };
        }
        const ate = next.x === prev.food.x && next.y === prev.food.y;
        const newSnake = [next, ...prev.snake];
        if (!ate) newSnake.pop();
        let nextFood = prev.food;
        if (ate) {
          nextFood = {
            x: Math.floor(Math.random() * 12),
            y: Math.floor(Math.random() * 12),
          };
        }
        const nextScore = ate ? prev.score + 10 : prev.score;
        if (nextScore > highScore) setHighScore(nextScore);
        return {
          snake: newSnake,
          food: nextFood,
          score: nextScore,
          gameOver: false,
        };
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [screen, snakeState.gameOver, highScore]);

  const handleResetSnake = useCallback(() => {
    snakeDirRef.current = { dx: 1, dy: 0 };
    setSnakeState({
      snake: [
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 3, y: 6 },
      ],
      food: { x: 8, y: 4 },
      score: 0,
      gameOver: false,
    });
  }, []);

  const handleLaunchAndroidApp = useCallback(
    async (app: AndroidAppShortcut) => {
      showNotice(`Abriendo ${app.name}...`);
      await launchNativeOrFallbackApp(app);
    },
    [showNotice]
  );

  const handleSelectMenuSlot = useCallback(
    (slot: MainMenuSlot) => {
      if (slot.actionType === 'app') {
        const matched = slot.packageName
          ? config.apps.find((a) => a.packageName === slot.packageName)
          : undefined;
        const shortcut: AndroidAppShortcut = matched || {
          id: slot.id,
          name: slot.label,
          packageName: slot.packageName || '',
          urlScheme: slot.urlScheme || '',
          category: 'Menú',
          iconType: slot.iconType,
          iconDataUrl: slot.iconDataUrl,
        };
        handleLaunchAndroidApp(shortcut);
        return;
      }
      setScreen(slot.targetScreen);
      setShowPlaylistModal(false);
    },
    [config.apps, handleLaunchAndroidApp]
  );

  const handleCallNumber = useCallback(
    (num: string, name?: string) => {
      const cleaned = num.trim();
      if (!cleaned) {
        showNotice('Marca un número primero');
        return;
      }
      const entry: CallLogEntry = {
        id: `call-${Date.now()}`,
        nameOrNumber: name || cleaned,
        phone: cleaned,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        direction: 'outgoing',
      };
      setCallLog((prev) => [entry, ...prev]);
      showNotice(`Llamando a ${name || cleaned}...`);
      const link = document.createElement('a');
      link.href = `tel:${cleaned}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [showNotice]
  );

  const handleSendSms = useCallback(
    (method: 'sms' | 'whatsapp') => {
      const contact = config.contacts[smsRecipientIndex];
      const phone = (contact?.phone || '').replace(/[^\d+]/g, '');
      const body = encodeURIComponent(smsText.trim() || 'Hola desde mi W800i Walkman Launcher');
      if (method === 'whatsapp') {
        const cleanWa = phone.replace(/^\+/, '');
        const url = cleanWa ? `https://wa.me/${cleanWa}?text=${body}` : `https://wa.me/?text=${body}`;
        showNotice('Abriendo WhatsApp...');
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        showNotice('Abriendo app SMS...');
        const a = document.createElement('a');
        a.href = `sms:${phone}?body=${body}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    },
    [config.contacts, smsRecipientIndex, smsText, showNotice]
  );

  const handleCapturePhoto = useCallback(() => {
    playShutterSound(config.soundEnabled);
    triggerHaptic(config.hapticEnabled, 30);

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cameraStream && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 320, 240);
      grad.addColorStop(0, '#FF7A18');
      grad.addColorStop(1, '#080A12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Sony Ericsson W800i', 24, 110);
      ctx.font = '13px monospace';
      ctx.fillText(`Cyber-shot HUD · ${new Date().toLocaleTimeString('es-ES')}`, 24, 140);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const photo: GalleryPhoto = {
      id: `photo-${Date.now()}`,
      dataUrl,
      label: `DSC_${String(photos.length + 1).padStart(4, '0')}.JPG`,
      createdAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
    setPhotos((prev) => [photo, ...prev]);
    setSelectedPhotoIndex(0);
    showNotice(`Guardada ${photo.label}`);
  }, [cameraStream, config.hapticEnabled, config.soundEnabled, photos.length, showNotice]);

  const handleToggleSetting = useCallback((idx: number) => {
    setConfig((prev) => {
      if (idx === 0) return { ...prev, soundEnabled: !prev.soundEnabled };
      if (idx === 1) return { ...prev, hapticEnabled: !prev.hapticEnabled };
      if (idx === 2) return { ...prev, lcdScanlines: !prev.lcdScanlines };
      if (idx === 3) {
        const order: ChassisSkin[] = ['w800i-white', 'w810i-black', 'w580i-silver', 'custom'];
        const next = order[(order.indexOf(prev.skin) + 1) % order.length];
        return { ...prev, skin: next };
      }
      if (idx === 4) {
        const walls: WallpaperStyle[] = ['walkman-wave', 'orange-pulse', 'pearl-minimal', 'midnight-grid'];
        const next = walls[(walls.indexOf(prev.wallpaper) + 1) % walls.length];
        return { ...prev, wallpaper: next };
      }
      return prev;
    });
  }, []);

  const handleCalcResult = useCallback(
    (nextOp: string | null) => {
      if (calcPrev && calcOp) {
        const a = parseFloat(calcPrev);
        const b = parseFloat(calcDisplay);
        let res = b;
        if (calcOp === '+') res = a + b;
        if (calcOp === '-') res = a - b;
        if (calcOp === '×') res = a * b;
        if (calcOp === '÷') res = b !== 0 ? a / b : 0;
        const formatted = String(Number(res.toFixed(6)));
        setCalcDisplay(formatted);
        setCalcPrev(nextOp ? formatted : '');
        setCalcOp(nextOp);
      } else {
        setCalcPrev(calcDisplay);
        setCalcOp(nextOp);
        setCalcDisplay('0');
      }
    },
    [calcDisplay, calcOp, calcPrev]
  );

  const handleT9Type = useCallback(
    (digit: string) => {
      const chars = T9_KEYPAD_MAP[digit];
      if (!chars) return;

      if (digit === '0') {
        setSmsText((prev) => prev + ' ');
        t9StateRef.current.key = '';
        return;
      }

      const nowState = t9StateRef.current;
      if (nowState.timer) window.clearTimeout(nowState.timer);

      if (nowState.key === digit) {
        const nextIdx = (nowState.tapIdx + 1) % chars.length;
        nowState.tapIdx = nextIdx;
        let ch = chars[nextIdx];
        if (t9Uppercase) ch = ch.toUpperCase();
        setSmsText((prev) => prev.slice(0, -1) + ch);
      } else {
        nowState.key = digit;
        nowState.tapIdx = 0;
        let ch = chars[0];
        if (t9Uppercase) ch = ch.toUpperCase();
        setSmsText((prev) => prev + ch);
      }

      nowState.timer = window.setTimeout(() => {
        t9StateRef.current.key = '';
        t9StateRef.current.tapIdx = 0;
      }, 900);
    },
    [t9Uppercase]
  );

  const handlePressKey = useCallback(
    (key: HardwareKey) => {
      setActiveKey(key);
      window.setTimeout(() => setActiveKey((curr) => (curr === key ? null : curr)), 140);
      triggerHaptic(config.hapticEnabled);

      const isNumeric = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'].includes(key);

      if (screen === 'dialer' && isNumeric) {
        playDtmfTone(config.soundEnabled, key);
      } else if (['up', 'down', 'left', 'right'].includes(key)) {
        playNavTick(config.soundEnabled);
      } else {
        playKeyClick(config.soundEnabled);
      }

      // If Notification & Control Center Shade is open
      if (shadeOpen) {
        if (key === 'rightSoft' || key === 'back' || key === 'clear') {
          setShadeOpen(false);
        } else if (key === 'leftSoft') {
          setShadeOpen(false);
          setScreen('settings');
        }
        return;
      }

      if (key === 'walkman') {
        if (screen === 'walkman') {
          setIsPlaying((p) => !p);
        } else {
          setScreen('walkman');
          setShowPlaylistModal(false);
        }
        return;
      }

      if (key === 'back') {
        if (screen === 'walkman' && showPlaylistModal) {
          setShowPlaylistModal(false);
          return;
        }
        if (screen === 'menu') {
          setScreen('standby');
        } else if (screen !== 'standby') {
          setScreen('menu');
        }
        return;
      }

      if (key === 'clear') {
        if (screen === 'dialer') {
          if (dialNumber.length > 0) setDialNumber((d) => d.slice(0, -1));
          else setScreen('standby');
          return;
        }
        if (screen === 'messages') {
          if (smsText.length > 0) setSmsText((t) => t.slice(0, -1));
          else setScreen('menu');
          return;
        }
        if (screen === 'organizer') {
          setCalcDisplay('0');
          setCalcPrev('');
          setCalcOp(null);
          return;
        }
        setScreen('standby');
        return;
      }

      if (screen === 'standby') {
        if (key === 'center') {
          setScreen('menu');
          return;
        }
        if (key === 'leftSoft') {
          setScreen('dialer');
          return;
        }
        if (key === 'rightSoft') {
          setShadeOpen(true);
          return;
        }
        if (key === 'up') {
          setShadeOpen(true);
          return;
        }
        if (key === 'down') {
          setScreen('contacts');
          return;
        }
        if (key === 'left') {
          const len = Math.max(1, config.enabledWidgets.length);
          setActiveWidgetIndex((i) => (i - 1 + len) % len);
          return;
        }
        if (key === 'right') {
          const len = Math.max(1, config.enabledWidgets.length);
          setActiveWidgetIndex((i) => (i + 1) % len);
          return;
        }
        if (key === '*') {
          setConfig((prev) => ({
            ...prev,
            widgetLayout: prev.widgetLayout === 'carousel' ? 'stacked' : 'carousel',
          }));
          return;
        }
        if (isNumeric) {
          setDialNumber(key === '0' ? '+' : key);
          setScreen('dialer');
          return;
        }
      }

      if (screen === 'menu') {
        const activeMenu = config.menuItems.length > 0 ? config.menuItems : DEFAULT_MENU_ITEMS;
        if (key === 'rightSoft') {
          setScreen('standby');
          return;
        }
        if (key === 'leftSoft' || key === 'center') {
          const target = activeMenu[menuIndex];
          if (target) handleSelectMenuSlot(target);
          return;
        }
        if (key === 'right') setMenuIndex((i) => (i + 1) % activeMenu.length);
        if (key === 'left') setMenuIndex((i) => (i - 1 + activeMenu.length) % activeMenu.length);
        if (key === 'down') setMenuIndex((i) => (i + 3) % activeMenu.length);
        if (key === 'up') setMenuIndex((i) => (i - 3 + activeMenu.length) % activeMenu.length);
        if (isNumeric) {
          const matchIdx = activeMenu.findIndex((m) => m.keyHint === key);
          if (matchIdx >= 0) {
            setMenuIndex(matchIdx);
            handleSelectMenuSlot(activeMenu[matchIdx]);
          }
        }
        return;
      }

      if (screen === 'walkman') {
        if (key === 'rightSoft') {
          setShowPlaylistModal((v) => !v);
          return;
        }
        if (key === 'leftSoft' || key === 'center') {
          if (showPlaylistModal) {
            setShowPlaylistModal(false);
            setIsPlaying(true);
          } else {
            setIsPlaying((p) => !p);
          }
          return;
        }
        if (showPlaylistModal) {
          if (key === 'down') setTrackIndex((i) => (i + 1) % config.tracks.length);
          if (key === 'up') setTrackIndex((i) => (i - 1 + config.tracks.length) % config.tracks.length);
          return;
        }
        if (key === 'right') {
          setTrackIndex((i) => (i + 1) % config.tracks.length);
          setTrackElapsed(0);
          return;
        }
        if (key === 'left') {
          setTrackIndex((i) => (i - 1 + config.tracks.length) % config.tracks.length);
          setTrackElapsed(0);
          return;
        }
        return;
      }

      if (screen === 'notifications') {
        if (key === 'leftSoft') {
          pushSonyNotification('Recordatorio Walkman', 'Tienes 2 mensajes pendientes y música lista.', 'Sony System');
          return;
        }
        if (key === 'rightSoft') {
          setNotifications([]);
          return;
        }
        return;
      }

      if (screen === 'apps') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (key === 'down') setSelectedAppIndex((i) => (i + 1) % Math.max(1, config.apps.length));
        if (key === 'up') setSelectedAppIndex((i) => (i - 1 + Math.max(1, config.apps.length)) % Math.max(1, config.apps.length));
        if (key === 'center' || key === 'leftSoft') {
          const app = config.apps[selectedAppIndex];
          if (app) handleLaunchAndroidApp(app);
          return;
        }
        if (isNumeric) {
          const quickApp = config.apps.find((a) => a.quickKey === key);
          if (quickApp) handleLaunchAndroidApp(quickApp);
        }
        return;
      }

      if (screen === 'dialer') {
        if (key === 'leftSoft' || key === 'center') {
          handleCallNumber(dialNumber);
          return;
        }
        if (key === 'rightSoft') {
          setDialNumber((d) => d.slice(0, -1));
          return;
        }
        if (isNumeric) {
          setDialNumber((d) => (d + key).slice(0, 18));
        }
        return;
      }

      if (screen === 'messages') {
        if (key === 'leftSoft') {
          handleSendSms('sms');
          return;
        }
        if (key === 'rightSoft') {
          handleSendSms('whatsapp');
          return;
        }
        if (key === 'up' || key === 'down') {
          setSmsRecipientIndex((i) => (i + (key === 'down' ? 1 : -1) + Math.max(1, config.contacts.length)) % Math.max(1, config.contacts.length));
          return;
        }
        if (key === '*') {
          setT9Uppercase((u) => !u);
          showNotice(!t9Uppercase ? 'Mayúsculas activas' : 'Minúsculas activas');
          return;
        }
        if (key === '#') {
          setSmsText((t) => t + ' ');
          return;
        }
        if (isNumeric) {
          handleT9Type(key);
        }
        return;
      }

      if (screen === 'contacts') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (key === 'down') setSelectedContactIndex((i) => (i + 1) % Math.max(1, config.contacts.length));
        if (key === 'up') setSelectedContactIndex((i) => (i - 1 + Math.max(1, config.contacts.length)) % Math.max(1, config.contacts.length));
        if (key === 'center' || key === 'leftSoft') {
          const c = config.contacts[selectedContactIndex];
          if (c) handleCallNumber(c.phone, c.name);
        }
        return;
      }

      if (screen === 'camera') {
        if (key === 'leftSoft' || key === 'center') {
          handleCapturePhoto();
          return;
        }
        if (key === 'rightSoft') {
          setScreen('gallery');
          return;
        }
        return;
      }

      if (screen === 'gallery') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (photos.length > 0) {
          if (key === 'right' || key === 'down') setSelectedPhotoIndex((i) => (i + 1) % photos.length);
          if (key === 'left' || key === 'up') setSelectedPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
        }
        return;
      }

      if (screen === 'game') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (key === 'leftSoft') {
          handleResetSnake();
          return;
        }
        if ((key === 'up' || key === '2') && snakeDirRef.current.dy !== 1) snakeDirRef.current = { dx: 0, dy: -1 };
        if ((key === 'down' || key === '8') && snakeDirRef.current.dy !== -1) snakeDirRef.current = { dx: 0, dy: 1 };
        if ((key === 'left' || key === '4') && snakeDirRef.current.dx !== 1) snakeDirRef.current = { dx: -1, dy: 0 };
        if ((key === 'right' || key === '6') && snakeDirRef.current.dx !== -1) snakeDirRef.current = { dx: 1, dy: 0 };
        return;
      }

      if (screen === 'radio') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (key === 'leftSoft' || key === 'center') {
          setFmPlaying((p) => !p);
          return;
        }
        if (key === 'right') {
          playFmStaticBurst(config.soundEnabled);
          setFmFreq((f) => Math.min(108.0, Number((f + 0.5).toFixed(1))));
          return;
        }
        if (key === 'left') {
          playFmStaticBurst(config.soundEnabled);
          setFmFreq((f) => Math.max(87.5, Number((f - 0.5).toFixed(1))));
          return;
        }
        return;
      }

      if (screen === 'organizer') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (key === 'up') handleCalcResult('+');
        if (key === 'down') handleCalcResult('-');
        if (key === 'left') handleCalcResult('×');
        if (key === 'right') handleCalcResult('÷');
        if (key === 'center' || key === 'leftSoft') handleCalcResult(null);
        if (key === '*') {
          if (!calcDisplay.includes('.')) setCalcDisplay((d) => d + '.');
          return;
        }
        if (/^[0-9]$/.test(key)) {
          setCalcDisplay((d) => (d === '0' ? key : (d + key).slice(0, 10)));
        }
        return;
      }

      if (screen === 'settings') {
        if (key === 'rightSoft') {
          setScreen('menu');
          return;
        }
        if (key === 'down') setSettingsIndex((i) => (i + 1) % 5);
        if (key === 'up') setSettingsIndex((i) => (i + 4) % 5);
        if (key === 'center' || key === 'leftSoft') handleToggleSetting(settingsIndex);
      }
    },
    [
      calcDisplay,
      config.apps,
      config.contacts,
      config.enabledWidgets.length,
      config.hapticEnabled,
      config.menuItems,
      config.soundEnabled,
      config.tracks.length,
      dialNumber,
      handleCalcResult,
      handleCallNumber,
      handleCapturePhoto,
      handleLaunchAndroidApp,
      handleResetSnake,
      handleSelectMenuSlot,
      handleSendSms,
      handleT9Type,
      handleToggleSetting,
      menuIndex,
      photos.length,
      pushSonyNotification,
      screen,
      selectedAppIndex,
      selectedContactIndex,
      settingsIndex,
      shadeOpen,
      showNotice,
      showPlaylistModal,
      smsText.length,
      t9Uppercase,
    ]
  );

  // Android Hardware Back button event dispatched by MainActivity.java
  useEffect(() => {
    const onNativeBack = () => {
      if (mobilePanelOpen) {
        setMobilePanelOpen(false);
        return;
      }
      handlePressKey('back');
    };
    window.addEventListener('w800i-back', onNativeBack);
    return () => window.removeEventListener('w800i-back', onNativeBack);
  }, [handlePressKey, mobilePanelOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      const map: Record<string, HardwareKey> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        Enter: 'center',
        Backspace: 'clear',
        Escape: 'back',
        w: 'walkman',
        W: 'walkman',
        '0': '0',
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        '7': '7',
        '8': '8',
        '9': '9',
        '*': '*',
        '#': '#',
      };
      const hwKey = map[e.key];
      if (hwKey) {
        e.preventDefault();
        handlePressKey(hwKey);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePressKey]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div
      className={`${
        mobilePanelOpen
          ? 'min-h-[100dvh]'
          : 'h-[100dvh] max-h-[100dvh] overflow-hidden lg:h-auto lg:max-h-none lg:min-h-[100dvh] lg:overflow-visible'
      } flex flex-col bg-[#F3F2EE] text-[#1A1C22]`}
    >
      {/* 3-Zone Top Bar Contract (hidden on mobile phone view so phone is 100% edge-to-edge) */}
      <header
        className={`${
          mobilePanelOpen ? 'block' : 'hidden lg:block'
        } sticky top-0 z-30 pt-[env(safe-area-inset-top)] bg-[#F3F2EE]/95 backdrop-blur-md border-b border-[#E2E0D8]`}
      >
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setScreen('standby');
              setShadeOpen(false);
              setMobilePanelOpen(false);
            }}
            className="text-sm sm:text-lg font-extrabold tracking-tight text-[#1A1C22] truncate min-w-0"
          >
            W800i Walkman Launcher
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#575A63]">
            <button
              type="button"
              onClick={() => {
                setShadeOpen(false);
                setScreen('walkman');
              }}
              className="hover:text-[#1A1C22] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Walkman HUD
            </button>
            <button
              type="button"
              onClick={() => {
                setShadeOpen(false);
                setScreen('menu');
              }}
              className="hover:text-[#1A1C22] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Menú 12 iconos
            </button>
            <button
              type="button"
              onClick={() => setShadeOpen((v) => !v)}
              className="hover:text-[#1A1C22] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Notificaciones Sony
            </button>
            <button
              type="button"
              onClick={() => {
                setShadeOpen(false);
                setScreen('settings');
              }}
              className="hover:text-[#1A1C22] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Centro Config
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobilePanelOpen((v) => !v);
                } else {
                  setFocusPhoneOnly((v) => !v);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#1A1C22] hover:bg-[#2B2E38] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="lg:hidden inline-flex items-center gap-1.5">
                {mobilePanelOpen ? <Smartphone className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                {mobilePanelOpen ? 'Ver Teléfono' : 'Personalizar'}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1.5">
                {focusPhoneOnly ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {focusPhoneOnly ? 'Mostrar Estudio' : 'Solo Teléfono'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main
        id="top"
        className={`flex-1 min-h-0 w-full mx-auto ${
          mobilePanelOpen
            ? 'max-w-7xl px-3 sm:px-6 pt-3.5 pb-[max(36px,calc(env(safe-area-inset-bottom)+24px))] sm:py-8 overflow-x-hidden'
            : 'h-full overflow-hidden p-0 lg:h-auto lg:overflow-visible lg:max-w-7xl lg:px-6 lg:py-8'
        }`}
      >
        <div
          className={`grid lg:gap-8 items-start ${mobilePanelOpen ? '' : 'h-full lg:h-auto'} ${
            focusPhoneOnly ? 'grid-cols-1 justify-items-center' : 'grid-cols-1 lg:grid-cols-[368px_1fr]'
          }`}
        >
          {/* Photorealistic Sony Ericsson W800i Hardware Device */}
          <section className={`${mobilePanelOpen ? 'hidden lg:block' : 'block h-full lg:h-auto'} w-full min-h-0`}>
            <W800iPhone
              skin={config.skin}
              customBezelColor={config.customBezelColor}
              customFaceColor={config.customFaceColor}
              ownerName={config.ownerName}
              activeKey={activeKey}
              hasUnreadNotifications={unreadCount > 0}
              onPressKey={handlePressKey}
              onOpenStudio={() => setMobilePanelOpen(true)}
              onSideVolume={(dir) => {
                setControlCenter((prev) => ({
                  ...prev,
                  brightness: Math.max(50, Math.min(120, prev.brightness + (dir === 'up' ? 10 : -10))),
                }));
                showNotice(`Brillo OLED: ${controlCenter.brightness}%`);
              }}
            >
              <PhoneScreens
                screen={screen}
                config={config}
                now={now}
                menuIndex={menuIndex}
                setMenuIndex={setMenuIndex}
                onNavigate={(s) => {
                  setScreen(s);
                  setShowPlaylistModal(false);
                }}
                shadeOpen={shadeOpen}
                setShadeOpen={setShadeOpen}
                notifications={notifications}
                headsUpNotification={headsUpNotification}
                onDismissHeadsUp={() => setHeadsUpNotification(null)}
                onDismissNotification={(id) =>
                  setNotifications((prev) => prev.filter((n) => n.id !== id))
                }
                onClearNotifications={() => setNotifications([])}
                onTriggerTestNotification={() =>
                  pushSonyNotification(
                    'Mensaje nuevo',
                    'Conexión Hyper-HUD sincronizada con éxito.',
                    'WhatsApp',
                    'messages'
                  )
                }
                onOpenNotification={(notif) => {
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
                  );
                  setHeadsUpNotification(null);
                  setShadeOpen(false);
                  if (notif.actionScreen) setScreen(notif.actionScreen);
                }}
                controlCenter={controlCenter}
                onToggleControl={handleToggleControl}
                onChangeBrightness={(val) => setControlCenter((prev) => ({ ...prev, brightness: val }))}
                isNativeApk={isNativeApk}
                isDefaultLauncher={isDefaultLauncher}
                syncingNativeApps={syncingNativeApps}
                apkDownloadProgress={apkDownloadProgress}
                apkUpdateError={apkUpdateError}
                onSetDefaultLauncher={handleSetDefaultLauncher}
                onSyncNativeApps={() => handleSyncNativeApps(false)}
                onOpenAndroidSettings={handleOpenAndroidSettings}
                githubInfo={githubInfo}
                onChangeGithubRepo={(repo) =>
                  setConfig((prev) => ({ ...prev, githubRepo: repo.trim() }))
                }
                onCheckGithubBuild={handleCheckGithubBuild}
                onInstallGithubApk={handleInstallGithubApk}
                onFallbackBrowserApk={handleFallbackBrowserApkDownload}
                onRequestBrowserNotifications={handleRequestNotifications}
                onSelectMenuSlot={handleSelectMenuSlot}
                currentTrack={currentTrack}
                trackIndex={trackIndex}
                totalTracks={config.tracks.length}
                isPlaying={isPlaying}
                trackElapsed={trackElapsed}
                showPlaylistModal={showPlaylistModal}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onSelectTrack={(idx) => {
                  setTrackIndex(idx);
                  setTrackElapsed(0);
                  setIsPlaying(true);
                  setShowPlaylistModal(false);
                }}
                onPrevTrack={() => {
                  setTrackIndex((i) => (i - 1 + config.tracks.length) % config.tracks.length);
                  setTrackElapsed(0);
                }}
                onNextTrack={() => {
                  setTrackIndex((i) => (i + 1) % config.tracks.length);
                  setTrackElapsed(0);
                }}
                activeWidgetIndex={activeWidgetIndex}
                onChangeWidgetIndex={(idx) => setActiveWidgetIndex(idx)}
                onToggleLayoutMode={(mode) =>
                  setConfig((prev) => ({ ...prev, widgetLayout: mode }))
                }
                selectedAppIndex={selectedAppIndex}
                setSelectedAppIndex={setSelectedAppIndex}
                onLaunchAndroidApp={handleLaunchAndroidApp}
                dialNumber={dialNumber}
                callLog={callLog}
                onCallNumber={handleCallNumber}
                smsText={smsText}
                t9ActiveHint={t9Uppercase ? 'ABC' : 'abc'}
                smsRecipientIndex={smsRecipientIndex}
                onSendSms={handleSendSms}
                selectedContactIndex={selectedContactIndex}
                setSelectedContactIndex={setSelectedContactIndex}
                cameraStream={cameraStream}
                cameraError={cameraError}
                videoRef={videoRef}
                photos={photos}
                selectedPhotoIndex={selectedPhotoIndex}
                setSelectedPhotoIndex={setSelectedPhotoIndex}
                onCapturePhoto={handleCapturePhoto}
                snakeState={snakeState}
                highScore={highScore}
                onResetSnake={handleResetSnake}
                fmFreq={fmFreq}
                fmPlaying={fmPlaying}
                onToggleFm={() => setFmPlaying((p) => !p)}
                calcDisplay={calcDisplay}
                calcPrev={calcPrev}
                calcOp={calcOp}
                settingsIndex={settingsIndex}
                setSettingsIndex={setSettingsIndex}
                onToggleSetting={handleToggleSetting}
                lcdNotice={lcdNotice}
                onOpenStudio={() => setMobilePanelOpen(true)}
              />
            </W800iPhone>

            <p className="hidden lg:block mt-3 text-center text-xs text-[#6B6E78]">
              Toca la barra superior de la pantalla Sony para abrir Notificaciones y Centro de Control
            </p>
          </section>

          {/* Native APK Studio & Full Personalization */}
          {!focusPhoneOnly && (
            <section className={`${mobilePanelOpen ? 'block' : 'hidden lg:block'} w-full min-w-0 overflow-hidden`}>
              <ConfigStudio
                config={config}
                onUpdateConfig={setConfig}
                onResetConfig={() => {
                  setConfig(DEFAULT_LAUNCHER_CONFIG);
                  setTrackIndex(2);
                  setTrackElapsed(82);
                  showNotice('Configuración restaurada');
                }}
                onAddLocalTracks={(newTracks) => {
                  setConfig((prev) => ({
                    ...prev,
                    tracks: [...newTracks, ...prev.tracks],
                  }));
                  setTrackIndex(0);
                  setTrackElapsed(0);
                  setIsPlaying(true);
                }}
                onNavigatePhone={(s) => {
                  setScreen(s);
                  setShadeOpen(false);
                  setMobilePanelOpen(false);
                }}
                isNativeApk={isNativeApk}
                isDefaultLauncher={isDefaultLauncher}
                syncingNativeApps={syncingNativeApps}
                apkDownloadProgress={apkDownloadProgress}
                apkUpdateError={apkUpdateError}
                onSetDefaultLauncher={handleSetDefaultLauncher}
                onSyncNativeApps={() => handleSyncNativeApps(false)}
                onOpenAndroidSettings={handleOpenAndroidSettings}
                githubInfo={githubInfo}
                onCheckGithubBuild={handleCheckGithubBuild}
                onInstallGithubApk={handleInstallGithubApk}
                onFallbackBrowserApk={handleFallbackBrowserApkDownload}
                notificationPermission={notificationPermission}
                onRequestNotifications={handleRequestNotifications}
                onSendCustomSonyNotification={(title, body, appName) => {
                  pushSonyNotification(title, body, appName, 'notifications');
                  setMobilePanelOpen(false);
                }}
                fullscreenActive={controlCenter.fullscreenActive}
                onToggleFullscreen={handleToggleFullscreen}
                onLaunchApp={handleLaunchAndroidApp}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
