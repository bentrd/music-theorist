let context: AudioContext | null = null;
const voices = new Set<OscillatorNode>();
let sequence = 0;
let stopGeneration = 0;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!context || context.state === 'closed') context = new AudioContextClass();
  return context;
}

/** A soft, synthesized keyboard. Audio starts only after a user gesture. */
export async function playNotes(notes: number[], duration = 0.65): Promise<void> {
  let audio: AudioContext | null;
  try { audio = getContext(); } catch { return; }
  if (!audio || !notes.length) return;
  const generation = stopGeneration;
  try {
    if (audio.state === 'suspended') await audio.resume();
  } catch {
    return;
  }
  if (generation !== stopGeneration) return;
  const now = audio.currentTime;
  const length = Number.isFinite(duration) ? Math.max(0.08, Math.min(duration, 6)) : 0.65;
  const volume = 0.18 / Math.sqrt(notes.length);
  for (const midi of notes) {
    if (!Number.isFinite(midi) || midi < 0 || midi > 127) continue;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(volume * 0.35, now + length * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length + 0.15);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + length + 0.16);
  }
  await new Promise<void>((resolve) => window.setTimeout(resolve, length * 1000));
}

export async function playSequence(chords: number[][], duration = 0.6): Promise<void> {
  const token = ++sequence;
  for (const chord of chords) {
    if (token !== sequence) return;
    await playNotes(chord, duration);
  }
}

export function stopAudio(): void {
  sequence += 1;
  stopGeneration += 1;
  for (const voice of voices) {
    try { voice.stop(); } catch { /* Already stopped. */ }
  }
  voices.clear();
}
