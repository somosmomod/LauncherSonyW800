export type ChassisSkin = 'w800i-white' | 'w810i-black' | 'w580i-silver' | 'custom';

export type WallpaperStyle = 'walkman-wave' | 'orange-pulse' | 'pearl-minimal' | 'midnight-grid';

export const APP_VERSION = '2.5.0-APK';

export type ScreenId =
  | 'standby'
  | 'menu'
  | 'walkman'
  | 'dialer'
  | 'messages'
  | 'contacts'
  | 'camera'
  | 'apps'
  | 'game'
  | 'organizer'
  | 'gallery'
  | 'radio'
  | 'notifications'
  | 'settings';

export type AppIconType =
  | 'chat'
  | 'music'
  | 'map'
  | 'video'
  | 'mail'
  | 'browser'
  | 'camera'
  | 'phone'
  | 'social'
  | 'tools'
  | 'globe';

export interface AndroidAppShortcut {
  id: string;
  name: string;
  packageName: string;
  urlScheme: string;
  category: string;
  quickKey?: string;
  iconType: AppIconType;
  iconDataUrl?: string; // Real Android PNG icon or user-uploaded custom icon
}

export interface MainMenuSlot {
  id: string;
  label: string;
  keyHint: string;
  actionType: 'screen' | 'app';
  targetScreen: ScreenId;
  packageName?: string;
  urlScheme?: string;
  iconType: AppIconType;
  iconDataUrl?: string;
}

export interface WalkmanTrack {
  id: string;
  artist: string;
  album: string;
  title: string;
  durationSec: number;
  bpm: number;
  baseFreq: number;
  customUrl?: string;
}

export interface ContactEntry {
  id: string;
  name: string;
  phone: string;
  speedDial?: string;
}

export interface CallLogEntry {
  id: string;
  nameOrNumber: string;
  phone: string;
  timestamp: string;
  direction: 'outgoing' | 'missed' | 'incoming';
}

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  label: string;
  createdAt: string;
}

export interface SonyNotification {
  id: string;
  appName: string;
  title: string;
  body: string;
  timestamp: string;
  category: 'message' | 'music' | 'system' | 'call';
  unread: boolean;
  actionScreen?: ScreenId;
  actionUrl?: string;
}

export type DesktopWidgetId = 'clock' | 'calendar' | 'weather' | 'walkman' | 'notes' | 'system';

export type WidgetLayoutMode = 'carousel' | 'stacked';

export interface WeatherLocation {
  city: string;
  lat: number;
  lon: number;
}

export interface ControlCenterState {
  wifi: boolean;
  mobileData: boolean;
  bluetooth: boolean;
  dnd: boolean;
  brightness: number; // 45 to 100
  fullscreenActive: boolean;
}

export interface GithubBuildInfo {
  repo: string;
  checking: boolean;
  releaseTag: string | null;
  releaseName: string | null;
  publishedAt: string | null;
  apkUrl: string | null;
  apkName: string | null;
  apkSizeMb: string | null;
  releaseNotes: string | null;
  latestRunStatus: string | null;
  latestRunConclusion: string | null;
  latestRunUrl: string | null;
  latestRunSha: string | null;
  updateAvailable: boolean;
  error: string | null;
  lastCheckedAt: string | null;
}

export interface LauncherConfig {
  version: number;
  ownerName: string;
  carrierText: string;
  githubRepo: string;
  skin: ChassisSkin;
  customBezelColor?: string;
  customFaceColor?: string;
  accentColor: string;
  wallpaper: WallpaperStyle;
  customWallpaperUrl?: string;
  wallpaperDim: number;
  lcdScanlines: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  enabledWidgets: DesktopWidgetId[];
  widgetLayout: WidgetLayoutMode;
  weatherLocation: WeatherLocation;
  menuItems: MainMenuSlot[];
  apps: AndroidAppShortcut[];
  tracks: WalkmanTrack[];
  contacts: ContactEntry[];
  quickNotes: string[];
  importedSource?: string;
}
