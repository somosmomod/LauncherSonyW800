import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Globe, Grid, Headphones, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ChassisSkin } from '../types/launcher';

export type HardwareKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'center'
  | 'leftSoft'
  | 'rightSoft'
  | 'back'
  | 'clear'
  | 'walkman'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '*'
  | '#';

interface W800iPhoneProps {
  skin: ChassisSkin;
  customBezelColor?: string;
  customFaceColor?: string;
  ownerName: string;
  activeKey: HardwareKey | null;
  hasUnreadNotifications?: boolean;
  onPressKey: (key: HardwareKey) => void;
  onSideVolume?: (dir: 'up' | 'down') => void;
  onOpenStudio?: () => void;
  children: React.ReactNode;
}

const KEYPAD_KEYS: Array<{ key: HardwareKey; main: string; sub: string }> = [
  { key: '1', main: '1', sub: '.,?!' },
  { key: '2', main: '2', sub: 'ABC' },
  { key: '3', main: '3', sub: 'DEF' },
  { key: '4', main: '4', sub: 'GHI' },
  { key: '5', main: '5', sub: 'JKL' },
  { key: '6', main: '6', sub: 'MNO' },
  { key: '7', main: '7', sub: 'PQRS' },
  { key: '8', main: '8', sub: 'TUV' },
  { key: '9', main: '9', sub: 'WXYZ' },
  { key: '*', main: '*', sub: 'a/A' },
  { key: '0', main: '0', sub: '+' },
  { key: '#', main: '#', sub: '␣' },
];

function isHexDark(hex?: string): boolean {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma < 128;
}

export const W800iPhone: React.FC<W800iPhoneProps> = ({
  skin,
  customBezelColor,
  customFaceColor,
  ownerName,
  activeKey,
  hasUnreadNotifications = false,
  onPressKey,
  onSideVolume,
  onOpenStudio,
  children,
}) => {
  const isCustom = skin === 'custom';
  const isBlack = skin === 'w810i-black' || (isCustom && isHexDark(customFaceColor));
  const isSilver = skin === 'w580i-silver';

  const outerBezelClass = isCustom
    ? 'lg:shadow-2xl'
    : isBlack
    ? 'lg:w800-obsidian-bezel'
    : isSilver
    ? 'lg:w800-silver-bezel'
    : 'lg:w800-terracotta-bezel';

  const facePlateClass = isCustom
    ? isBlack
      ? 'text-white lg:border-white/25'
      : 'text-[#1D2026] lg:border-white/85'
    : isBlack
    ? 'w800-ceramic-obsidian text-white lg:border-[#383B45]'
    : isSilver
    ? 'w800-ceramic-silver text-[#1D2026] lg:border-white/80'
    : 'w800-ceramic-pearl text-[#22242A] lg:border-white/95';

  const keyBtnClass = isBlack
    ? 'w800-dark-key-tactile text-white border border-[#454A57]'
    : isSilver
    ? 'w800-key-tactile text-[#1D2026] border border-[#C3C9D4]'
    : 'w800-key-tactile text-[#1F2127] border border-[#CFCBC0]';

  const keySubColor = isBlack ? 'text-[#A2A8B5]' : 'text-[#6A6E78]';

  // Interactive 5-way draggable joystick state & refs
  type JoyDir = 'up' | 'down' | 'left' | 'right';
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const [dragDir, setDragDir] = useState<JoyDir | null>(null);

  const stickPadRef = useRef<HTMLDivElement | null>(null);
  const onPressKeyRef = useRef(onPressKey);
  onPressKeyRef.current = onPressKey;

  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    hasDragged: boolean;
    lastDir: JoyDir | null;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    hasDragged: false,
    lastDir: null,
  });

  const repeatDelayRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const tapNudgeTimeoutRef = useRef<number | null>(null);

  const clearRepeatTimers = useCallback(() => {
    if (repeatDelayRef.current !== null) {
      window.clearTimeout(repeatDelayRef.current);
      repeatDelayRef.current = null;
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRepeatTimers();
      if (tapNudgeTimeoutRef.current !== null) {
        window.clearTimeout(tapNudgeTimeoutRef.current);
      }
    };
  }, [clearRepeatTimers]);

  const startDirectionHold = useCallback(
    (dir: JoyDir) => {
      clearRepeatTimers();
      onPressKeyRef.current(dir);
      repeatDelayRef.current = window.setTimeout(() => {
        repeatIntervalRef.current = window.setInterval(() => {
          onPressKeyRef.current(dir);
        }, 145);
      }, 280);
    },
    [clearRepeatTimers]
  );

  const clampToEllipticalPocket = (dx: number, dy: number) => {
    const maxX = 16;
    const maxY = 11;
    const norm = Math.hypot(dx / maxX, dy / maxY);
    if (norm > 1) {
      return { x: dx / norm, y: dy / norm };
    }
    return { x: dx, y: dy };
  };

  const resolveDirection = (dx: number, dy: number, currentDir: JoyDir | null): JoyDir | null => {
    const dist = Math.hypot(dx, dy);
    const engageThreshold = currentDir ? 5 : 7;
    if (dist < engageThreshold) return null;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? 'right' : 'left';
    }
    return dy >= 0 ? 'down' : 'up';
  };

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (tapNudgeTimeoutRef.current !== null) {
      window.clearTimeout(tapNudgeTimeoutRef.current);
      tapNudgeTimeoutRef.current = null;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback safely if pointer capture is unavailable
    }

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      hasDragged: false,
      lastDir: null,
    };
    setIsDraggingStick(true);
    setDragDir(null);
    setStickOffset({ x: 0, y: 0 });
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (drag.pointerId !== e.pointerId) return;

    const rawDx = e.clientX - drag.startX;
    const rawDy = e.clientY - drag.startY;
    const dist = Math.hypot(rawDx, rawDy);

    if (dist >= 5) {
      drag.hasDragged = true;
    }

    const clamped = clampToEllipticalPocket(rawDx, rawDy);
    setStickOffset(clamped);

    const nextDir = resolveDirection(rawDx, rawDy, drag.lastDir);
    if (nextDir !== drag.lastDir) {
      drag.lastDir = nextDir;
      setDragDir(nextDir);
      if (nextDir) {
        startDirectionHold(nextDir);
      } else {
        clearRepeatTimers();
      }
    }
  };

  const releaseStick = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragStateRef.current;
    if (drag.pointerId !== e.pointerId) return;

    clearRepeatTimers();

    const wasTap = !cancelled && !drag.hasDragged;
    dragStateRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      hasDragged: false,
      lastDir: null,
    };

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    setIsDraggingStick(false);
    setDragDir(null);

    if (wasTap && stickPadRef.current) {
      const rect = stickPadRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const tapDx = e.clientX - cx;
      const tapDy = e.clientY - cy;

      if (Math.hypot(tapDx, tapDy) <= 16) {
        setStickOffset({ x: 0, y: 0 });
        onPressKeyRef.current('center');
      } else {
        const tapDir: JoyDir =
          Math.abs(tapDx) >= Math.abs(tapDy)
            ? tapDx >= 0
              ? 'right'
              : 'left'
            : tapDy >= 0
            ? 'down'
            : 'up';
        const nudge =
          tapDir === 'left'
            ? { x: -8, y: 0 }
            : tapDir === 'right'
            ? { x: 8, y: 0 }
            : tapDir === 'up'
            ? { x: 0, y: -6 }
            : { x: 0, y: 6 };
        setStickOffset(nudge);
        onPressKeyRef.current(tapDir);
        tapNudgeTimeoutRef.current = window.setTimeout(() => {
          setStickOffset({ x: 0, y: 0 });
        }, 120);
      }
    } else {
      setStickOffset({ x: 0, y: 0 });
    }
  };

  // Visual tilt for both pointer dragging and keyboard arrows
  const activeDirection: JoyDir | null =
    dragDir ??
    (activeKey === 'up' || activeKey === 'down' || activeKey === 'left' || activeKey === 'right'
      ? activeKey
      : null);

  const renderedStickOffset = isDraggingStick
    ? stickOffset
    : stickOffset.x !== 0 || stickOffset.y !== 0
    ? stickOffset
    : activeKey === 'left'
    ? { x: -6, y: 0 }
    : activeKey === 'right'
    ? { x: 6, y: 0 }
    : activeKey === 'up'
    ? { x: 0, y: -5 }
    : activeKey === 'down'
    ? { x: 0, y: 5 }
    : { x: 0, y: 0 };

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden lg:h-auto lg:max-h-none lg:overflow-visible lg:max-w-[346px] lg:mx-auto flex flex-col select-none">
      {/* Side Hardware Details (visible on desktop studio view) */}
      <div
        className="hidden lg:flex flex-col items-end justify-between absolute -left-[5px] top-[158px] h-28 w-[6px]"
        aria-hidden="true"
      >
        <div className="w-full h-16 rounded-l-md bg-gradient-to-r from-[#A53306] to-[#E25A1E] border-y border-l border-[#7A2202] shadow-sm" />
        <div className="w-[4px] h-7 rounded-l-sm bg-gradient-to-r from-[#9EA4B0] to-[#DCE0E8] border border-black/20" />
      </div>

      <div className="hidden lg:flex flex-col items-start absolute -right-[6px] top-[84px] gap-28">
        <div className="flex flex-col rounded-r-lg overflow-hidden border border-[#8E2B04] shadow-md bg-gradient-to-b from-[#FF7B33] to-[#C8420C]">
          <button
            type="button"
            onClick={() => (onSideVolume ? onSideVolume('up') : onPressKey('up'))}
            aria-label="Subir volumen"
            title="Subir brillo / arriba"
            className="w-[7px] h-8 hover:bg-white/20 active:bg-black/20 cursor-pointer"
          />
          <div className="h-[1px] bg-black/25" />
          <button
            type="button"
            onClick={() => (onSideVolume ? onSideVolume('down') : onPressKey('down'))}
            aria-label="Bajar volumen"
            title="Bajar brillo / abajo"
            className="w-[7px] h-8 hover:bg-white/20 active:bg-black/20 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => onPressKey('center')}
          aria-label="Botón lateral obturador"
          title="Obturador / Seleccionar"
          className="w-[7px] h-11 rounded-r-md bg-gradient-to-b from-[#E5E8EE] via-[#B4BAC6] to-[#878E9C] border border-[#6E7482] shadow-md hover:brightness-110 active:translate-x-[-1px] cursor-pointer"
        />
      </div>

      {/* Outer Shell: Edge-to-edge borderless on mobile, 3D sculpted W800i chassis on desktop */}
      <div
        style={isCustom && customBezelColor ? { background: customBezelColor } : undefined}
        className={`relative flex-1 min-h-0 flex flex-col overflow-hidden lg:overflow-visible lg:flex-none lg:block rounded-none p-0 lg:rounded-[38px] lg:p-[7px] ${outerBezelClass}`}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden lg:overflow-visible lg:flex-none lg:block rounded-none p-0 lg:rounded-[32px] lg:p-[1.5px] lg:w800-chrome-rim">
          <div
            style={isCustom && customFaceColor ? { background: customFaceColor } : undefined}
            className={`relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden lg:flex-none lg:overflow-visible rounded-none border-0 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] lg:rounded-[31px] lg:border lg:px-3.5 lg:pt-3 lg:pb-4 ${facePlateClass}`}
          >
            {/* Top Acoustic Earpiece Arch & Sony Ericsson Embossing */}
            <div className="flex flex-col items-center mb-1.5 lg:mb-2 shrink-0">
              <div className="flex items-center justify-between w-full px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full border border-black/25 transition-colors ${
                      hasUnreadNotifications
                        ? 'bg-[#FF731D] shadow-[0_0_8px_#FF731D]'
                        : 'bg-[#2C2F37]'
                    }`}
                    title={hasUnreadNotifications ? 'Notificaciones pendientes' : 'LED de estado'}
                  />
                  <span className="w-2 h-2 rounded-full bg-[#17191E] border border-black/30 shadow-inner" />
                </div>

                {/* Metallic Recessed Earpiece Slot */}
                <div className="w-20 h-2.5 rounded-full p-[1.5px] w800-chrome-rim shadow-inner">
                  <div className="w-full h-full rounded-full bg-[#1C1E24] flex items-center justify-center overflow-hidden">
                    <div className="w-16 h-1.5 w800-speaker-dots opacity-90" />
                  </div>
                </div>

                {/* Subtle Studio Config trigger on mobile edge-to-edge mode */}
                <div className="flex items-center justify-end min-w-[24px]">
                  {onOpenStudio ? (
                    <button
                      type="button"
                      onClick={onOpenStudio}
                      aria-label="Abrir configurador del launcher"
                      title="Configurar launcher y GitHub APK"
                      className={`lg:hidden p-1 rounded-full transition-colors ${
                        isBlack
                          ? 'text-white/45 hover:text-[#FF731D]'
                          : 'text-[#52555E]/60 hover:text-[#E8530E]'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="w-4" />
                  )}
                </div>
              </div>

              {/* Acoustic Dotted Side Flanks + Sony Ericsson Wordmark */}
              <div className="mt-1 flex items-center justify-between w-full px-2">
                <span className="w-6 h-2 rounded-full w800-speaker-dots opacity-55" aria-hidden="true" />
                <span
                  className={`text-[11.5px] font-bold tracking-[0.08em] ${
                    isBlack
                      ? 'text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                      : 'text-[#4D505A] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {ownerName || 'Sony Ericsson'}
                </span>
                <span className="w-6 h-2 rounded-full w800-speaker-dots opacity-55" aria-hidden="true" />
              </div>
            </div>

            {/* Smoked Sapphire Glass Lens Bezel (strictly locked inside chassis; bottom hardware stays fixed) */}
            <div className="relative flex-1 min-h-0 flex flex-col lg:flex-none rounded-[10px] p-[4px] lg:rounded-[13px] lg:p-[5px] w800-glass-lens">
              <div className="relative flex-1 min-h-0 w-full lg:flex-none lg:aspect-[4/5] rounded-[7px] lg:rounded-[8px] overflow-hidden bg-[#05060A] border border-white/10 shadow-[inset_0_0_16px_rgba(0,0,0,0.95)] [contain:layout]">
                <div className="absolute inset-0 overflow-hidden flex flex-col min-h-0">
                  {children}
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-50 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Sculpted W800i Control Cluster */}
            <div className="mt-2.5 lg:mt-3 shrink-0 grid grid-cols-[1fr_1.2fr_1fr] gap-2 items-stretch">
              {/* Left Stack: Curved Left Softkey + Back */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onPressKey('leftSoft')}
                  aria-label="Tecla de función izquierda"
                  className={`h-10 rounded-tl-2xl rounded-tr-md rounded-bl-sm rounded-br-sm flex items-center justify-center transition-transform cursor-pointer ${keyBtnClass} ${
                    activeKey === 'leftSoft' ? 'w800-key-pressed ring-2 ring-[#FF731D]' : ''
                  }`}
                >
                  <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-[#FF8C2E] to-[#E8530E] shadow-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => onPressKey('back')}
                  aria-label="Atrás"
                  className={`h-10 rounded-tl-sm rounded-tr-sm rounded-bl-2xl rounded-br-md flex items-center justify-center transition-transform cursor-pointer ${keyBtnClass} ${
                    activeKey === 'back' ? 'w800-key-pressed ring-2 ring-[#FF731D]' : ''
                  }`}
                >
                  <CornerDownLeft className="w-4 h-4 opacity-75" />
                </button>
              </div>

              {/* Center Stack: Dedicated Walkman Key + Menu Key + 5-Way Joystick */}
              <div className="flex flex-col items-center justify-between gap-1.5">
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => onPressKey('walkman')}
                    aria-label="Botón Walkman"
                    title="Walkman (Atajo directo)"
                    className={`h-8 rounded-lg bg-gradient-to-b from-[#FFFFFF] via-[#F4ECE2] to-[#E2D6C8] border border-[#C6BEB2] flex items-center justify-center w800-key-tactile transition-transform cursor-pointer ${
                      activeKey === 'walkman' ? 'w800-key-pressed ring-2 ring-[#FF731D]' : ''
                    }`}
                  >
                    <span className="text-[12.5px] font-extrabold text-[#E8530E] tracking-tighter">
                      W.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPressKey('center')}
                    aria-label="Abrir Menú"
                    title="Menú principal"
                    className="h-8 rounded-lg w800-dark-key-tactile border border-[#14161B] flex items-center justify-center transition-transform cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5 text-white/90" />
                  </button>
                </div>

                {/* Conical Brushed Silver + Draggable Glowing Orange Jewel 5-Way Joystick */}
                <div className="relative w-[92px] h-[62px] rounded-2xl w800-chrome-rim p-[2px] flex items-center justify-center">
                  <div
                    ref={stickPadRef}
                    role="group"
                    aria-label="Joystick direccional de 5 vías: arrastra hacia arriba, abajo, izquierda o derecha, o toca el centro para OK"
                    onPointerDown={handleStickPointerDown}
                    onPointerMove={handleStickPointerMove}
                    onPointerUp={(e) => releaseStick(e, false)}
                    onPointerCancel={(e) => releaseStick(e, true)}
                    onLostPointerCapture={(e) => releaseStick(e, true)}
                    className="relative w-full h-full rounded-[14px] overflow-hidden bg-gradient-to-b from-[#DFE2E9] via-[#C3C7D1] to-[#A4AAB7] shadow-inner flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
                  >
                    {/* Recessed circular well beneath the moving orange jewel */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute w-10 h-10 rounded-full bg-gradient-to-b from-[#9EA4B2]/70 via-[#B7BCC8]/60 to-[#E5E8EF]/80 shadow-[inset_0_2px_5px_rgba(0,0,0,0.34)]"
                    />

                    {/* 4 Directional Orientations (spaced cleanly outside the resting collar) */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-[2.5px] left-1/2 -translate-x-1/2 text-[7.5px] leading-none font-bold transition-all duration-100 ${
                        activeDirection === 'up'
                          ? 'text-[#E8530E] scale-125 drop-shadow-[0_0_5px_rgba(255,115,29,0.9)]'
                          : 'text-[#353944]/85'
                      }`}
                    >
                      ▲
                    </span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute bottom-[2.5px] left-1/2 -translate-x-1/2 text-[7.5px] leading-none font-bold transition-all duration-100 ${
                        activeDirection === 'down'
                          ? 'text-[#E8530E] scale-125 drop-shadow-[0_0_5px_rgba(255,115,29,0.9)]'
                          : 'text-[#353944]/85'
                      }`}
                    >
                      ▼
                    </span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-[4.5px] top-1/2 -translate-y-1/2 text-[7.5px] leading-none font-bold transition-all duration-100 ${
                        activeDirection === 'left'
                          ? 'text-[#E8530E] scale-125 drop-shadow-[0_0_5px_rgba(255,115,29,0.9)]'
                          : 'text-[#353944]/85'
                      }`}
                    >
                      ◄
                    </span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute right-[4.5px] top-1/2 -translate-y-1/2 text-[7.5px] leading-none font-bold transition-all duration-100 ${
                        activeDirection === 'right'
                          ? 'text-[#E8530E] scale-125 drop-shadow-[0_0_5px_rgba(255,115,29,0.9)]'
                          : 'text-[#353944]/85'
                      }`}
                    >
                      ►
                    </span>

                    {/* Draggable Center Orange Jewel */}
                    <div
                      style={{
                        transform: `translate3d(${renderedStickOffset.x.toFixed(1)}px, ${renderedStickOffset.y.toFixed(1)}px, 0) scale(${
                          activeKey === 'center' ? 0.92 : isDraggingStick ? 1.03 : 1
                        })`,
                      }}
                      className={`pointer-events-none relative z-10 w-7 h-7 rounded-full w800-chrome-rim p-[2.5px] will-change-transform ${
                        isDraggingStick ? 'transition-none' : 'transition-transform duration-150 ease-out'
                      } ${
                        activeKey === 'center' || activeDirection !== null
                          ? 'ring-2 ring-[#FF731D]/85 shadow-[0_3px_10px_rgba(232,83,14,0.45)]'
                          : 'shadow-[0_2px_5px_rgba(0,0,0,0.35)]'
                      }`}
                    >
                      <span className="block w-full h-full rounded-full w800-joystick-dome" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Stack: Gunmetal Right Softkey + C Key */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onPressKey('rightSoft')}
                  aria-label="Tecla de función derecha"
                  className={`h-10 rounded-tr-2xl rounded-tl-md rounded-bl-sm rounded-br-sm w800-dark-key-tactile border border-[#14161B] text-white flex items-center justify-center transition-transform cursor-pointer ${
                    activeKey === 'rightSoft' ? 'w800-dark-key-pressed ring-2 ring-[#FF731D]' : ''
                  }`}
                >
                  <Globe className="w-4 h-4 text-white/90" />
                </button>
                <button
                  type="button"
                  onClick={() => onPressKey('clear')}
                  aria-label="Borrar / Inicio"
                  className={`h-10 rounded-br-2xl rounded-tr-sm rounded-tl-sm rounded-bl-md w800-dark-key-tactile border border-[#14161B] text-white flex items-center justify-center transition-transform cursor-pointer ${
                    activeKey === 'clear' ? 'w800-dark-key-pressed ring-2 ring-[#FF731D]' : ''
                  }`}
                >
                  <span className="text-[12px] font-bold flex items-center gap-0.5">
                    <RotateCcw className="w-3 h-3 opacity-80" />C
                  </span>
                </button>
              </div>
            </div>

            {/* 4x3 Sculpted Numeric Keypad */}
            <div className="mt-2 shrink-0 p-1 rounded-[14px] bg-black/[0.06] shadow-inner">
              <div className="grid grid-cols-3 gap-1.5">
                {KEYPAD_KEYS.map(({ key, main, sub }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPressKey(key)}
                    aria-label={`Tecla ${main} ${sub}`}
                    className={`h-11 rounded-[10px] px-2 flex items-center justify-center gap-1.5 transition-transform cursor-pointer ${keyBtnClass} ${
                      activeKey === key ? 'w800-key-pressed ring-2 ring-[#FF731D]' : ''
                    }`}
                  >
                    <span className="text-[15.5px] font-bold leading-none tabular-nums">{main}</span>
                    <span className={`text-[8.5px] font-semibold tracking-tight leading-none ${keySubColor}`}>
                      {sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Signature Walkman Emblem */}
            <div className="mt-2.5 shrink-0 flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-[#E8530E]" />
                <span className="text-[15.5px] font-extrabold tracking-tight text-[#E8530E] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                  W.
                </span>
              </div>
              <span className="w-5 h-[2px] rounded-full bg-black/25" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
