import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import type { Frame, LayerId } from '@/domain/types';
import { LAYERS } from '@/layers/registry';
import { selectFrameAt } from '@/store/selectors';
import type { AppStore } from '@/store/store';
import { addArrowIcon } from './arrowIcon';
import { mapLayerIds, toMapboxLayers } from './mapboxLayers';

const EMPTY: Frame = { type: 'FeatureCollection', features: [] };

export interface LayerController {
  destroy(): void;
}

/**
 * Bridge between the store and Mapbox. Plain TS, no React: it subscribes to the store
 * directly (`store.on`), so map updates never trigger React renders.
 */
export function createLayerController(map: MapboxMap, store: AppStore): LayerController {
  addArrowIcon(map);

  // Data layers go under the basemap labels so city names stay readable.
  const beforeId = map.getStyle()?.layers?.find((l) => l.type === 'symbol')?.id;

  // LAYERS order is the draw order: each next layer is inserted above the previous one.
  for (const layer of LAYERS) {
    map.addSource(layer.id, { type: 'geojson', data: EMPTY });
    for (const spec of toMapboxLayers(layer)) map.addLayer(spec, beforeId);
  }

  /** Last frame handed to Mapbox per layer — skip setData when nothing changed. */
  const rendered = new Map<LayerId, Frame>();
  let rafId = 0;

  function render() {
    rafId = 0;
    const state = store.get();

    for (const layerId of state.activeLayerIds) {
      const frame = selectFrameAt(state, layerId, state.selectedTime) ?? EMPTY;
      if (rendered.get(layerId) === frame) continue;

      rendered.set(layerId, frame);
      (map.getSource(layerId) as GeoJSONSource | undefined)?.setData(frame);
    }
  }

  /**
   * Several store updates within one animation frame (new frame arrived + time moved)
   * collapse into a single setData per layer.
   */
  function scheduleRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  function syncVisibility(activeIds: readonly LayerId[]) {
    for (const layer of LAYERS) {
      const visibility = activeIds.includes(layer.id) ? 'visible' : 'none';
      for (const id of mapLayerIds(layer)) map.setLayoutProperty(id, 'visibility', visibility);
    }
  }

  // store.on fires immediately with the current value, which doubles as the initial render.
  const unsubscribe = [
    store.on('activeLayerIds', (ids) => {
      syncVisibility(ids);
      scheduleRender();
    }),
    store.on('selectedTime', scheduleRender),
    store.on('frames', scheduleRender),
  ];

  return {
    destroy() {
      unsubscribe.forEach((off) => off());
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
