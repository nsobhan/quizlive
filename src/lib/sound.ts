// Tiny WebAudio sound effects — no audio files needed.
const KEY = 'quizlive:muted';
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(m));
}
export function onMuteChange(l: (m: boolean) => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

export type Sfx = 'tick' | 'correct' | 'wrong' | 'start' | 'join' | 'win' | 'tap';

export function play(sfx: Sfx) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    return;
  }
  switch (sfx) {
    case 'tick': tone(880, 0, 0.06, 'square', 0.05); break;
    case 'tap': tone(520, 0, 0.08, 'triangle', 0.1); break;
    case 'join': tone(660, 0, 0.1); tone(990, 0.08, 0.12); break;
    case 'start': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.15, 'triangle')); break;
    case 'correct': tone(784, 0, 0.12, 'triangle'); tone(1175, 0.1, 0.25, 'triangle'); break;
    case 'wrong': tone(220, 0, 0.18, 'sawtooth', 0.08); tone(160, 0.15, 0.3, 'sawtooth', 0.08); break;
    case 'win': [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle')); break;
  }
}
