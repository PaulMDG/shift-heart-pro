let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Short, pleasant two-tone chime for incoming messages. Safe to call from realtime callbacks. */
export function playMessageChime() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const now = c.currentTime;
    const notes: Array<[number, number]> = [
      [880, now],          // A5
      [1318.51, now + 0.12], // E6
    ];
    notes.forEach(([freq, start]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.18, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      o.connect(g).connect(c.destination);
      o.start(start);
      o.stop(start + 0.4);
    });
  } catch {
    /* no-op */
  }
}

const KEY = "notify-sound-enabled";
export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) !== "0";
}
export function setSoundEnabled(v: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, v ? "1" : "0");
}