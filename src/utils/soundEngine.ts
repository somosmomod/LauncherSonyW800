// Web Audio synthesizer for authentic 2005 Sony Ericsson key clicks, DTMF dialer, and Walkman tracks

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function triggerHaptic(enabled: boolean, duration = 16) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(duration);
  } catch {
    // Ignore on unsupported devices
  }
}

export function playKeyClick(enabled: boolean, pitchMultiplier = 1) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1150 * pitchMultiplier, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.028);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.035);
}

export function playNavTick(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(760, now);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.022);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.026);
}

const DTMF_MAP: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

export function playDtmfTone(enabled: boolean, key: string) {
  if (!enabled) return;
  const freqs = DTMF_MAP[key];
  if (!freqs) {
    playKeyClick(enabled);
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(freqs[0], now);
  osc2.frequency.setValueAtTime(freqs[1], now);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.15);
  osc2.stop(now + 0.15);
}

export function playShutterSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.075);
}

export function playWalkmanStep(enabled: boolean, baseFreq: number, stepIndex: number) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Pentatonic warm 2005 groove pattern
  const scaleRatios = [1, 1.122, 1.26, 1.498, 1.682, 2, 1.498, 1.26];
  const noteFreq = baseFreq * scaleRatios[stepIndex % scaleRatios.length];

  const lead = ctx.createOscillator();
  const bass = ctx.createOscillator();
  const leadGain = ctx.createGain();
  const bassGain = ctx.createGain();

  lead.type = 'triangle';
  lead.frequency.setValueAtTime(noteFreq, now);
  leadGain.gain.setValueAtTime(0.045, now);
  leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

  lead.connect(leadGain);
  leadGain.connect(ctx.destination);
  lead.start(now);
  lead.stop(now + 0.25);

  if (stepIndex % 2 === 0) {
    bass.type = 'sine';
    bass.frequency.setValueAtTime(baseFreq * 0.5, now);
    bassGain.gain.setValueAtTime(0.055, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.3);
  }
}

export function playFmStaticBurst(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.08;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  source.connect(filter);
  filter.connect(ctx.destination);
  source.start();
}
