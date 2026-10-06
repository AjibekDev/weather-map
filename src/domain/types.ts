import type { FeatureCollection, Point, Polygon } from 'geojson';

/** Unix epoch in ms (UTC). The only time representation used across the app. */
export type Timestamp = number;

/** Inclusive range: steps are start, start+stepMs, …, end. */
export interface TimeRange {
  start: Timestamp;
  end: Timestamp;
  stepMs: number;
}

/** Layers are open-ended (registry-driven), so the id is a plain string. */
export type LayerId = string;

/** Cache key for a single frame: one layer at one time step. */
export type FrameKey = `${LayerId}:${Timestamp}`;

/** Properties of one grid cell. `direction` is only used by vector layers (wind). */
export interface CellProps {
  value: number;
  /** Degrees, meteorological convention (where the wind comes from). */
  direction?: number;
}

/**
 * One layer at one moment in time.
 * Contract: every frame of a layer has the same features in the same order
 * (same grid, stable `id`), which makes interpolation a per-index lerp.
 */
export type Frame = FeatureCollection<Point | Polygon, CellProps>;

/** Aggregated value of a layer at a time step — data for the chart. */
export interface SeriesPoint {
  t: Timestamp;
  value: number;
}

/** How a layer is drawn. The map controller maps this to Mapbox layer types. */
export type RenderKind = 'heatmap' | 'circle' | 'fill';

/**
 * Renderer-agnostic style. Layers describe *what* to show;
 * the map controller decides *how* (Mapbox paint expressions).
 */
export interface LayerStyle {
  /** [value, color] pairs, ascending by value. */
  colorStops: ReadonlyArray<readonly [number, string]>;
  domain: readonly [min: number, max: number];
  /** Single colour for the legend accent and the chart line. */
  accent: string;
  /** Draw `direction` as arrows on top of the main geometry. */
  arrows?: boolean;
}

/** Data access for a layer. Any source (mock, REST, tiles) fits behind it. */
export interface LayerSource {
  fetchFrame(time: Timestamp, signal: AbortSignal): Promise<Frame>;
  fetchSeries(range: TimeRange, signal: AbortSignal): Promise<readonly SeriesPoint[]>;
}

/** Adding a layer = adding one LayerDefinition to the registry. */
export interface LayerDefinition {
  id: LayerId;
  title: string;
  unit: string;
  render: RenderKind;
  style: LayerStyle;
  timeRange: TimeRange;
  source: LayerSource;
}
