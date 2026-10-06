import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';
import type { Map as MapboxMap } from 'mapbox-gl';

/** Mock weather station mast in Bishkek. Coordinates are illustrative. */
export const STATION: Position = [74.6105, 42.8746];

const MAST_HEIGHT_M = 72;
const BAND_M = 12;

/**
 * 3D without external models: Mapbox `fill-extrusion` over
 *  - OSM buildings from the basemap vector tiles;
 *  - a striped red/white mast (like real radio/weather masts) built from stacked squares.
 */
export function addScene3d(map: MapboxMap, beforeId?: string) {
  if (map.getSource('composite')) {
    map.addLayer(
      {
        id: 'buildings-3d',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', ['get', 'extrude'], 'true'],
        type: 'fill-extrusion',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': '#3b4252',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, 0.85],
        },
      },
      beforeId,
    );
  }

  map.addSource('station', { type: 'geojson', data: stationGeometry() });
  map.addLayer({
    id: 'station-3d',
    source: 'station',
    type: 'fill-extrusion',
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-height': ['get', 'height'],
    },
  });
}

/** Camera presets for the "3D" toggle. */
export const VIEW_OVERVIEW = {
  center: [74.59, 42.87] as [number, number],
  zoom: 10,
  pitch: 0,
  bearing: 0,
};
export const VIEW_STATION = {
  center: STATION as [number, number],
  zoom: 16.2,
  pitch: 62,
  bearing: -30,
};

interface MastProps {
  base: number;
  height: number;
  color: string;
}

function stationGeometry(): FeatureCollection<Polygon, MastProps> {
  const features: Feature<Polygon, MastProps>[] = [
    // Equipment building at the foot of the mast.
    square(STATION, 14, { base: 0, height: 6, color: '#94a3b8' }),
  ];

  for (let base = 6, i = 0; base < MAST_HEIGHT_M; base += BAND_M, i++) {
    features.push(
      square(STATION, 3, {
        base,
        height: Math.min(base + BAND_M, MAST_HEIGHT_M),
        color: i % 2 === 0 ? '#ef4444' : '#f8fafc',
      }),
    );
  }

  return { type: 'FeatureCollection', features };
}

/** Square of `sizeM` metres centred at `center` (good enough approximation at city scale). */
function square(
  [lng, lat]: Position,
  sizeM: number,
  properties: MastProps,
): Feature<Polygon, MastProps> {
  const dLat = sizeM / 2 / 111_320;
  const dLng = dLat / Math.cos(((lat ?? 0) * Math.PI) / 180);
  const x = lng ?? 0;
  const y = lat ?? 0;

  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [x - dLng, y - dLat],
          [x + dLng, y - dLat],
          [x + dLng, y + dLat],
          [x - dLng, y + dLat],
          [x - dLng, y - dLat],
        ],
      ],
    },
  };
}
