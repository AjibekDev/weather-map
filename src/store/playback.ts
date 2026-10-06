import { HOUR_MS } from '@/domain/time';
import { setPlaying, setTime } from './actions';
import { selectTimeSteps } from './selectors';
import { store } from './store';

/** Playback speed: one hour of data per second. */
const HOURS_PER_SECOND = 1;

let rafId = 0;
let lastTick = 0;
let unsubscribe: (() => void) | null = null;

/**
 * Playback lives outside React: a rAF loop that advances `selectedTime` fractionally,
 * so the map interpolates between hourly frames instead of jumping.
 * Returns a disposer — safe under StrictMode double effects.
 */
export function initPlayback(): () => void {
  unsubscribe ??= store.on('isPlaying', (isPlaying) => (isPlaying ? start() : stop()));

  return () => {
    stop();
    unsubscribe?.();
    unsubscribe = null;
  };
}

function start() {
  if (rafId) return;

  const steps = selectTimeSteps(store.get());
  const first = steps[0];
  const last = steps[steps.length - 1];
  if (first === undefined || last === undefined) return;

  // Pressing play at the end of the axis starts over.
  if (store.get('selectedTime') >= last) setTime(first);

  lastTick = performance.now();
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function tick(now: number) {
  const elapsed = now - lastTick;
  lastTick = now;

  const steps = selectTimeSteps(store.get());
  const last = steps[steps.length - 1];
  const next = store.get('selectedTime') + (elapsed / 1000) * HOURS_PER_SECOND * HOUR_MS;

  if (last === undefined || next >= last) {
    if (last !== undefined) setTime(last);
    rafId = 0;
    setPlaying(false);
    return;
  }

  setTime(next);
  rafId = requestAnimationFrame(tick);
}
