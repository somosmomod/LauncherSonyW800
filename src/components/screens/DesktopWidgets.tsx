import React, { useCallback, useEffect, useState } from 'react';
import {
  BatteryCharging,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Cpu,
  FileText,
  Headphones,
  LayoutGrid,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Sun,
  Wind,
} from 'lucide-react';
import {
  DesktopWidgetId,
  LauncherConfig,
  ScreenId,
  WalkmanTrack,
  WidgetLayoutMode,
} from '../../types/launcher';

interface WeatherData {
  temp: number;
  humidity: number;
  wind: number;
  code: number;
  min: number;
  max: number;
  updatedAt: string;
}

function describeWeatherCode(code: number): { label: string; kind: 'sun' | 'partly' | 'cloud' | 'rain' | 'storm' } {
  if (code === 0) return { label: 'Despejado', kind: 'sun' };
  if (code <= 3) return { label: 'Nublado parcial', kind: 'partly' };
  if (code <= 48) return { label: 'Niebla / Bruma', kind: 'cloud' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Lluvia', kind: 'rain' };
  if (code >= 95) return { label: 'Tormenta', kind: 'storm' };
  return { label: 'Variable', kind: 'cloud' };
}

function WeatherGlyph({ kind, className }: { kind: 'sun' | 'partly' | 'cloud' | 'rain' | 'storm'; className?: string }) {
  switch (kind) {
    case 'sun':
      return <Sun className={className} />;
    case 'partly':
      return <CloudSun className={className} />;
    case 'rain':
      return <CloudRain className={className} />;
    case 'storm':
      return <CloudLightning className={className} />;
    default:
      return <Cloud className={className} />;
  }
}

interface DesktopWidgetHostProps {
  config: LauncherConfig;
  now: Date;
  activeWidgetIndex: number;
  onChangeWidgetIndex: (next: number) => void;
  onToggleLayoutMode: (mode: WidgetLayoutMode) => void;
  currentTrack: WalkmanTrack;
  isPlaying: boolean;
  trackElapsed: number;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onNavigate: (s: ScreenId) => void;
}

export const DesktopWidgetHost: React.FC<DesktopWidgetHostProps> = ({
  config,
  now,
  activeWidgetIndex,
  onChangeWidgetIndex,
  onToggleLayoutMode,
  currentTrack,
  isPlaying,
  trackElapsed,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  onNavigate,
}) => {
  const enabled: DesktopWidgetId[] =
    config.enabledWidgets && config.enabledWidgets.length > 0 ? config.enabledWidgets : ['clock', 'calendar', 'weather'];
  const safeIdx = ((activeWidgetIndex % enabled.length) + enabled.length) % enabled.length;
  const activeId = enabled[safeIdx];
  const secondaryId = enabled[(safeIdx + 1) % enabled.length];

  // Track lateral transition direction when switching widgets
  const prevIdxRef = React.useRef(safeIdx);
  const [widgetAnimDir, setWidgetAnimDir] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const prev = prevIdxRef.current;
    if (prev !== safeIdx) {
      const len = enabled.length;
      const movedForward = (prev + 1) % len === safeIdx || (safeIdx > prev && !(prev === 0 && safeIdx === len - 1));
      setWidgetAnimDir(movedForward ? 'right' : 'left');
      prevIdxRef.current = safeIdx;
    }
  }, [safeIdx, enabled.length]);

  // Calendar interactive month offset & selected day
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Live Weather state via Open-Meteo
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Notes index
  const [noteIdx, setNoteIdx] = useState(0);

  // Battery telemetry
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState(false);

  const fetchWeather = useCallback(async () => {
    const { lat, lon } = config.weatherLocation || { lat: -34.6037, lon: -58.3816 };
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP');
      const data = await res.json();
      setWeather({
        temp: Math.round(data.current?.temperature_2m ?? 22),
        humidity: Math.round(data.current?.relative_humidity_2m ?? 50),
        wind: Math.round(data.current?.wind_speed_10m ?? 12),
        code: Number(data.current?.weather_code ?? 0),
        max: Math.round(data.daily?.temperature_2m_max?.[0] ?? 25),
        min: Math.round(data.daily?.temperature_2m_min?.[0] ?? 15),
        updatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      setWeatherError('Sin conexión');
    } finally {
      setWeatherLoading(false);
    }
  }, [config.weatherLocation]);

  useEffect(() => {
    if (enabled.includes('weather')) {
      fetchWeather();
    }
  }, [fetchWeather, enabled]);

  useEffect(() => {
    const nav = navigator as unknown as {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (ev: string, fn: () => void) => void;
      }>;
    };
    if (!nav.getBattery) return;
    nav
      .getBattery()
      .then((bat) => {
        const sync = () => {
          setBatteryPct(Math.round(bat.level * 100));
          setBatteryCharging(bat.charging);
        };
        sync();
        bat.addEventListener('levelchange', sync);
        bat.addEventListener('chargingchange', sync);
      })
      .catch(() => {});
  }, []);

  const renderWidget = (id: DesktopWidgetId, compact: boolean) => {
    // 1. CLOCK HUD WIDGET
    if (id === 'clock') {
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
      return (
        <div
          className={`relative rounded-xl border border-[#FF731D]/40 bg-[#080B13]/85 backdrop-blur-sm overflow-hidden flex flex-col justify-between ${
            compact ? 'p-2' : 'p-3 h-full'
          }`}
        >
          {/* Futuristic HUD corner accents */}
          <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#FF8C38] rounded-tl-xl" />
          <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-sky-400 rounded-br-xl" />

          <div className="flex items-center justify-between text-[8px] font-mono text-sky-300/85">
            <span>HUD.TIME</span>
            <span className="text-[#FF8C38]">{config.ownerName}</span>
          </div>

          <div className="text-center my-auto py-0.5">
            <div
              className={`font-mono font-bold tracking-tight tabular-nums text-white leading-none ${
                compact ? 'text-[22px]' : 'text-[34px]'
              }`}
            >
              {timeStr}
            </div>
            <div className="mt-1 text-[9px] font-mono capitalize text-white/75">{dateStr}</div>
          </div>

          {!compact && (
            <div className="flex items-center justify-between text-[8px] font-mono text-white/55 border-t border-white/10 pt-1">
              <span>OLED MATRIX</span>
              <span className="text-emerald-400">SYNC OK</span>
            </div>
          )}
        </div>
      );
    }

    // 2. MONTHLY CALENDAR WIDGET
    if (id === 'calendar') {
      const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const monthName = viewDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // Monday-first offset (0=Mon .. 6=Sun)
      const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
      const todayNum = now.getDate();

      const cells: Array<number | null> = [
        ...Array.from({ length: firstDayOffset }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ];

      return (
        <div
          className={`relative rounded-xl border border-sky-400/35 bg-[#070A12]/90 backdrop-blur-sm flex flex-col justify-between ${
            compact ? 'p-1.5' : 'p-2.5 h-full'
          }`}
        >
          <div className="flex items-center justify-between text-[8.5px] font-mono pb-1 border-b border-white/10">
            <span className="flex items-center gap-1 text-[#FF8C38] font-bold">
              <CalendarIcon className="w-2.5 h-2.5" />
              {monthName}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setMonthOffset((m) => m - 1);
                  setSelectedDay(null);
                }}
                aria-label="Mes anterior"
                className="p-0.5 rounded bg-white/10 hover:bg-[#FF731D] text-white cursor-pointer"
              >
                <ChevronLeft className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMonthOffset((m) => m + 1);
                  setSelectedDay(null);
                }}
                aria-label="Mes siguiente"
                className="p-0.5 rounded bg-white/10 hover:bg-[#FF731D] text-white cursor-pointer"
              >
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-[2px] text-center text-[7px] font-mono text-sky-300/80 mt-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-[2px] mt-0.5 flex-1 items-center">
            {cells.slice(0, compact ? 28 : 42).map((day, idx) => {
              if (!day) return <span key={`e-${idx}`} />;
              const isToday = isCurrentMonth && day === todayNum;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`h-[14px] rounded-[3px] text-[8px] font-mono tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                    isToday
                      ? 'bg-[#FF731D] text-white font-bold shadow-[0_0_8px_rgba(255,115,29,0.75)]'
                      : isSelected
                      ? 'bg-sky-500/40 border border-sky-400 text-white font-bold'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {!compact && (
            <div className="mt-1 flex items-center justify-between text-[7.5px] font-mono text-white/55">
              <span>
                {selectedDay
                  ? `Día ${selectedDay} seleccionado`
                  : `Hoy: ${now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
              </span>
              {monthOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMonthOffset(0);
                    setSelectedDay(null);
                  }}
                  className="text-[#FF8C38] hover:underline cursor-pointer"
                >
                  Hoy
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    // 3. LIVE WEATHER CYBER-HUD WIDGET
    if (id === 'weather') {
      const info = describeWeatherCode(weather?.code ?? 0);
      return (
        <div
          className={`relative rounded-xl border border-sky-400/40 bg-gradient-to-br from-[#070B14]/95 to-[#120B08]/95 backdrop-blur-sm flex flex-col justify-between ${
            compact ? 'p-2' : 'p-3 h-full'
          }`}
        >
          <div className="flex items-center justify-between text-[8px] font-mono">
            <span className="text-sky-300 font-bold truncate max-w-[120px]">
              METEO · {config.weatherLocation.city.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={fetchWeather}
              aria-label="Actualizar clima"
              className="text-white/60 hover:text-[#FF8C38] cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${weatherLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {weather ? (
            <div className="my-auto flex items-center justify-between gap-2 py-1">
              <div>
                <div
                  className={`font-mono font-bold tabular-nums text-white leading-none ${
                    compact ? 'text-[22px]' : 'text-[30px]'
                  }`}
                >
                  {weather.temp}°C
                </div>
                <div className="mt-1 text-[9px] font-semibold text-[#FF8C38]">{info.label}</div>
              </div>
              <div className="flex flex-col items-end text-right">
                <WeatherGlyph kind={info.kind} className="w-7 h-7 text-sky-300" />
                <span className="mt-1 text-[8px] font-mono text-white/70">
                  {weather.min}° / {weather.max}°
                </span>
              </div>
            </div>
          ) : (
            <div className="my-auto text-center py-2">
              <p className="text-[9.5px] font-mono text-white/70">
                {weatherLoading ? 'Sincronizando satélite...' : weatherError || 'Cargando clima...'}
              </p>
            </div>
          )}

          {!compact && weather && (
            <div className="flex items-center justify-between text-[8px] font-mono text-white/65 border-t border-white/10 pt-1.5">
              <span className="flex items-center gap-1">
                <Wind className="w-2.5 h-2.5 text-sky-300" />
                {weather.wind} km/h
              </span>
              <span>HUM {weather.humidity}%</span>
              <span className="text-white/45">{weather.updatedAt}</span>
            </div>
          )}
        </div>
      );
    }

    // 4. WALKMAN MINI DECK WIDGET
    if (id === 'walkman') {
      const pct = Math.min(100, (trackElapsed / Math.max(1, currentTrack.durationSec)) * 100);
      return (
        <div
          className={`relative rounded-xl border border-[#FF731D]/45 bg-gradient-to-br from-[#140A05]/95 to-[#070910]/95 flex flex-col justify-between ${
            compact ? 'p-2' : 'p-3 h-full'
          }`}
        >
          <div className="flex items-center justify-between text-[8px] font-mono">
            <span className="text-[#FF8C38] font-bold flex items-center gap-1">
              <Headphones className="w-2.5 h-2.5" /> WALKMAN DECK
            </span>
            <button
              type="button"
              onClick={() => onNavigate('walkman')}
              className="text-sky-300 hover:underline cursor-pointer"
            >
              FULL HUD
            </button>
          </div>

          <div className="my-auto py-1">
            <div className="text-[11px] font-bold text-white truncate">{currentTrack.title}</div>
            <div className="text-[9px] text-white/70 truncate">
              {currentTrack.artist} · {currentTrack.album}
            </div>
            <div className="mt-2 h-1 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6A00] to-sky-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onPrevTrack}
              aria-label="Anterior"
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              className="p-1.5 rounded-full bg-[#FF731D] text-white shadow-[0_0_10px_rgba(255,115,29,0.65)] cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            </button>
            <button
              type="button"
              onClick={onNextTrack}
              aria-label="Siguiente"
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    // 5. NOTES WIDGET
    if (id === 'notes') {
      const notes = config.quickNotes.length > 0 ? config.quickNotes : ['Sin notas rápidas'];
      const safeNote = notes[noteIdx % notes.length];
      return (
        <div
          className={`relative rounded-xl border border-white/20 bg-[#080B13]/90 flex flex-col justify-between ${
            compact ? 'p-2' : 'p-3 h-full'
          }`}
        >
          <div className="flex items-center justify-between text-[8px] font-mono text-[#FF8C38]">
            <span className="flex items-center gap-1 font-bold">
              <FileText className="w-2.5 h-2.5" /> NOTA {(noteIdx % notes.length) + 1}/{notes.length}
            </span>
            <button
              type="button"
              onClick={() => setNoteIdx((i) => (i + 1) % notes.length)}
              className="text-sky-300 hover:underline cursor-pointer"
            >
              Siguiente
            </button>
          </div>
          <p className="my-auto text-[9.5px] leading-snug text-white/90 line-clamp-3 py-1">{safeNote}</p>
          {!compact && (
            <button
              type="button"
              onClick={() => onNavigate('organizer')}
              className="text-left text-[8px] font-mono text-white/55 hover:text-white cursor-pointer"
            >
              Abrir Organizador →
            </button>
          )}
        </div>
      );
    }

    // 6. SYSTEM HARDWARE WIDGET
    return (
      <div
        className={`relative rounded-xl border border-emerald-400/35 bg-[#070B12]/90 flex flex-col justify-between ${
          compact ? 'p-2' : 'p-3 h-full'
        }`}
      >
        <div className="flex items-center justify-between text-[8px] font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5" /> TELEMETRÍA
          </span>
          <span className="text-white/60">{navigator.onLine ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        <div className="my-auto grid grid-cols-2 gap-1.5 py-1 text-[9px] font-mono">
          <div className="rounded-lg bg-white/[0.05] p-1.5 border border-white/10">
            <div className="text-[7.5px] text-white/55">BATERÍA</div>
            <div className="text-white font-bold flex items-center gap-1 mt-0.5">
              <BatteryCharging className="w-3 h-3 text-emerald-400" />
              {batteryPct !== null ? `${batteryPct}%` : '94%'}
              {batteryCharging ? '+' : ''}
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.05] p-1.5 border border-white/10">
            <div className="text-[7.5px] text-white/55">APPS</div>
            <div className="text-[#FF8C38] font-bold mt-0.5">{config.apps.length} LISTAS</div>
          </div>
        </div>

        {!compact && (
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="text-left text-[8px] font-mono text-sky-300 hover:underline cursor-pointer"
          >
            Centro de Configuración →
          </button>
        )}
      </div>
    );
  };

  const widgetLabels: Record<DesktopWidgetId, string> = {
    clock: 'RELOJ',
    calendar: 'CALENDARIO',
    weather: 'CLIMA',
    walkman: 'WALKMAN',
    notes: 'NOTAS',
    system: 'SISTEMA',
  };

  return (
    <div className="relative z-10 flex-1 flex flex-col min-h-0 my-1.5">
      {/* Compact Widget HUD Switcher Header */}
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeWidgetIndex((safeIdx - 1 + enabled.length) % enabled.length)}
            aria-label="Widget anterior"
            className="p-0.5 rounded bg-white/10 hover:bg-[#FF731D] text-white/80 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[8px] font-mono font-bold tracking-wider text-sky-300">
            {widgetLabels[activeId]} · {safeIdx + 1}/{enabled.length}
          </span>
          <button
            type="button"
            onClick={() => onChangeWidgetIndex((safeIdx + 1) % enabled.length)}
            aria-label="Siguiente widget"
            className="p-0.5 rounded bg-white/10 hover:bg-[#FF731D] text-white/80 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Pagination dots */}
          <div className="flex items-center gap-1 mr-1">
            {enabled.map((w, idx) => (
              <button
                key={w}
                type="button"
                onClick={() => onChangeWidgetIndex(idx)}
                aria-label={`Ver widget ${w}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === safeIdx ? 'w-3 bg-[#FF731D]' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onToggleLayoutMode(config.widgetLayout === 'carousel' ? 'stacked' : 'carousel')
            }
            aria-label="Cambiar diseño de widgets"
            title={config.widgetLayout === 'carousel' ? 'Ver 2 widgets apilados' : 'Ver 1 widget grande'}
            className="p-0.5 rounded bg-white/10 hover:bg-[#FF731D] text-white/80 hover:text-white cursor-pointer"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Widget Viewport (Carousel or Stacked 2-Widget Mode with Lateral Slide) */}
      {config.widgetLayout === 'stacked' && enabled.length > 1 ? (
        <div
          key={`stacked-${safeIdx}`}
          className={`flex-1 grid grid-rows-2 gap-1.5 min-h-0 ${
            widgetAnimDir === 'right'
              ? 'w800-widget-in-right'
              : widgetAnimDir === 'left'
              ? 'w800-widget-in-left'
              : ''
          }`}
        >
          {renderWidget(activeId, true)}
          {renderWidget(secondaryId, true)}
        </div>
      ) : (
        <div
          key={`single-${activeId}-${safeIdx}`}
          className={`flex-1 min-h-0 ${
            widgetAnimDir === 'right'
              ? 'w800-widget-in-right'
              : widgetAnimDir === 'left'
              ? 'w800-widget-in-left'
              : ''
          }`}
        >
          {renderWidget(activeId, false)}
        </div>
      )}
    </div>
  );
};
