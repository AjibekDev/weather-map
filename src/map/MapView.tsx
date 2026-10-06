import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { store } from '@/store/store';
import { createLayerController, type LayerController } from './layerController';
import { addScene3d, VIEW_OVERVIEW, VIEW_STATION } from './scene3d';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = TOKEN;

/**
 * Owns the Mapbox instance. React only mounts/unmounts it;
 * everything data-related happens in the layer controller.
 */
export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [is3d, setIs3d] = useState(false);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      ...VIEW_OVERVIEW,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;

    let controller: LayerController | null = null;
    map.on('load', () => {
      controller = createLayerController(map, store);
      addScene3d(map, map.getStyle()?.layers?.find((l) => l.type === 'symbol')?.id);
    });

    return () => {
      controller?.destroy();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function toggle3d() {
    const next = !is3d;
    setIs3d(next);
    mapRef.current?.flyTo({ ...(next ? VIEW_STATION : VIEW_OVERVIEW), duration: 2500 });
  }

  if (!TOKEN) {
    return (
      <div className="map map--empty">
        Не задан <code>VITE_MAPBOX_TOKEN</code> — см. <code>.env.example</code>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="map" />
      <button type="button" className="map-3d-toggle" onClick={toggle3d}>
        {is3d ? 'Обзор' : '3D: метеостанция'}
      </button>
    </>
  );
}
