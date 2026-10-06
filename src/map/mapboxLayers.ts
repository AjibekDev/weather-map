import type { ExpressionSpecification, LayerSpecification } from 'mapbox-gl';
import type { LayerDefinition, LayerStyle } from '@/domain/types';

/**
 * The only place that knows how a LayerDefinition looks in Mapbox.
 * Layers stay renderer-agnostic; swapping the map library means rewriting this file.
 */

export const ARROW_ICON = 'wind-arrow';

const value: ExpressionSpecification = ['get', 'value'];

export const arrowsLayerId = (layerId: string) => `${layerId}:arrows`;

/** All Mapbox layer ids that belong to one app layer (for visibility toggling). */
export function mapLayerIds(layer: LayerDefinition): string[] {
  return layer.style.arrows ? [layer.id, arrowsLayerId(layer.id)] : [layer.id];
}

export function toMapboxLayers(layer: LayerDefinition): LayerSpecification[] {
  const base = { id: layer.id, source: layer.id, layout: { visibility: 'none' as const } };
  const specs: LayerSpecification[] = [];

  switch (layer.render) {
    case 'heatmap':
      specs.push({ ...base, type: 'heatmap', paint: heatmapPaint(layer.style) });
      break;
    case 'circle':
      specs.push({ ...base, type: 'circle', paint: circlePaint(layer.style) });
      break;
    case 'fill':
      specs.push({ ...base, type: 'fill', paint: fillPaint(layer.style) });
      break;
  }

  if (layer.style.arrows) specs.push(arrowsLayer(layer.id));
  return specs;
}

function colorByValue({ colorStops }: LayerStyle): ExpressionSpecification {
  return ['interpolate', ['linear'], value, ...colorStops.flat()];
}

/** Maps the value domain onto 0..1. */
function normalized({ domain: [min, max] }: LayerStyle): ExpressionSpecification {
  return ['interpolate', ['linear'], value, min, 0, max, 1];
}

/**
 * Heatmap colours are driven by density, not by the value itself, so stops are
 * re-projected from the value domain onto 0..1. Weight = normalized value, and
 * radius grows with zoom so neighbouring grid points always overlap evenly.
 */
function heatmapPaint(style: LayerStyle) {
  const [min, max] = style.domain;
  const densityStops = style.colorStops.flatMap(([v, color]) => [
    0.05 + (0.95 * (v - min)) / (max - min),
    color,
  ]);

  return {
    'heatmap-weight': normalized(style),
    // Radius doubles per zoom level together with the grid spacing, so the overlap — and
    // therefore the density for a given value — stays the same; intensity can be constant.
    'heatmap-intensity': 0.8,
    'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 8, 18, 13, 576],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(0, 0, 0, 0)',
      ...densityStops,
    ],
    // Fade out on close zoom: individual kernels become huge blobs there.
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 15, 0.15],
  } satisfies Extract<LayerSpecification, { type: 'heatmap' }>['paint'];
}

function circlePaint(style: LayerStyle) {
  return {
    'circle-color': colorByValue(style),
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8,
      ['interpolate', ['linear'], normalized(style), 0, 2, 1, 4],
      13,
      ['interpolate', ['linear'], normalized(style), 0, 6, 1, 14],
    ],
    'circle-opacity': 0.6,
  } satisfies Extract<LayerSpecification, { type: 'circle' }>['paint'];
}

function fillPaint(style: LayerStyle) {
  return {
    'fill-color': colorByValue(style),
    'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.45, 15, 0.15],
    // Antialiasing draws visible seams between adjacent grid cells.
    'fill-antialias': false,
  } satisfies Extract<LayerSpecification, { type: 'fill' }>['paint'];
}

/** `direction` is where the wind comes FROM, the arrow shows where it blows — hence +180°. */
function arrowsLayer(layerId: string): LayerSpecification {
  return {
    id: arrowsLayerId(layerId),
    source: layerId,
    type: 'symbol',
    layout: {
      visibility: 'none',
      'icon-image': ARROW_ICON,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 10, 0.7, 13, 1.2],
      'icon-rotate': ['+', ['get', 'direction'], 180],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
    paint: { 'icon-opacity': 0.9 },
  };
}
