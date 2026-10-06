import { buildSteps } from '@/domain/time';
import type { LayerDefinition, LayerId, Timestamp } from '@/domain/types';
import { insolation } from './insolation';
import { temperature } from './temperature';
import { wind } from './wind';

export const LAYERS: readonly LayerDefinition[] = [insolation, temperature, wind];

const byId = new Map(LAYERS.map((layer) => [layer.id, layer]));

export function getLayer(id: LayerId): LayerDefinition {
  const layer = byId.get(id);
  if (!layer) throw new Error(`Unknown layer: ${id}`);
  return layer;
}

export function timeAxis(ids: readonly LayerId[]): Timestamp[] {
  const all = ids.flatMap((id) => buildSteps(getLayer(id).timeRange));
  return [...new Set(all)].sort((a, b) => a - b);
}
