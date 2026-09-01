/**
 * Procedural UI sounds via Web Audio API. No audio files.
 * Each sound is a pure function that creates nodes, schedules playback,
 * and lets the browser garbage-collect them.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function ramp(gain: GainNode, to: number, at: number) {
  gain.gain.linearRampToValueAtTime(to, at);
}

const sounds = {
  click() {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(4200, t);
    osc.frequency.exponentialRampToValueAtTime(2800, t + 0.015);
    gain.gain.setValueAtTime(0, t);
    ramp(gain, 0.15, t + 0.002);
    ramp(gain, 0, t + 0.015);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  },

  success() {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);
    gain.gain.setValueAtTime(0, t);
    ramp(gain, 0.12, t + 0.005);
    ramp(gain, 0.1, t + 0.12);
    ramp(gain, 0, t + 0.25);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  },

  pop() {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
    gain.gain.setValueAtTime(0, t);
    ramp(gain, 0.18, t + 0.003);
    ramp(gain, 0, t + 0.06);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  },

  toggle() {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.08);
    gain.gain.setValueAtTime(0, t);
    ramp(gain, 0.12, t + 0.003);
    ramp(gain, 0, t + 0.08);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  },
} as const;

export type SoundType = keyof typeof sounds;

export function playSound(type: SoundType): void {
  try {
    sounds[type]();
  } catch {
    // AudioContext may not be available (SSR, unsupported browser)
  }
}
