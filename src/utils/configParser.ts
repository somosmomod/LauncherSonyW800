import {
  AndroidAppShortcut,
  AppIconType,
  ChassisSkin,
  ContactEntry,
  DesktopWidgetId,
  LauncherConfig,
  MainMenuSlot,
  ScreenId,
  WalkmanTrack,
  WallpaperStyle,
  WeatherLocation,
} from '../types/launcher';

export const DEFAULT_APPS: AndroidAppShortcut[] = [
  {
    id: 'app-whatsapp',
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    urlScheme: 'https://wa.me/',
    category: 'Mensajería',
    quickKey: '1',
    iconType: 'chat',
  },
  {
    id: 'app-spotify',
    name: 'Spotify',
    packageName: 'com.spotify.music',
    urlScheme: 'https://open.spotify.com/',
    category: 'Música',
    quickKey: '2',
    iconType: 'music',
  },
  {
    id: 'app-maps',
    name: 'Maps',
    packageName: 'com.google.android.apps.maps',
    urlScheme: 'https://maps.google.com/',
    category: 'Navegación',
    quickKey: '3',
    iconType: 'map',
  },
  {
    id: 'app-youtube',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    urlScheme: 'https://m.youtube.com/',
    category: 'Video',
    quickKey: '4',
    iconType: 'video',
  },
  {
    id: 'app-gmail',
    name: 'Gmail',
    packageName: 'com.google.android.gm',
    urlScheme: 'mailto:',
    category: 'Correo',
    quickKey: '5',
    iconType: 'mail',
  },
  {
    id: 'app-chrome',
    name: 'Navegador',
    packageName: 'com.android.chrome',
    urlScheme: 'https://www.google.com/',
    category: 'Web',
    quickKey: '6',
    iconType: 'browser',
  },
  {
    id: 'app-phone',
    name: 'Teléfono Nativo',
    packageName: 'com.google.android.dialer',
    urlScheme: 'tel:',
    category: 'Sistema',
    quickKey: '7',
    iconType: 'phone',
  },
  {
    id: 'app-instagram',
    name: 'Instagram',
    packageName: 'com.instagram.android',
    urlScheme: 'https://www.instagram.com/',
    category: 'Social',
    quickKey: '8',
    iconType: 'social',
  },
];

export const DEFAULT_TRACKS: WalkmanTrack[] = [
  { id: 't1', artist: 'The Mops', album: 'Late July', title: 'Morning Transit', durationSec: 198, bpm: 108, baseFreq: 261.63 },
  { id: 't2', artist: 'The Mops', album: 'Late July', title: 'Silver Harbour', durationSec: 214, bpm: 112, baseFreq: 293.66 },
  { id: 't3', artist: 'The Mops', album: 'Late July', title: 'Working Hours', durationSec: 237, bpm: 116, baseFreq: 329.63 },
  { id: 't4', artist: 'Walkman Classics', album: 'Stockholm 2005', title: 'Orange Glow', durationSec: 185, bpm: 120, baseFreq: 349.23 },
  { id: 't5', artist: 'Walkman Classics', album: 'Stockholm 2005', title: 'Mega Bass Pulse', durationSec: 224, bpm: 124, baseFreq: 392.0 },
  { id: 't6', artist: 'Neon Echoes', album: 'Cassette T9', title: 'Memory Stick', durationSec: 205, bpm: 104, baseFreq: 246.94 },
  { id: 't7', artist: 'Neon Echoes', album: 'Cassette T9', title: 'Infrared Beam', durationSec: 190, bpm: 118, baseFreq: 277.18 },
  { id: 't8', artist: 'Cyber-shot', album: '2.0 Megapixel', title: 'Autofocus', durationSec: 176, bpm: 110, baseFreq: 311.13 },
  { id: 't9', artist: 'Cyber-shot', album: '2.0 Megapixel', title: 'Pearl Housing', durationSec: 210, bpm: 114, baseFreq: 369.99 },
  { id: 't10', artist: 'Sony Ericsson', album: 'Polyphonic', title: 'DJ Mixer Loop', durationSec: 168, bpm: 126, baseFreq: 415.3 },
  { id: 't11', artist: 'Sony Ericsson', album: 'Polyphonic', title: 'Night Call', durationSec: 202, bpm: 98, baseFreq: 220.0 },
  { id: 't12', artist: 'The Mops', album: 'Late July', title: 'Closing Bell', durationSec: 246, bpm: 102, baseFreq: 246.94 },
];

export const DEFAULT_CONTACTS: ContactEntry[] = [
  { id: 'c1', name: 'Mamá', phone: '+5491145550101', speedDial: '1' },
  { id: 'c2', name: 'Carlos Vega', phone: '+5491145550142', speedDial: '2' },
  { id: 'c3', name: 'Lucía Méndez', phone: '+5491145550188', speedDial: '3' },
  { id: 'c4', name: 'Soporte Técnico', phone: '+5491145550199', speedDial: '4' },
];

export const WEATHER_CITIES: WeatherLocation[] = [
  { city: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
  { city: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { city: 'Ciudad de México', lat: 19.4326, lon: -99.1332 },
  { city: 'Bogotá', lat: 4.711, lon: -74.0721 },
  { city: 'Santiago', lat: -33.4489, lon: -70.6693 },
  { city: 'Tokio', lat: 35.6762, lon: 139.6503 },
];

export const WIDGET_CATALOG: Array<{ id: DesktopWidgetId; name: string; desc: string }> = [
  { id: 'clock', name: 'Reloj Neural HUD', desc: 'Hora tabular, fecha y telemetría OLED' },
  { id: 'calendar', name: 'Calendario del Mes', desc: 'Grilla mensual interactiva con día activo' },
  { id: 'weather', name: 'Clima Cyber-HUD', desc: 'Temperatura real, viento y pronóstico' },
  { id: 'walkman', name: 'Deck Walkman', desc: 'Control rápido de reproducción y espectro' },
  { id: 'notes', name: 'Notas Rápidas', desc: 'Recordatorios fijados en pantalla' },
  { id: 'system', name: 'Estado Hardware', desc: 'Batería, red y accesos del sistema' },
];

export const DEFAULT_MENU_ITEMS: MainMenuSlot[] = [
  { id: 'm-walkman', label: 'Walkman HUD', keyHint: '1', actionType: 'screen', targetScreen: 'walkman', iconType: 'music' },
  { id: 'm-apps', label: 'Apps Android', keyHint: '2', actionType: 'screen', targetScreen: 'apps', iconType: 'tools' },
  { id: 'm-dialer', label: 'Teléfono', keyHint: '3', actionType: 'screen', targetScreen: 'dialer', iconType: 'phone' },
  { id: 'm-messages', label: 'Mensajes T9', keyHint: '4', actionType: 'screen', targetScreen: 'messages', iconType: 'chat' },
  { id: 'm-contacts', label: 'Contactos', keyHint: '5', actionType: 'screen', targetScreen: 'contacts', iconType: 'social' },
  { id: 'm-camera', label: 'Cámara 2MP', keyHint: '6', actionType: 'screen', targetScreen: 'camera', iconType: 'camera' },
  { id: 'm-gallery', label: 'Galería', keyHint: '7', actionType: 'screen', targetScreen: 'gallery', iconType: 'social' },
  { id: 'm-game', label: 'Hyper Snake', keyHint: '8', actionType: 'screen', targetScreen: 'game', iconType: 'tools' },
  { id: 'm-radio', label: 'Radio FM', keyHint: '9', actionType: 'screen', targetScreen: 'radio', iconType: 'music' },
  { id: 'm-organizer', label: 'Calculadora', keyHint: '*', actionType: 'screen', targetScreen: 'organizer', iconType: 'tools' },
  { id: 'm-notifications', label: 'Notificaciones', keyHint: '0', actionType: 'screen', targetScreen: 'notifications', iconType: 'mail' },
  { id: 'm-settings', label: 'Centro Config', keyHint: '#', actionType: 'screen', targetScreen: 'settings', iconType: 'tools' },
];

export const DEFAULT_LAUNCHER_CONFIG: LauncherConfig = {
  version: 2,
  ownerName: 'Sony Ericsson',
  carrierText: 'WALKMAN 5G',
  githubRepo: '',
  skin: 'w800i-white',
  customBezelColor: '#D44A0F',
  customFaceColor: '#EEEDE6',
  accentColor: '#FF731D',
  wallpaper: 'walkman-wave',
  customWallpaperUrl: '',
  wallpaperDim: 65,
  lcdScanlines: true,
  soundEnabled: true,
  hapticEnabled: true,
  enabledWidgets: ['clock', 'calendar', 'weather', 'walkman'],
  widgetLayout: 'carousel',
  weatherLocation: WEATHER_CITIES[0],
  menuItems: DEFAULT_MENU_ITEMS,
  apps: DEFAULT_APPS,
  tracks: DEFAULT_TRACKS,
  contacts: DEFAULT_CONTACTS,
  quickNotes: [
    'Usa ◄ ► en Inicio para rotar Widgets HUD (Reloj, Calendario, Clima).',
    'Pulsa * en Inicio para alternar vista Carrusel o Doble Apilado.',
    'Pulsa el botón naranja W. para saltar directo al reproductor Walkman.',
  ],
};

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function buildAndroidLaunchUrl(app: AndroidAppShortcut): string {
  const android = isAndroidDevice();
  if (android && app.packageName && app.packageName.includes('.')) {
    const fallback = encodeURIComponent(app.urlScheme || `https://play.google.com/store/apps/details?id=${app.packageName}`);
    const cleanScheme = app.urlScheme.startsWith('http') ? app.urlScheme.replace(/^https?:\/\//, '') : '';
    if (app.urlScheme.startsWith('tel:') || app.urlScheme.startsWith('mailto:') || app.urlScheme.startsWith('sms:')) {
      return app.urlScheme;
    }
    return `intent://${cleanScheme}#Intent;scheme=https;package=${app.packageName};S.browser_fallback_url=${fallback};end`;
  }
  return app.urlScheme || `https://play.google.com/store/apps/details?id=${app.packageName}`;
}

export const T9_KEYPAD_MAP: Record<string, string> = {
  '1': '1.,?!',
  '2': 'abc2á',
  '3': 'def3é',
  '4': 'ghi4í',
  '5': 'jkl5',
  '6': 'mno6óñ',
  '7': 'pqrs7',
  '8': 'tuv8ú',
  '9': 'wxyz9',
  '0': ' 0',
};

function inferIconType(name: string, url: string, pkg: string): AppIconType {
  const hay = `${name} ${url} ${pkg}`.toLowerCase();
  if (hay.includes('whatsapp') || hay.includes('telegram') || hay.includes('sms') || hay.includes('chat')) return 'chat';
  if (hay.includes('spotify') || hay.includes('music') || hay.includes('walkman') || hay.includes('audio')) return 'music';
  if (hay.includes('map') || hay.includes('waze') || hay.includes('gps')) return 'map';
  if (hay.includes('youtube') || hay.includes('video') || hay.includes('netflix') || hay.includes('twitch')) return 'video';
  if (hay.includes('mail') || hay.includes('gmail') || hay.includes('outlook')) return 'mail';
  if (hay.includes('cam') || hay.includes('photo')) return 'camera';
  if (hay.includes('tel') || hay.includes('phone') || hay.includes('call')) return 'phone';
  if (hay.includes('insta') || hay.includes('tiktok') || hay.includes('facebook') || hay.includes('x.com')) return 'social';
  if (hay.includes('chrome') || hay.includes('browser') || hay.includes('web')) return 'browser';
  return 'globe';
}

export function parseExternalConfig(rawText: string): {
  patch: Partial<LauncherConfig>;
  detectedItems: string[];
  error?: string;
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { patch: {}, detectedItems: [], error: 'Pega un JSON o fragmento de configuración para analizar.' };
  }

  const detectedItems: string[] = [];
  const patch: Partial<LauncherConfig> = {};

  // Attempt 1: Direct JSON or embedded JSON object extraction
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }
  }

  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.ownerName === 'string') {
      patch.ownerName = parsed.ownerName.slice(0, 22);
      detectedItems.push(`Nombre del dispositivo: "${patch.ownerName}"`);
    } else if (typeof parsed.name === 'string') {
      patch.ownerName = parsed.name.slice(0, 22);
      detectedItems.push(`Nombre: "${patch.ownerName}"`);
    }

    if (typeof parsed.carrierText === 'string') {
      patch.carrierText = parsed.carrierText.slice(0, 18);
      detectedItems.push(`Operadora: "${patch.carrierText}"`);
    } else if (typeof parsed.carrier === 'string') {
      patch.carrierText = parsed.carrier.slice(0, 18);
      detectedItems.push(`Operadora: "${patch.carrierText}"`);
    }

    if (typeof parsed.githubRepo === 'string' && parsed.githubRepo.trim()) {
      patch.githubRepo = parsed.githubRepo.trim().slice(0, 120);
      detectedItems.push(`Repo GitHub: "${patch.githubRepo}"`);
    }

    const validSkins: ChassisSkin[] = ['w800i-white', 'w810i-black', 'w580i-silver', 'custom'];
    if (typeof parsed.skin === 'string' && validSkins.includes(parsed.skin as ChassisSkin)) {
      patch.skin = parsed.skin as ChassisSkin;
      detectedItems.push(`Carcasa: ${patch.skin}`);
    }

    if (typeof parsed.accentColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(parsed.accentColor)) {
      patch.accentColor = parsed.accentColor;
      detectedItems.push(`Color HUD: ${patch.accentColor}`);
    }

    const validWalls: WallpaperStyle[] = ['walkman-wave', 'orange-pulse', 'pearl-minimal', 'midnight-grid'];
    if (typeof parsed.wallpaper === 'string' && validWalls.includes(parsed.wallpaper as WallpaperStyle)) {
      patch.wallpaper = parsed.wallpaper as WallpaperStyle;
      detectedItems.push(`Fondo de pantalla: ${patch.wallpaper}`);
    }

    if (typeof parsed.customWallpaperUrl === 'string') patch.customWallpaperUrl = parsed.customWallpaperUrl;
    if (typeof parsed.wallpaperDim === 'number') patch.wallpaperDim = Math.max(0, Math.min(90, parsed.wallpaperDim));
    if (typeof parsed.soundEnabled === 'boolean') patch.soundEnabled = parsed.soundEnabled;
    if (typeof parsed.hapticEnabled === 'boolean') patch.hapticEnabled = parsed.hapticEnabled;
    if (typeof parsed.lcdScanlines === 'boolean') patch.lcdScanlines = parsed.lcdScanlines;

    if (Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0) {
      const normalizedMenu: MainMenuSlot[] = parsed.menuItems
        .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
        .slice(0, 12)
        .map((m, idx) => ({
          id: String(m.id || `imp-menu-${idx}`),
          label: String(m.label || `Slot ${idx + 1}`).slice(0, 18),
          keyHint: String(m.keyHint || DEFAULT_MENU_ITEMS[idx]?.keyHint || String(idx + 1)),
          actionType: m.actionType === 'app' ? 'app' : 'screen',
          targetScreen: (m.targetScreen as ScreenId) || 'apps',
          packageName: typeof m.packageName === 'string' ? m.packageName : undefined,
          urlScheme: typeof m.urlScheme === 'string' ? m.urlScheme : undefined,
          iconType: (m.iconType as AppIconType) || 'tools',
          iconDataUrl: typeof m.iconDataUrl === 'string' ? m.iconDataUrl : undefined,
        }));
      if (normalizedMenu.length > 0) {
        patch.menuItems = normalizedMenu;
        detectedItems.push(`${normalizedMenu.length} iconos del menú principal`);
      }
    }

    const rawApps = (parsed.apps || parsed.shortcuts || parsed.links || parsed.items) as unknown;
    if (Array.isArray(rawApps) && rawApps.length > 0) {
      const normalizedApps: AndroidAppShortcut[] = rawApps
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item, idx) => {
          const name = String(item.name || item.title || item.label || `App ${idx + 1}`).slice(0, 20);
          const packageName = String(item.packageName || item.package || item.bundleId || '');
          const urlScheme = String(item.urlScheme || item.url || item.href || item.intent || (packageName ? `https://play.google.com/store/apps/details?id=${packageName}` : 'https://www.google.com/'));
          const category = String(item.category || 'Importada').slice(0, 18);
          const quickKey = item.quickKey ? String(item.quickKey).slice(0, 1) : idx < 9 ? String(idx + 1) : undefined;
          return {
            id: String(item.id || `imp-app-${Date.now()}-${idx}`),
            name,
            packageName,
            urlScheme,
            category,
            quickKey,
            iconType: (item.iconType as AppIconType) || inferIconType(name, urlScheme, packageName),
            iconDataUrl: typeof item.iconDataUrl === 'string' ? item.iconDataUrl : undefined,
          };
        });
      if (normalizedApps.length > 0) {
        patch.apps = normalizedApps;
        detectedItems.push(`${normalizedApps.length} accesos directos de apps`);
      }
    }

    if (Array.isArray(parsed.contacts) && parsed.contacts.length > 0) {
      const contacts: ContactEntry[] = parsed.contacts
        .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
        .map((c, idx) => ({
          id: String(c.id || `imp-c-${Date.now()}-${idx}`),
          name: String(c.name || `Contacto ${idx + 1}`),
          phone: String(c.phone || c.tel || c.number || ''),
          speedDial: c.speedDial ? String(c.speedDial) : undefined,
        }))
        .filter((c) => c.phone.length > 0);
      if (contacts.length > 0) {
        patch.contacts = contacts;
        detectedItems.push(`${contacts.length} contactos`);
      }
    }

    if (Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
      const tracks: WalkmanTrack[] = parsed.tracks
        .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
        .map((t, idx) => ({
          id: String(t.id || `imp-t-${Date.now()}-${idx}`),
          artist: String(t.artist || 'Artista'),
          album: String(t.album || 'Walkman'),
          title: String(t.title || `Pista ${idx + 1}`),
          durationSec: Number(t.durationSec) || 180,
          bpm: Number(t.bpm) || 115,
          baseFreq: Number(t.baseFreq) || 329.63,
          customUrl: typeof t.customUrl === 'string' ? t.customUrl : undefined,
        }));
      if (tracks.length > 0) {
        patch.tracks = tracks;
        detectedItems.push(`${tracks.length} pistas Walkman`);
      }
    }

    if (Array.isArray(parsed.quickNotes)) {
      patch.quickNotes = parsed.quickNotes.map((n) => String(n));
      detectedItems.push(`${patch.quickNotes.length} notas rápidas`);
    }
  }

  // Attempt 2: Smart extraction from JS/TS code, Android package IDs, or URLs pasted from another AI Studio app
  if (detectedItems.length === 0) {
    const extractedApps: AndroidAppShortcut[] = [];
    const pkgMatches = Array.from(trimmed.matchAll(/\b(com|org|net|io)\.[a-z0-9_]+(?:\.[a-z0-9_]+)+\b/gi));
    const seenPkgs = new Set<string>();
    pkgMatches.forEach((m, idx) => {
      const pkg = m[0];
      if (!seenPkgs.has(pkg) && !pkg.endsWith('.ts') && !pkg.endsWith('.tsx') && !pkg.endsWith('.json')) {
        seenPkgs.add(pkg);
        const parts = pkg.split('.');
        const rawName = parts[parts.length - 1];
        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        extractedApps.push({
          id: `ext-pkg-${Date.now()}-${idx}`,
          name: name.slice(0, 18),
          packageName: pkg,
          urlScheme: `https://play.google.com/store/apps/details?id=${pkg}`,
          category: 'Paquete Android',
          quickKey: extractedApps.length < 9 ? String(extractedApps.length + 1) : undefined,
          iconType: inferIconType(name, '', pkg),
        });
      }
    });

    const urlMatches = Array.from(trimmed.matchAll(/https?:\/\/[^\s"'`<>)]+/gi));
    const seenUrls = new Set<string>();
    urlMatches.forEach((m, idx) => {
      const url = m[0];
      if (!seenUrls.has(url) && extractedApps.length < 16) {
        seenUrls.add(url);
        try {
          const host = new URL(url).hostname.replace(/^www\./, '');
          const label = host.split('.')[0];
          const name = label.charAt(0).toUpperCase() + label.slice(1);
          extractedApps.push({
            id: `ext-url-${Date.now()}-${idx}`,
            name: name.slice(0, 18),
            packageName: '',
            urlScheme: url,
            category: 'Enlace Detectado',
            quickKey: extractedApps.length < 9 ? String(extractedApps.length + 1) : undefined,
            iconType: inferIconType(name, url, ''),
          });
        } catch {
          // ignore malformed url
        }
      }
    });

    if (extractedApps.length > 0) {
      patch.apps = extractedApps;
      detectedItems.push(`${extractedApps.length} enlaces / paquetes Android extraídos del código`);
    }
  }

  if (detectedItems.length === 0) {
    return {
      patch: {},
      detectedItems: [],
      error: 'No se reconocieron claves JSON, URLs ni paquetes Android (ej. com.whatsapp) en el texto pegado.',
    };
  }

  patch.importedSource = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return { patch, detectedItems };
}
