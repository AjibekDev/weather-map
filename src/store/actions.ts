import type { FrameKey, LayerId, Timestamp } from '@/domain/types';
import { store } from './store';
import { selectTimeSteps } from './selectors';
import { bracketTime, clampTime, frameKey } from '@/domain/time';
import { getLayer } from '@/layers/registry';

const DEFAULT_ACTIVE_LAYERS: readonly LayerId[] = ['temperature'];

interface FrameRequest {
  controller: AbortController;
  keys: ReadonlySet<FrameKey>;
}

const inFlight = new Map<LayerId, FrameRequest>();
const seriesInFlight = new Map<LayerId, AbortController>();
/** Prefetch is best-effort and never cancels the main request — it has its own controller. */
const prefetchControllers = new Map<LayerId, AbortController>();
const prefetching = new Set<FrameKey>();

/** How many steps ahead to warm up the cache during playback. */
const PREFETCH_AHEAD = 2;

const isAbortError = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

function setLayerStatus(layerId: LayerId, loading: boolean, error?: string | null) {
  const state = store.get();
  const loadingChanged = (state.loading[layerId] ?? false) !== loading;
  const errorChanged = error !== undefined && (state.errors[layerId] ?? null) !== error;

  if (!loadingChanged && !errorChanged) {
    return;
  }

  store.dispatch((state) => ({
    ...(loadingChanged && { loading: { ...state.loading, [layerId]: loading } }),
    ...(errorChanged && { errors: { ...state.errors, [layerId]: error } }),
  }));
}

async function ensureFrames(layerId: LayerId, time: Timestamp): Promise<void> {
  const state = store.get();
  const steps = selectTimeSteps(state);

  if (steps.length === 0) {
    return;
  }

  const { prev, next } = bracketTime(time, steps);
  const missing = [...new Set([prev, next])].filter((t) => !state.frames[frameKey(layerId, t)]);
  const keys = new Set(missing.map((t) => frameKey(layerId, t)));

  const current = inFlight.get(layerId);

  if (current && keys.size > 0 && [...keys].every((k) => current.keys.has(k))) {
    return;
  }

  current?.controller.abort();
  inFlight.delete(layerId);

  if (missing.length === 0) {
    setLayerStatus(layerId, false);
    return;
  }

  const request: FrameRequest = { controller: new AbortController(), keys };
  inFlight.set(layerId, request);
  setLayerStatus(layerId, true, null);

  const layer = getLayer(layerId);

  try {
    const loaded = await Promise.all(
      missing.map(
        async (t) =>
          [
            frameKey(layerId, t),
            await layer.source.fetchFrame(t, request.controller.signal),
          ] as const,
      ),
    );
    store.dispatch((s) => ({ frames: { ...s.frames, ...Object.fromEntries(loaded) } }));
  } catch (e) {
    if (isAbortError(e)) {
      return;
    }

    if (inFlight.get(layerId) === request) {
      setLayerStatus(layerId, false, errorMessage(e));
    }
  } finally {
    if (inFlight.get(layerId) === request) {
      inFlight.delete(layerId);
      setLayerStatus(layerId, false);
    }
  }
}

async function ensureSeries(layerId: LayerId): Promise<void> {
  if (store.get('series')[layerId] || seriesInFlight.has(layerId)) return;

  const controller = new AbortController();
  seriesInFlight.set(layerId, controller);
  try {
    const layer = getLayer(layerId);
    const points = await layer.source.fetchSeries(layer.timeRange, controller.signal);
    store.dispatch((s) => ({ series: { ...s.series, [layerId]: points } }));
  } catch (e) {
    if (!isAbortError(e))
      setLayerStatus(layerId, store.get('loading')[layerId] ?? false, errorMessage(e));
  } finally {
    if (seriesInFlight.get(layerId) === controller) seriesInFlight.delete(layerId);
  }
}

function prefetchFrame(layerId: LayerId, time: Timestamp) {
  const key = frameKey(layerId, time);
  if (store.get('frames')[key] || prefetching.has(key) || inFlight.get(layerId)?.keys.has(key)) {
    return;
  }

  let controller = prefetchControllers.get(layerId);
  if (!controller) {
    controller = new AbortController();
    prefetchControllers.set(layerId, controller);
  }

  prefetching.add(key);
  getLayer(layerId)
    .source.fetchFrame(time, controller.signal)
    .then((frame) => store.dispatch((s) => ({ frames: { ...s.frames, [key]: frame } })))
    .catch(() => {}) // a missed prefetch is not an error: ensureFrames will load it on demand
    .finally(() => prefetching.delete(key));
}

function prefetchAhead(layerId: LayerId, time: Timestamp, steps: readonly Timestamp[]) {
  const nextIndex = steps.findIndex((t) => t > time);
  if (nextIndex < 0) return;

  for (const t of steps.slice(nextIndex + 1, nextIndex + 1 + PREFETCH_AHEAD)) {
    prefetchFrame(layerId, t);
  }
}

/** Nearest step to "now" if it is within the axis, otherwise midday-ish. */
function initialTime(steps: readonly Timestamp[]): Timestamp {
  const now = Date.now();
  const first = steps[0]!;
  const last = steps[steps.length - 1]!;
  if (now < first || now > last) return steps[Math.floor(steps.length / 2)]!;

  const { prev, next, ratio } = bracketTime(now, steps);
  return ratio < 0.5 ? prev : next;
}

function clampSelectedTime() {
  const state = store.get();
  const steps = selectTimeSteps(state);
  if (steps.length === 0) return;
  const clamped = clampTime(state.selectedTime || initialTime(steps), steps);
  if (clamped !== state.selectedTime) store.dispatch('selectedTime', clamped);
}

function activateLayer(layerId: LayerId) {
  getLayer(layerId); // fail fast on unknown ids
  if (store.get('activeLayerIds').includes(layerId)) return;

  store.dispatch((s) => ({ activeLayerIds: [...s.activeLayerIds, layerId] }));
  clampSelectedTime();
  void ensureFrames(layerId, store.get('selectedTime'));
  void ensureSeries(layerId);
}

function deactivateLayer(layerId: LayerId) {
  inFlight.get(layerId)?.controller.abort();
  inFlight.delete(layerId);
  seriesInFlight.get(layerId)?.abort();
  seriesInFlight.delete(layerId);
  prefetchControllers.get(layerId)?.abort();
  prefetchControllers.delete(layerId);

  store.dispatch((s) => ({ activeLayerIds: s.activeLayerIds.filter((id) => id !== layerId) }));
  setLayerStatus(layerId, false);
  clampSelectedTime();
}

// ---------- public actions ----------

export function toggleLayer(layerId: LayerId) {
  if (store.get('activeLayerIds').includes(layerId)) deactivateLayer(layerId);
  else activateLayer(layerId);
}

/** Accepts fractional time (between steps). Safe to call on every slider move / animation frame. */
export function setTime(time: Timestamp) {
  const state = store.get();
  const steps = selectTimeSteps(state);
  if (steps.length === 0) return;

  const clamped = clampTime(time, steps);
  if (clamped === state.selectedTime) return;

  store.dispatch('selectedTime', clamped);
  for (const layerId of state.activeLayerIds) {
    void ensureFrames(layerId, clamped);
    if (state.isPlaying) prefetchAhead(layerId, clamped, steps);
  }
}

export function setPlaying(isPlaying: boolean) {
  if (store.get('isPlaying') !== isPlaying) store.dispatch('isPlaying', isPlaying);
}

/** Sets the initial time and default layers. Idempotent: safe under React StrictMode. */
export function initApp() {
  clampSelectedTime();
  for (const layerId of DEFAULT_ACTIVE_LAYERS) activateLayer(layerId);
}
