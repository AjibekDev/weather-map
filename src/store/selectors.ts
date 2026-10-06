import { LAYERS, timeAxis } from '@/layers/registry';
import type { AppState } from './store';
import type { Frame, LayerId, Timestamp } from '@/domain/types';
import { frameKey, bracketTime, interpolateFrames } from '@/domain/time';

const ALL_LAYER_IDS = LAYERS.map((layer) => layer.id);

export function selectTimeSteps(state: Pick<AppState, 'activeLayerIds'>): Timestamp[] {
  const ids = state.activeLayerIds.length > 0 ? state.activeLayerIds : ALL_LAYER_IDS;

  return timeAxis(ids);
}

export function selectFrameAt(
  state: Pick<AppState, 'frames' | 'activeLayerIds'>,
  layerId: LayerId,
  time: Timestamp,
): Frame | null {
  const steps = selectTimeSteps(state);

  if (steps.length === 0) return null;

  const { next, prev, ratio } = bracketTime(time, steps);
  const a = state.frames[frameKey(layerId, prev)];
  const b = state.frames[frameKey(layerId, next)];

  if (a && b) {
    return interpolateFrames(a, b, ratio);
  }

  return (ratio < 0.5 ? (a ?? b) : (b ?? a)) ?? null;
}
