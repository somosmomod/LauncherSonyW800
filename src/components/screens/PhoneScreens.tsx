import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bluetooth,
  Camera,
  Check,
  ChevronDown,
  Compass,
  Download,
  FolderOpen,
  Gamepad2,
  GitBranch,
  Globe,
  Grid3X3,
  Headphones,
  Mail,
  Maximize,
  MessageSquare,
  Music,
  Pause,
  Phone,
  Play,
  Radio,
  RefreshCw,
  Settings,
  Smartphone,
  Star,
  Sun,
  User,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  Wrench,
  X,
} from 'lucide-react';
import {
  AndroidAppShortcut,
  APP_VERSION,
  AppIconType,
  CallLogEntry,
  ContactEntry,
  ControlCenterState,
  GalleryPhoto,
  GithubBuildInfo,
  LauncherConfig,
  MainMenuSlot,
  ScreenId,
  SonyNotification,
  WalkmanTrack,
  WidgetLayoutMode,
} from '../../types/launcher';
import { AndroidSettingsTarget } from '../../utils/nativeLauncher';
import { DesktopWidgetHost } from './DesktopWidgets';

export interface MainMenuItem {
  id: ScreenId;
  label: string;
  keyHint: string;
}

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: 'walkman', label: 'Walkman HUD', keyHint: '1' },
  { id: 'apps', label: 'Apps Android', keyHint: '2' },
  { id: 'dialer', label: 'Teléfono', keyHint: '3' },
  { id: 'messages', label: 'Mensajes T9', keyHint: '4' },
  { id: 'contacts', label: 'Contactos', keyHint: '5' },
  { id: 'camera', label: 'Cámara 2MP', keyHint: '6' },
  { id: 'gallery', label: 'Galería', keyHint: '7' },
  { id: 'game', label: 'Hyper Snake', keyHint: '8' },
  { id: 'radio', label: 'Radio FM', keyHint: '9' },
  { id: 'organizer', label: 'Calculadora', keyHint: '*' },
  { id: 'notifications', label: 'Notificaciones', keyHint: '0' },
  { id: 'settings', label: 'Centro Config', keyHint: '#' },
];

export function renderShortcutIcon(type: AppIconType, className = 'w-4 h-4') {
  switch (type) {
    case 'chat':
      return <MessageSquare className={className} />;
    case 'music':
      return <Music className={className} />;
    case 'map':
      return <Compass className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'mail':
      return <Mail className={className} />;
    case 'browser':
      return <Globe className={className} />;
    case 'camera':
      return <Camera className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'social':
      return <Star className={className} />;
    case 'tools':
      return <Wrench className={className} />;
    default:
      return <Smartphone className={className} />;
  }
}

function renderMenuGlyph(id: ScreenId, active: boolean) {
  const cls = `w-5 h-5 transition-transform duration-150 ${
    active ? 'scale-110 text-white' : 'text-[#FF8C38]'
  }`;
  switch (id) {
    case 'walkman':
      return <Headphones className={cls} />;
    case 'apps':
      return <Grid3X3 className={cls} />;
    case 'dialer':
      return <Phone className={cls} />;
    case 'messages':
      return <MessageSquare className={cls} />;
    case 'contacts':
      return <Users className={cls} />;
    case 'camera':
      return <Camera className={cls} />;
    case 'gallery':
      return <FolderOpen className={cls} />;
    case 'game':
      return <Gamepad2 className={cls} />;
    case 'radio':
      return <Radio className={cls} />;
    case 'organizer':
      return <Wrench className={cls} />;
    case 'notifications':
      return <Bell className={cls} />;
    case 'settings':
      return <Settings className={cls} />;
    default:
      return <Smartphone className={cls} />;
  }
}

export function formatTimeSec(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface SnakeState {
  snake: Array<{ x: number; y: number }>;
  food: { x: number; y: number };
  score: number;
  gameOver: boolean;
}

export interface UpdateStatusInfo {
  checking: boolean;
  updateAvailable: boolean;
  statusText: string;
}

export interface PhoneScreenProps {
  screen: ScreenId;
  config: LauncherConfig;
  now: Date;
  menuIndex: number;
  setMenuIndex: (i: number) => void;
  onNavigate: (s: ScreenId) => void;
  // Shade & Notifications
  shadeOpen: boolean;
  setShadeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  notifications: SonyNotification[];
  headsUpNotification: SonyNotification | null;
  onDismissHeadsUp: () => void;
  onDismissNotification: (id: string) => void;
  onClearNotifications: () => void;
  onTriggerTestNotification: () => void;
  onOpenNotification: (notif: SonyNotification) => void;
  controlCenter: ControlCenterState;
  onToggleControl: (key: keyof Omit<ControlCenterState, 'brightness'>) => void;
  onChangeBrightness: (val: number) => void;
  // Native Android Launcher APK & GitHub Build Install
  isNativeApk: boolean;
  isDefaultLauncher: boolean;
  syncingNativeApps: boolean;
  apkDownloadProgress: number | null;
  onSetDefaultLauncher: () => void;
  onSyncNativeApps: () => void;
  onOpenAndroidSettings: (target: AndroidSettingsTarget) => void;
  githubInfo: GithubBuildInfo;
  onChangeGithubRepo: (repo: string) => void;
  onCheckGithubBuild: (repoOverride?: string) => void;
  onInstallGithubApk: () => void;
  onRequestBrowserNotifications: () => void;
  onSelectMenuSlot: (slot: MainMenuSlot) => void;
  // Walkman
  currentTrack: WalkmanTrack;
  trackIndex: number;
  totalTracks: number;
  isPlaying: boolean;
  trackElapsed: number;
  showPlaylistModal: boolean;
  onTogglePlay: () => void;
  onSelectTrack: (idx: number) => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  // Desktop Widgets
  activeWidgetIndex: number;
  onChangeWidgetIndex: (idx: number) => void;
  onToggleLayoutMode: (mode: WidgetLayoutMode) => void;
  // Apps Android
  selectedAppIndex: number;
  setSelectedAppIndex: (i: number) => void;
  onLaunchAndroidApp: (app: AndroidAppShortcut) => void;
  // Dialer
  dialNumber: string;
  callLog: CallLogEntry[];
  onCallNumber: (num: string, name?: string) => void;
  // Messages
  smsText: string;
  t9ActiveHint: string;
  smsRecipientIndex: number;
  onSendSms: (method: 'sms' | 'whatsapp') => void;
  // Contacts
  selectedContactIndex: number;
  setSelectedContactIndex: (i: number) => void;
  // Camera & Gallery
  cameraStream: MediaStream | null;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  photos: GalleryPhoto[];
  selectedPhotoIndex: number;
  setSelectedPhotoIndex: (i: number) => void;
  onCapturePhoto: () => void;
  // Game
  snakeState: SnakeState;
  highScore: number;
  onResetSnake: () => void;
  // Radio
  fmFreq: number;
  fmPlaying: boolean;
  onToggleFm: () => void;
  // Organizer / Calc
  calcDisplay: string;
  calcPrev: string;
  calcOp: string | null;
  // Settings
  settingsIndex: number;
  setSettingsIndex: (i: number) => void;
  onToggleSetting: (idx: number) => void;
  // Status Toast inside LCD
  lcdNotice: string | null;
  onOpenStudio?: () => void;
}

export const PhoneScreens: React.FC<PhoneScreenProps> = ({
  screen,
  config,
  now,
  menuIndex,
  setMenuIndex,
  onNavigate,
  shadeOpen,
  setShadeOpen,
  notifications,
  headsUpNotification,
  onDismissHeadsUp,
  onDismissNotification,
  onClearNotifications,
  onTriggerTestNotification,
  onOpenNotification,
  controlCenter,
  onToggleControl,
  onChangeBrightness,
  isNativeApk,
  isDefaultLauncher,
  syncingNativeApps,
  apkDownloadProgress,
  onSetDefaultLauncher,
  onSyncNativeApps,
  onOpenAndroidSettings,
  githubInfo,
  onChangeGithubRepo,
  onCheckGithubBuild,
  onInstallGithubApk,
  onRequestBrowserNotifications,
  onSelectMenuSlot,
  currentTrack,
  trackIndex,
  totalTracks,
  isPlaying,
  trackElapsed,
  showPlaylistModal,
  onTogglePlay,
  onSelectTrack,
  onPrevTrack,
  onNextTrack,
  activeWidgetIndex,
  onChangeWidgetIndex,
  onToggleLayoutMode,
  selectedAppIndex,
  setSelectedAppIndex,
  onLaunchAndroidApp,
  dialNumber,
  callLog,
  onCallNumber,
  smsText,
  t9ActiveHint,
  smsRecipientIndex,
  onSendSms,
  selectedContactIndex,
  setSelectedContactIndex,
  cameraStream,
  cameraError,
  videoRef,
  photos,
  selectedPhotoIndex,
  setSelectedPhotoIndex,
  onCapturePhoto,
  snakeState,
  highScore,
  onResetSnake,
  fmFreq,
  fmPlaying,
  onToggleFm,
  calcDisplay,
  calcPrev,
  calcOp,
  settingsIndex,
  setSettingsIndex,
  onToggleSetting,
  lcdNotice,
  onOpenStudio,
}) => {
  const activePlaylistRef = useRef<HTMLButtonElement | null>(null);
  const [repoDraft, setRepoDraft] = useState(config.githubRepo);

  useEffect(() => {
    setRepoDraft(config.githubRepo);
  }, [config.githubRepo]);

  // Smooth lateral slide transition state between launcher screens
  const SCREEN_RANK: Record<ScreenId, number> = {
    standby: 0,
    menu: 1,
    walkman: 2,
    apps: 3,
    dialer: 4,
    messages: 5,
    contacts: 6,
    camera: 7,
    gallery: 8,
    game: 9,
    radio: 10,
    organizer: 11,
    notifications: 12,
    settings: 13,
  };

  const prevScreenRef = useRef<ScreenId>(screen);
  const [exitingScreen, setExitingScreen] = useState<ScreenId | null>(null);
  const [transitionDir, setTransitionDir] = useState<'forward' | 'back' | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevScreenRef.current;
    if (prev !== screen) {
      const dir = SCREEN_RANK[screen] >= SCREEN_RANK[prev] ? 'forward' : 'back';
      setTransitionDir(dir);
      setExitingScreen(prev);
      prevScreenRef.current = screen;

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setExitingScreen(null);
      }, 220);
    }
  }, [screen]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, videoRef, screen]);

  useEffect(() => {
    if (showPlaylistModal && activePlaylistRef.current) {
      activePlaylistRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [showPlaylistModal, trackIndex]);

  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  const unreadCount = notifications.filter((n) => n.unread).length;

  const remainingSec = Math.max(0, currentTrack.durationSec - trackElapsed);
  const progressPct = Math.min(100, (trackElapsed / Math.max(1, currentTrack.durationSec)) * 100);

  let leftSoftLabel = 'Menú';
  let rightSoftLabel = 'Apps';
  if (shadeOpen) {
    leftSoftLabel = 'Config';
    rightSoftLabel = 'Cerrar';
  } else if (screen === 'standby') {
    leftSoftLabel = 'Llamar';
    rightSoftLabel = 'Centro';
  } else if (screen === 'menu') {
    leftSoftLabel = 'Abrir';
    rightSoftLabel = 'Inicio';
  } else if (screen === 'walkman') {
    leftSoftLabel = isPlaying ? 'Pause' : 'Play';
    rightSoftLabel = showPlaylistModal ? 'Cerrar' : 'More';
  } else if (screen === 'apps') {
    leftSoftLabel = 'Abrir';
    rightSoftLabel = 'Volver';
  } else if (screen === 'dialer') {
    leftSoftLabel = 'Llamar';
    rightSoftLabel = 'Borrar';
  } else if (screen === 'messages') {
    leftSoftLabel = 'SMS';
    rightSoftLabel = 'WhatsApp';
  } else if (screen === 'contacts') {
    leftSoftLabel = 'Llamar';
    rightSoftLabel = 'Volver';
  } else if (screen === 'camera') {
    leftSoftLabel = 'Foto';
    rightSoftLabel = 'Galería';
  } else if (screen === 'game') {
    leftSoftLabel = 'Reiniciar';
    rightSoftLabel = 'Volver';
  } else if (screen === 'radio') {
    leftSoftLabel = fmPlaying ? 'Silenciar' : 'Sintonizar';
    rightSoftLabel = 'Volver';
  } else if (screen === 'notifications') {
    leftSoftLabel = 'Simular';
    rightSoftLabel = 'Limpiar';
  } else if (screen === 'settings') {
    leftSoftLabel = 'Cambiar';
    rightSoftLabel = 'Volver';
  } else {
    leftSoftLabel = 'Aceptar';
    rightSoftLabel = 'Volver';
  }

  return (
    <div
      className="relative flex flex-col w-full h-full min-h-0 overflow-hidden select-none font-sans bg-[#05060A] text-white"
      style={{ filter: `brightness(${controlCenter.brightness}%)` }}
    >
      {/* Interactive Top Sony Hyper-HUD Status Bar (Tap to pull down Notification & Control Center) */}
      <button
        type="button"
        onClick={() => setShadeOpen((v) => !v)}
        aria-label="Abrir Centro de Notificaciones y Control Sony"
        className="relative z-30 shrink-0 w-full flex items-center justify-between px-2.5 py-1.5 bg-[#090B12]/90 border-b border-white/10 text-[10px] font-mono tabular-nums hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          {/* Futuristic 5G Signal Bars */}
          <div className="flex items-end gap-[2px]">
            <span className="w-[2px] h-[4px] bg-[#FF731D] rounded-full" />
            <span className="w-[2px] h-[6px] bg-[#FF731D] rounded-full" />
            <span className="w-[2px] h-[8px] bg-[#FF731D] rounded-full" />
            <span className={`w-[2px] h-[10px] rounded-full ${controlCenter.mobileData ? 'bg-sky-400' : 'bg-white/25'}`} />
          </div>
          {controlCenter.wifi && <Wifi className="w-2.5 h-2.5 text-sky-400" />}
          {unreadCount > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-[#FF8C38] font-bold">
              <Bell className="w-2.5 h-2.5" />
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 truncate max-w-[115px]">
          {screen === 'walkman' ? (
            <span className="text-[11px] font-extrabold tracking-tight text-[#FF7A18]">W. HYPER</span>
          ) : (
            <span className="text-[9.5px] font-semibold text-white/90 tracking-wide">
              {timeStr}
            </span>
          )}
          <ChevronDown className={`w-2.5 h-2.5 text-white/50 transition-transform ${shadeOpen ? 'rotate-180' : ''}`} />
        </div>

        <div className="flex items-center gap-1.5">
          {screen === 'walkman' && (
            <span className="text-[9px] text-sky-300">-{formatTimeSec(remainingSec)}</span>
          )}
          <div className="flex items-center">
            <div className="w-[16px] h-[8px] border border-white/60 rounded-[2px] p-[1px] flex gap-[1px]">
              <div className="flex-1 bg-emerald-400 rounded-[1px]" />
              <div className="flex-1 bg-emerald-400 rounded-[1px]" />
              <div className="flex-1 bg-emerald-400 rounded-[1px]" />
            </div>
          </div>
        </div>
      </button>

      {/* Main OLED Viewport with Low-Fi Lateral Screen Transitions */}
      <div className="relative flex-1 min-h-0 overflow-hidden hyper-hud-grid">
        {(() => {
          const renderScreenContent = (targetScreen: ScreenId, isExiting: boolean) => (
            <>
              {/* SCREEN: HYPER-FUTURISTIC STANDBY WITH DESKTOP WIDGETS & .hyper-hud-grid */}
              {targetScreen === 'standby' && (
          <div className="relative flex flex-col justify-between w-full h-full min-h-0 p-2.5 bg-gradient-to-b from-[#060810]/85 via-[#090C16]/85 to-[#120A06]/90 hyper-hud-grid overflow-hidden">
            {/* Optional User Custom Wallpaper */}
            {config.customWallpaperUrl && (
              <>
                <img
                  src={config.customWallpaperUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[#05060A]"
                  style={{ opacity: Math.max(0.15, Math.min(0.92, (config.wallpaperDim ?? 65) / 100)) }}
                  aria-hidden="true"
                />
              </>
            )}

            {/* Ambient plasma glow orbs */}
            <div
              className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-30"
              style={{ backgroundColor: config.accentColor || '#FF6A00' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-sky-500/15 blur-2xl"
              aria-hidden="true"
            />

            {/* Top Carrier & Date Telemetry Strip */}
            <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-white/75">
              <span className="font-bold truncate max-w-[110px]" style={{ color: config.accentColor || '#FF8C38' }}>
                {config.carrierText}
              </span>
              <span className="capitalize text-sky-300/85">{dateStr}</span>
            </div>

            {/* Hyper-Futuristic Desktop Widget Host (Clock / Monthly Calendar / Weather / Walkman / Notes / System) */}
            <DesktopWidgetHost
              config={config}
              now={now}
              activeWidgetIndex={activeWidgetIndex}
              onChangeWidgetIndex={onChangeWidgetIndex}
              onToggleLayoutMode={onToggleLayoutMode}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              trackElapsed={trackElapsed}
              onTogglePlay={onTogglePlay}
              onPrevTrack={onPrevTrack}
              onNextTrack={onNextTrack}
              onNavigate={onNavigate}
            />

            {/* Quick Native Android App Dock (Real Icons when synced in APK or uploaded) */}
            <div className="relative z-10 grid grid-cols-4 gap-1.5 w-full">
              {config.apps.slice(0, 4).map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onLaunchAndroidApp(app)}
                  className="flex flex-col items-center justify-center rounded-xl py-1 px-1 bg-white/[0.06] border border-white/12 hover:border-[#FF731D] text-white transition-all active:scale-95 cursor-pointer"
                >
                  {app.iconDataUrl ? (
                    <img
                      src={app.iconDataUrl}
                      alt={app.name}
                      className="w-5 h-5 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <span style={{ color: config.accentColor || '#FF8C38' }}>
                      {renderShortcutIcon(app.iconType, 'w-4 h-4')}
                    </span>
                  )}
                  <span className="mt-0.5 text-[7.5px] font-medium truncate w-full text-center text-white/85">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SCREEN: HYPER-FUTURISTIC CUSTOMIZABLE 12-ICON SONY MENU */}
        {targetScreen === 'menu' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#070910] to-[#0D101B]">
            <div className="shrink-0 px-2.5 py-1.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-tight truncate" style={{ color: config.accentColor || '#FF8C38' }}>
                {(config.menuItems[menuIndex] || MAIN_MENU_ITEMS[menuIndex])?.label || 'Menú'}
              </span>
              <span className="text-[9px] font-mono text-sky-300/80">
                [{(config.menuItems[menuIndex] || MAIN_MENU_ITEMS[menuIndex])?.keyHint}] · {menuIndex + 1}/
                {(config.menuItems.length || MAIN_MENU_ITEMS.length)}
              </span>
            </div>
            <div className="grid grid-cols-3 grid-rows-4 gap-1.5 p-2 flex-1 min-h-0 overflow-hidden">
              {(config.menuItems.length > 0
                ? config.menuItems
                : MAIN_MENU_ITEMS.map(
                    (m): MainMenuSlot => ({
                      id: m.id,
                      label: m.label,
                      keyHint: m.keyHint,
                      actionType: 'screen',
                      targetScreen: m.id,
                      iconType: 'tools',
                    })
                  )
              ).map((item, idx) => {
                const active = idx === menuIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMenuIndex(idx);
                      onSelectMenuSlot(item);
                    }}
                    style={
                      active
                        ? {
                            background: `linear-gradient(180deg, ${config.accentColor || '#FF7A18'} 0%, #9A2F00 100%)`,
                            borderColor: config.accentColor || '#FFB066',
                          }
                        : undefined
                    }
                    className={`relative flex flex-col items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer ${
                      active
                        ? 'text-white hyper-glow-orange'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/25 text-white/80'
                    }`}
                  >
                    {item.iconDataUrl ? (
                      <img
                        src={item.iconDataUrl}
                        alt={item.label}
                        className={`w-6 h-6 rounded-lg object-cover transition-transform duration-150 ${
                          active ? 'scale-110 ring-1 ring-white/80' : ''
                        }`}
                      />
                    ) : item.actionType === 'screen' ? (
                      renderMenuGlyph(item.targetScreen, active)
                    ) : (
                      renderShortcutIcon(item.iconType, `w-5 h-5 ${active ? 'text-white scale-110' : 'text-[#FF8C38]'}`)
                    )}
                    <span className="mt-1 text-[8px] leading-tight font-semibold truncate max-w-[92%]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN: HYPER-FUTURISTIC WALKMAN PLAYER */}
        {targetScreen === 'walkman' && (
          <div className="relative flex flex-col justify-between w-full h-full min-h-0 bg-gradient-to-b from-[#080A12] via-[#130C08] to-[#260D02] p-3 overflow-hidden">
            {/* Holographic Concentric Radar Rings */}
            <div
              className={`pointer-events-none absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-[#FF731D]/25 ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '14s' }}
              aria-hidden="true"
            >
              <span className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-[#FF8C38] shadow-[0_0_8px_#FF731D]" />
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-sky-400/20"
              aria-hidden="true"
            />

            {/* Top Elapsed & Format Telemetry */}
            <div className="relative z-10 flex items-center justify-between text-[9.5px] font-mono text-white/75 tabular-nums">
              <span className="text-[#FF8C38] font-bold">{formatTimeSec(trackElapsed)}</span>
              <span className="text-sky-300/80">{currentTrack.bpm} BPM · HI-RES</span>
            </div>

            {/* Center Track Identity (The Mops / Late July / Working Hours) */}
            <div className="relative z-10 my-auto text-center px-1">
              <p className="text-[14px] font-extrabold tracking-tight text-white truncate">
                {currentTrack.artist}
              </p>
              <p className="mt-0.5 text-[11.5px] font-medium text-sky-300/90 truncate">
                {currentTrack.album}
              </p>
              <p className="mt-1 text-[13px] font-bold italic text-[#FF9233] truncate">
                {currentTrack.title}
              </p>

              {/* 11-Band Futuristic Plasma Spectrum */}
              <div className="mt-3.5 flex items-end justify-center gap-1 h-6" aria-hidden="true">
                {[0.5, 0.85, 0.65, 1, 0.75, 0.95, 0.6, 0.88, 0.7, 0.92, 0.55].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1.5 rounded-t-full transition-all duration-150 ${
                      i % 3 === 0 ? 'bg-sky-400/85' : 'bg-gradient-to-t from-[#E8530E] to-[#FFB36B]'
                    }`}
                    style={{
                      height: isPlaying
                        ? `${Math.round(((Math.sin(trackElapsed * 2.4 + i * 0.9) + 1.35) / 2.35) * 20 * h + 3)}px`
                        : '4px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Laser Progress Track & Counter */}
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center gap-2 bg-white/[0.07] border border-white/15 rounded-lg px-2 py-1.5">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  className="text-[#FF8C38] flex items-center justify-center cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <div className="relative flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF5E00] via-[#FF8C38] to-sky-400 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[9.5px] font-mono text-white/80 tabular-nums">
                <span className="text-[#FF8C38] font-bold">
                  {String(trackIndex + 1).padStart(2, '0')}/{String(totalTracks).padStart(2, '0')}
                </span>
                <span className="text-[8.5px] text-white/60">
                  {currentTrack.customUrl ? 'AUDIO LOCAL' : 'SYNTH CORE'}
                </span>
              </div>
            </div>

            {/* Playlist Modal ("More" softkey) */}
            {showPlaylistModal && (
              <div className="w800-modal-rise absolute inset-0 z-20 bg-[#070910]/95 backdrop-blur-md text-white flex flex-col p-2.5 overflow-hidden">
                <div className="shrink-0 text-[10px] font-bold text-[#FF8C38] pb-1.5 border-b border-white/15 flex items-center justify-between">
                  <span>Cola Walkman ({totalTracks})</span>
                  <span className="font-mono text-[9px] text-sky-300">▲▼ Elegir</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 mt-1">
                  {config.tracks.map((tr, idx) => {
                    const active = idx === trackIndex;
                    return (
                      <button
                        key={tr.id}
                        ref={active ? activePlaylistRef : null}
                        type="button"
                        onClick={() => onSelectTrack(idx)}
                        className={`w-full text-left px-2 py-1.5 text-[10px] flex items-center justify-between rounded-lg cursor-pointer ${
                          active ? 'bg-[#E85D1A] text-white font-semibold' : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate pr-1">
                          {String(idx + 1).padStart(2, '0')}. {tr.title}
                        </span>
                        <span className="text-[8.5px] font-mono opacity-75 shrink-0">{tr.artist}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN: NOTIFICATIONS SONY HUB */}
        {targetScreen === 'notifications' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2.5">
            <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[10.5px] font-bold text-[#FF8C38]">
                Notificaciones Sony ({notifications.length})
              </span>
              <button
                type="button"
                onClick={onTriggerTestNotification}
                className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 hover:bg-[#E85D1A] text-white cursor-pointer"
              >
                + Probar
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 mt-2">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-3">
                  <Bell className="w-6 h-6 text-white/30 mb-1.5" />
                  <p className="text-[10px] text-white/60">Sin notificaciones pendientes.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl bg-white/[0.05] border border-white/12 p-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[8.5px] font-mono">
                      <span className="text-[#FF8C38] font-bold">{n.appName}</span>
                      <div className="flex items-center gap-1.5 text-white/50">
                        <span>{n.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => onDismissNotification(n.id)}
                          aria-label="Cerrar notificación"
                          className="hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenNotification(n)}
                      className="text-left cursor-pointer"
                    >
                      <div className="text-[10px] font-bold text-white truncate">{n.title}</div>
                      <div className="text-[9px] text-white/75 line-clamp-2">{n.body}</div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SCREEN: APPS ANDROID (LAUNCHER CON ICONOS REALES) */}
        {targetScreen === 'apps' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910]">
            <div className="shrink-0 px-2.5 py-1.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Apps Android ({config.apps.length})</span>
              {isNativeApk ? (
                <button
                  type="button"
                  onClick={onSyncNativeApps}
                  className="text-[8.5px] font-mono text-[#FF8C38] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${syncingNativeApps ? 'animate-spin' : ''}`} />
                  Sincronizar
                </button>
              ) : (
                <span className="text-[9px] font-mono text-[#FF8C38]">1-9 Rápido</span>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 p-1">
              {config.apps.map((app, idx) => {
                const active = idx === selectedAppIndex;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      setSelectedAppIndex(idx);
                      onLaunchAndroidApp(app);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      active ? 'bg-[#E85D1A] text-white' : 'hover:bg-white/[0.06] text-white/90'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {app.iconDataUrl ? (
                        <img
                          src={app.iconDataUrl}
                          alt={app.name}
                          className="w-6 h-6 rounded-lg object-cover shrink-0 shadow-sm"
                        />
                      ) : (
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-[#FF8C38]'
                          }`}
                        >
                          {renderShortcutIcon(app.iconType, 'w-3.5 h-3.5')}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-bold truncate">{app.name}</div>
                        <div className={`text-[8px] font-mono truncate ${active ? 'text-white/80' : 'text-white/50'}`}>
                          {app.packageName || app.category}
                        </div>
                      </div>
                    </div>
                    {app.quickKey && (
                      <span className={`text-[9px] font-mono font-bold ml-1 shrink-0 ${active ? 'text-white' : 'text-sky-300'}`}>
                        [{app.quickKey}]
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN: DIALER */}
        {targetScreen === 'dialer' && (
          <div className="flex flex-col justify-between w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2.5">
            <div className="shrink-0">
              <div className="text-[9px] font-mono text-[#FF8C38] uppercase tracking-wider">
                Marcador Neural DTMF
              </div>
              <div className="mt-1 min-h-[42px] rounded-xl bg-white/[0.06] border border-[#FF731D]/40 px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-mono text-[16px] font-bold tracking-wide text-white truncate tabular-nums">
                  {dialNumber || 'Pulsa 0-9...'}
                </span>
                {dialNumber && (
                  <button
                    type="button"
                    onClick={() => onCallNumber(dialNumber)}
                    className="p-1.5 rounded-lg bg-emerald-500 text-white cursor-pointer"
                    aria-label="Llamar"
                  >
                    <Phone className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 mt-2 overflow-y-auto">
              <div className="text-[9px] font-mono text-white/55 mb-1">Registro reciente</div>
              {callLog.length === 0 ? (
                <p className="text-[10px] text-white/50 py-4 text-center">
                  Marca un número o selecciona un contacto.
                </p>
              ) : (
                <div className="space-y-1">
                  {callLog.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onCallNumber(c.phone, c.nameOrNumber)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-[10px] hover:border-[#FF731D] cursor-pointer"
                    >
                      <span className="font-semibold truncate">{c.nameOrNumber}</span>
                      <span className="font-mono text-[9px] text-sky-300 shrink-0 ml-1">{c.timestamp}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN: MESSAGES T9 */}
        {targetScreen === 'messages' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2.5">
            <div className="shrink-0 flex items-center justify-between pb-1 border-b border-white/10">
              <span className="text-[10px] font-bold text-[#FF8C38]">Mensaje T9</span>
              <span className="text-[8.5px] font-mono text-sky-300">{t9ActiveHint}</span>
            </div>

            <div className="shrink-0 mt-1.5 text-[9.5px] flex items-center gap-1 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/10">
              <span className="text-white/55">Para:</span>
              <span className="font-semibold truncate text-white">
                {config.contacts[smsRecipientIndex]?.name || 'Libre'}
              </span>
            </div>

            <div className="mt-1.5 flex-1 min-h-0 rounded-xl bg-white/[0.05] border border-white/15 p-2 font-mono text-[10.5px] leading-snug break-words overflow-y-auto text-white">
              {smsText || <span className="text-white/40">Escribe con teclas 2-9 (0=espacio)...</span>}
              <span className="inline-block w-[6px] h-[11px] bg-[#FF8C38] ml-0.5 align-middle animate-pulse" />
            </div>

            <div className="shrink-0 mt-1.5 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => onSendSms('sms')}
                className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9.5px] font-semibold cursor-pointer"
              >
                Enviar SMS
              </button>
              <button
                type="button"
                onClick={() => onSendSms('whatsapp')}
                className="flex-1 py-1.5 rounded-lg bg-[#E85D1A] text-white text-[9.5px] font-semibold cursor-pointer"
              >
                WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: CONTACTS */}
        {targetScreen === 'contacts' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910]">
            <div className="shrink-0 px-2.5 py-1.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Contactos ({config.contacts.length})</span>
              <span className="text-[9px] text-[#FF8C38]">Llamar</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 p-1">
              {config.contacts.map((contact: ContactEntry, idx: number) => {
                const active = idx === selectedContactIndex;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setSelectedContactIndex(idx);
                      onCallNumber(contact.phone, contact.name);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left cursor-pointer ${
                      active ? 'bg-[#E85D1A] text-white' : 'hover:bg-white/[0.06] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-bold truncate">{contact.name}</div>
                        <div className={`text-[9px] font-mono truncate ${active ? 'text-white/85' : 'text-white/55'}`}>
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                    <Phone className="w-3 h-3 shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN: CAMERA */}
        {targetScreen === 'camera' && (
          <div className="relative flex flex-col justify-between w-full h-full min-h-0 bg-[#05060A] text-white overflow-hidden">
            {cameraStream && !isExiting ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover contrast-110"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                <Camera className="w-7 h-7 text-[#FF8C38] mb-1.5" />
                <p className="text-[10px] font-bold">Cyber-shot HUD 2.0 MP</p>
                <p className="text-[9px] text-white/65 mt-1">
                  {cameraError || 'Activa la cámara o captura postal.'}
                </p>
              </div>
            )}

            <div className="relative z-10 flex items-center justify-between px-2 py-1 bg-black/55 text-[8.5px] font-mono">
              <span className="text-[#FF8C38] font-bold">AF · CYBER-HUD</span>
              <span className="text-sky-300">1632×1224</span>
            </div>

            <div className="relative z-10 m-auto w-14 h-10 border border-sky-400/70 rounded-[3px] pointer-events-none" />

            <div className="relative z-10 px-2 py-1.5 bg-black/60 flex items-center justify-between text-[9px]">
              <span>Fotos: {photos.length}</span>
              <button
                type="button"
                onClick={onCapturePhoto}
                className="px-2.5 py-0.5 rounded bg-[#E85D1A] text-white font-bold cursor-pointer"
              >
                Capturar
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: GALLERY */}
        {targetScreen === 'gallery' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2">
            <div className="shrink-0 flex items-center justify-between text-[10px] font-bold pb-1 border-b border-white/10">
              <span>Galería ({photos.length})</span>
              <span className="font-mono text-[9px] text-[#FF8C38]">
                {photos.length > 0 ? `${selectedPhotoIndex + 1}/${photos.length}` : '0/0'}
              </span>
            </div>
            {photos.length === 0 ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-2">
                <FolderOpen className="w-6 h-6 text-white/35 mb-1" />
                <p className="text-[10px] text-white/65">Sin capturas todavía. Abre Cámara 2MP.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col mt-1.5 overflow-hidden">
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-white/10">
                  <img
                    src={photos[selectedPhotoIndex]?.dataUrl}
                    alt={photos[selectedPhotoIndex]?.label || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="shrink-0 mt-1 flex items-center justify-between text-[9px] text-white/80">
                  <span className="truncate font-mono">{photos[selectedPhotoIndex]?.label}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN: HYPER SNAKE */}
        {targetScreen === 'game' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2">
            <div className="shrink-0 flex items-center justify-between text-[9.5px] font-mono pb-1">
              <span className="font-bold text-[#FF8C38]">PTS: {snakeState.score}</span>
              <span className="text-sky-300">RÉCORD: {highScore}</span>
            </div>
            <div className="relative flex-1 min-h-0 bg-white/[0.04] border border-white/15 rounded-xl overflow-hidden grid grid-cols-12 grid-rows-12">
              {Array.from({ length: 144 }).map((_, idx) => {
                const x = idx % 12;
                const y = Math.floor(idx / 12);
                const isHead = snakeState.snake[0]?.x === x && snakeState.snake[0]?.y === y;
                const isBody = snakeState.snake.some((seg, i) => i > 0 && seg.x === x && seg.y === y);
                const isFood = snakeState.food.x === x && snakeState.food.y === y;
                return (
                  <div
                    key={idx}
                    className={`${
                      isHead
                        ? 'bg-[#FF7A18] rounded-[2px]'
                        : isBody
                        ? 'bg-[#FFAD66]/85 rounded-[1px]'
                        : isFood
                        ? 'bg-sky-400 rounded-full scale-75'
                        : ''
                    }`}
                  />
                );
              })}

              {snakeState.gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-2">
                  <p className="text-[12px] font-bold text-[#FF8C38]">Fin de partida</p>
                  <p className="text-[10px] mt-0.5">Puntos: {snakeState.score}</p>
                  <button
                    type="button"
                    onClick={onResetSnake}
                    className="mt-2 px-3 py-1 rounded-lg bg-[#E85D1A] text-white text-[10px] font-bold cursor-pointer"
                  >
                    Reiniciar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN: RADIO FM */}
        {targetScreen === 'radio' && (
          <div className="flex flex-col justify-between w-full h-full min-h-0 overflow-hidden bg-[#070910] p-3">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold text-[#FF8C38]">FM RDS TUNER</span>
              <span className="text-sky-300">{fmPlaying ? 'ON AIR' : 'STANDBY'}</span>
            </div>

            <div className="text-center my-auto">
              <div className="font-mono text-[30px] font-bold tabular-nums text-white">
                {fmFreq.toFixed(1)} <span className="text-[12px] text-[#FF8C38]">MHz</span>
              </div>
              <div className="mt-2 h-5 flex items-center justify-between px-2 border-y border-white/15 text-[8px] font-mono text-white/55">
                <span>88</span>
                <span>92</span>
                <span className="text-[#FF8C38] font-bold">|</span>
                <span>100</span>
                <span>108</span>
              </div>
              <p className="mt-2 text-[9px] text-white/65">Usa ◄ ► para sintonizar</p>
            </div>

            <button
              type="button"
              onClick={onToggleFm}
              className="w-full py-1.5 rounded-xl bg-[#E85D1A] text-white text-[10px] font-bold cursor-pointer"
            >
              {fmPlaying ? 'Apagar Radio' : 'Encender Radio'}
            </button>
          </div>
        )}

        {/* SCREEN: CALCULATOR */}
        {targetScreen === 'organizer' && (
          <div className="flex flex-col justify-between w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2.5">
            <div>
              <div className="text-[9.5px] font-mono font-bold text-[#FF8C38]">CALCULO HUD</div>
              <div className="mt-1 rounded-xl bg-white/[0.06] border border-white/15 p-2 text-right font-mono">
                <div className="text-[9px] text-sky-300 min-h-[12px]">
                  {calcPrev} {calcOp || ''}
                </div>
                <div className="text-[18px] font-bold tabular-nums truncate text-white">{calcDisplay}</div>
              </div>
              <p className="mt-1.5 text-[8.5px] text-white/55">
                0-9: dígitos · ▲▼◄►: + - × ÷ · Centro: = · C: limpiar
              </p>
            </div>

            <div className="border-t border-white/10 pt-1.5">
              <div className="text-[9px] font-bold text-[#FF8C38]">Nota rápida</div>
              <p className="mt-0.5 text-[9px] text-white/75 line-clamp-2">
                {config.quickNotes[0] || 'Sin notas.'}
              </p>
            </div>
          </div>
        )}

        {/* SCREEN: CENTRO DE CONFIGURACIÓN SONY (IN-PHONE) */}
        {targetScreen === 'settings' && (
          <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070910] p-2">
            <div className="shrink-0 px-1 pb-1.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-[#FF8C38]">Centro de Configuración</span>
              <span className="text-[8.5px] font-mono text-sky-300">{APP_VERSION}</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 mt-1.5 pr-0.5">
              {/* Native Android Home Launcher Control Card */}
              <div className="rounded-xl bg-white/[0.06] border border-sky-400/35 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-sky-300" />
                    Launcher Android (Home)
                  </span>
                  <span
                    className={`text-[8px] font-mono font-bold ${
                      isNativeApk
                        ? isDefaultLauncher
                          ? 'text-emerald-400'
                          : 'text-[#FF8C38]'
                        : 'text-white/55'
                    }`}
                  >
                    {isNativeApk ? (isDefaultLauncher ? 'ACTIVO' : 'APK LISTO') : 'MODO WEB'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={onSetDefaultLauncher}
                    className="py-1.5 px-2 rounded-lg bg-[#E85D1A] hover:bg-[#FF731D] text-white text-[8.5px] font-bold cursor-pointer"
                  >
                    {isDefaultLauncher ? 'Inicio Activo ✓' : 'Elegir Launcher'}
                  </button>
                  <button
                    type="button"
                    onClick={onSyncNativeApps}
                    className="py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[8.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${syncingNativeApps ? 'animate-spin' : ''}`} />
                    Apps Reales
                  </button>
                </div>
              </div>

              {/* Install & Update directly from GitHub Compilation */}
              <div className="rounded-xl bg-white/[0.06] border border-[#FF731D]/45 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-white flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-[#FF8C38]" />
                    Actualizar APK GitHub
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeGithubRepo(repoDraft);
                      onCheckGithubBuild(repoDraft);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-[#E85D1A] text-white text-[8px] font-bold cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${githubInfo.checking ? 'animate-spin' : ''}`} />
                    Buscar APK
                  </button>
                </div>

                <input
                  type="text"
                  value={repoDraft}
                  onChange={(e) => setRepoDraft(e.target.value)}
                  onBlur={() => onChangeGithubRepo(repoDraft)}
                  placeholder="usuario/w800i-launcher"
                  aria-label="Repositorio GitHub para APK"
                  className="w-full px-2 py-1 rounded bg-black/50 border border-white/15 text-[8.5px] font-mono text-white placeholder:text-white/35 focus:outline-none focus:border-[#FF731D]"
                />

                {apkDownloadProgress !== null && (
                  <div className="space-y-0.5">
                    <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-[#FF731D] transition-all duration-150"
                        style={{ width: `${apkDownloadProgress}%` }}
                      />
                    </div>
                    <p className="text-[8px] font-mono text-sky-300">
                      Descargando APK nativo: {apkDownloadProgress}%
                    </p>
                  </div>
                )}

                {githubInfo.apkUrl ? (
                  <button
                    type="button"
                    onClick={onInstallGithubApk}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#E85D1A] hover:bg-[#FF731D] text-white text-[9px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1 truncate">
                      <Download className="w-3 h-3 shrink-0" />
                      {githubInfo.updateAvailable ? 'Actualizar APK' : 'Instalar APK'} ({githubInfo.releaseTag || 'latest'})
                    </span>
                    <span className="font-mono text-[8px] opacity-90 shrink-0 ml-1">
                      {githubInfo.apkSizeMb || 'APK'}
                    </span>
                  </button>
                ) : (
                  <p className="text-[8px] text-white/65 leading-tight">
                    {githubInfo.error
                      ? githubInfo.error
                      : githubInfo.latestRunStatus
                      ? `Build Actions: ${githubInfo.latestRunStatus} (${githubInfo.latestRunConclusion || 'en curso'})`
                      : 'Escribe tu repo GitHub y pulsa Buscar APK.'}
                  </p>
                )}
              </div>

              {onOpenStudio && (
                <button
                  type="button"
                  onClick={onOpenStudio}
                  className="lg:hidden w-full rounded-xl bg-[#FF731D] text-white px-2.5 py-1.5 text-[9.5px] font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>Personalizar Todo · Iconos · GitHub</span>
                  <span>→</span>
                </button>
              )}

              {/* System Notification & Fullscreen Quick Actions */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    isNativeApk ? onOpenAndroidSettings('notifications') : onRequestBrowserNotifications()
                  }
                  className="rounded-xl bg-white/[0.05] border border-white/10 hover:border-sky-400/50 p-1.5 text-[8.5px] font-semibold text-left cursor-pointer"
                >
                  <span className="block text-sky-300 font-bold">Notif. Android</span>
                  <span className="text-white/65">
                    {isNativeApk ? 'Lector del sistema' : 'Activar permisos'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleControl('fullscreenActive')}
                  className="rounded-xl bg-white/[0.05] border border-white/10 hover:border-[#FF731D]/60 p-1.5 text-[8.5px] font-semibold text-left cursor-pointer"
                >
                  <span className="block text-[#FF8C38] font-bold">Sobre ventanas</span>
                  <span className="text-white/65">
                    {controlCenter.fullscreenActive ? 'Salir inmersivo' : 'Modo inmersivo'}
                  </span>
                </button>
              </div>

              {/* Hardware & UI Toggles */}
              <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
                {[
                  { label: 'Audio teclas & Synth', value: config.soundEnabled ? 'ON' : 'OFF' },
                  { label: 'Vibración Android', value: config.hapticEnabled ? 'ON' : 'OFF' },
                  { label: 'Líneas HUD Scan', value: config.lcdScanlines ? 'ON' : 'OFF' },
                  {
                    label: 'Carcasa',
                    value:
                      config.skin === 'w800i-white'
                        ? 'W800i'
                        : config.skin === 'w810i-black'
                        ? 'W810i'
                        : config.skin === 'w580i-silver'
                        ? 'W580i'
                        : 'Custom',
                  },
                  { label: 'Tema OLED', value: config.wallpaper },
                ].map((row, idx) => {
                  const active = idx === settingsIndex;
                  return (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => {
                        setSettingsIndex(idx);
                        onToggleSetting(idx);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-left text-[9.5px] cursor-pointer ${
                        active ? 'bg-[#E85D1A] text-white' : 'bg-white/[0.03] hover:bg-white/[0.07] text-white/90'
                      }`}
                    >
                      <span className="font-semibold truncate pr-2">{row.label}</span>
                      <span className="font-mono text-[8.5px] shrink-0 flex items-center gap-1">
                        {row.value} <Check className="w-2.5 h-2.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
            </>
          );

          return (
            <>
              {exitingScreen && exitingScreen !== screen && (
                <div
                  key={`exit-${exitingScreen}-${screen}`}
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${
                    transitionDir === 'back' ? 'w800-screen-out-right' : 'w800-screen-out-left'
                  }`}
                >
                  {renderScreenContent(exitingScreen, true)}
                </div>
              )}

              <div
                key={`enter-${screen}`}
                className={`relative z-10 w-full h-full min-h-0 overflow-hidden ${
                  transitionDir === 'forward'
                    ? 'w800-screen-in-right'
                    : transitionDir === 'back'
                    ? 'w800-screen-in-left'
                    : ''
                }`}
              >
                {renderScreenContent(screen, false)}
              </div>
            </>
          );
        })()}

        {/* SONY HYPER-NOTIFICATION SHADE & CONTROL CENTER OVERLAY */}
        {shadeOpen && (
          <div className="w800-shade-drop absolute inset-0 z-40 bg-[#06080F]/95 backdrop-blur-md flex flex-col p-2.5 overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[10px] font-bold text-[#FF8C38]">Sony Control & Notificaciones</span>
              <button
                type="button"
                onClick={() => setShadeOpen(false)}
                aria-label="Cerrar centro de control"
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Control Center Quick Tiles */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onToggleControl('wifi')}
                className={`p-1.5 rounded-xl border text-[8.5px] font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
                  controlCenter.wifi ? 'bg-[#E85D1A] border-[#FF9E5E] text-white' : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleControl('bluetooth')}
                className={`p-1.5 rounded-xl border text-[8.5px] font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
                  controlCenter.bluetooth ? 'bg-sky-600 border-sky-400 text-white' : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>BT</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleSetting(0)}
                className={`p-1.5 rounded-xl border text-[8.5px] font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
                  config.soundEnabled ? 'bg-[#E85D1A] border-[#FF9E5E] text-white' : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                {config.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Sonido</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleControl('fullscreenActive')}
                className={`p-1.5 rounded-xl border text-[8.5px] font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
                  controlCenter.fullscreenActive ? 'bg-[#E85D1A] border-[#FF9E5E] text-white' : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Full HUD</span>
              </button>
              <button
                type="button"
                onClick={githubInfo.apkUrl ? onInstallGithubApk : () => onCheckGithubBuild()}
                className="p-1.5 rounded-xl border bg-white/5 border-white/15 hover:border-[#FF731D] text-[8.5px] font-semibold flex flex-col items-center gap-0.5 text-white cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#FF8C38] ${githubInfo.checking ? 'animate-spin' : ''}`} />
                <span>{githubInfo.apkUrl ? 'APK GitHub' : 'Buscar APK'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShadeOpen(false);
                  onNavigate('settings');
                }}
                className="p-1.5 rounded-xl border bg-white/5 border-white/15 hover:border-sky-400 text-[8.5px] font-semibold flex flex-col items-center gap-0.5 text-white cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-sky-300" />
                <span>Config</span>
              </button>
            </div>

            {/* Brightness Slider */}
            <div className="mt-2 flex items-center gap-2 bg-white/[0.05] rounded-xl px-2 py-1.5 border border-white/10">
              <Sun className="w-3.5 h-3.5 text-[#FF8C38] shrink-0" />
              <input
                type="range"
                min={50}
                max={120}
                value={controlCenter.brightness}
                onChange={(e) => onChangeBrightness(Number(e.target.value))}
                aria-label="Brillo OLED"
                className="w-full accent-[#FF731D] h-1.5 cursor-pointer"
              />
            </div>

            {/* Sony Notifications List */}
            <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-white/65">
              <span>Notificaciones ({notifications.length})</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearNotifications}
                  className="text-[#FF8C38] hover:underline cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="mt-1.5 space-y-1.5 flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-[9.5px] text-white/50 text-center py-4">Sin alertas activas</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl bg-white/[0.06] border border-white/12 p-2 flex items-start justify-between gap-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenNotification(n)}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-[8.5px] font-mono">
                        <span className="text-[#FF8C38] font-bold">{n.appName}</span>
                        <span className="text-white/40">{n.timestamp}</span>
                      </div>
                      <div className="text-[9.5px] font-bold text-white truncate">{n.title}</div>
                      <div className="text-[8.5px] text-white/75 truncate">{n.body}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismissNotification(n.id)}
                      aria-label="Descartar"
                      className="text-white/50 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* FLOATING SONY HEADS-UP NOTIFICATION BANNER (Passes over active screen) */}
        {headsUpNotification && !shadeOpen && (
          <div className="w800-shade-drop absolute top-2 left-2 right-2 z-50 rounded-xl bg-[#0B0E17]/95 border border-[#FF731D] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <div className="flex items-center justify-between text-[8.5px] font-mono">
              <span className="text-[#FF8C38] font-bold flex items-center gap-1">
                <Bell className="w-2.5 h-2.5" />
                {headsUpNotification.appName}
              </span>
              <button
                type="button"
                onClick={onDismissHeadsUp}
                aria-label="Cerrar aviso"
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenNotification(headsUpNotification)}
              className="mt-0.5 w-full text-left cursor-pointer"
            >
              <div className="text-[10px] font-bold text-white truncate">{headsUpNotification.title}</div>
              <div className="text-[9px] text-white/80 truncate">{headsUpNotification.body}</div>
            </button>
          </div>
        )}

        {/* Optional LCD Scanline Filter */}
        {config.lcdScanlines && (
          <div className="pointer-events-none absolute inset-0 z-20 lcd-scanlines opacity-55" />
        )}

        {/* In-LCD Toast Notice */}
        {lcdNotice && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-40 rounded-lg bg-[#090B12]/95 text-white px-2 py-1 text-[9.5px] font-mono text-center border border-[#FF731D]/50 shadow-lg">
            {lcdNotice}
          </div>
        )}
      </div>

      {/* Bottom Sony Hyper-Softkey Bar */}
      <div className="relative z-30 shrink-0 flex items-center justify-between px-2.5 py-1.5 bg-[#090B12] border-t border-white/10 text-[10px] font-bold">
        <span className="truncate max-w-[74px] text-[#FF8C38]">{leftSoftLabel}</span>
        <span className="text-[8px] font-mono text-sky-400/75">●</span>
        <span className="truncate max-w-[74px] text-right text-white/90">{rightSoftLabel}</span>
      </div>
    </div>
  );
};
