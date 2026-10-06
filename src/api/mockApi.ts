import type { Feature, Point, Polygon, Position } from 'geojson';
import { buildSteps } from '@/domain/time';
import type {
  CellProps,
  Frame,
  LayerSource,
  SeriesPoint,
  TimeRange,
  Timestamp,
} from '@/domain/types';

/** Bishkek. Grid covers the city and the foothills to the south. */
const CENTER: Position = [74.59, 42.87];
const COLS = 24;
const ROWS = 16;
const STEP_LNG = 0.025;
const STEP_LAT = 0.018;

/** Bishkek is UTC+6; diurnal cycles are computed in local solar-ish time. */
const UTC_OFFSET_H = 6;

export interface GridCell {
  /** Stable index — becomes Feature.id (Frame contract: same grid, same order). */
  index: number;
  lng: number;
  lat: number;
  /** 0 at the northern edge, 1 at the southern edge (closer to the mountains). */
  south: number;
  /** 0..1, west → east. */
  east: number;
}

const GRID: readonly GridCell[] = Array.from({ length: COLS * ROWS }, (_, index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    index,
    lng: CENTER[0]! + (col - (COLS - 1) / 2) * STEP_LNG,
    lat: CENTER[1]! - (row - (ROWS - 1) / 2) * STEP_LAT,
    south: row / (ROWS - 1),
    east: col / (COLS - 1),
  };
});

export interface MockSourceConfig {
  geometry: 'point' | 'polygon';
  value(cell: GridCell, time: Timestamp): number;
  direction?(cell: GridCell, time: Timestamp): number;
  /** Random response delay, ms. Wide on purpose — makes race conditions visible. */
  latency?: readonly [min: number, max: number];
}

/**
 * Mock data source. Values are a pure function of (cell, time), so the same request
 * always returns the same frame — required for caching and interpolation.
 */
export function createMockSource(config: MockSourceConfig): LayerSource {
  const [minDelay, maxDelay] = config.latency ?? [200, 1200];
  const randomDelay = () => minDelay + Math.random() * (maxDelay - minDelay);

  const buildFrame = (time: Timestamp): Frame => ({
    type: 'FeatureCollection',
    features: GRID.map((cell) => toFeature(cell, time, config)),
  });

  return {
    async fetchFrame(time, signal) {
      await delay(randomDelay(), signal);
      return buildFrame(time);
    },

    async fetchSeries(range, signal) {
      await delay(randomDelay(), signal);
      return aggregateSeries(range, config);
    },
  };
}

function toFeature(
  cell: GridCell,
  time: Timestamp,
  config: MockSourceConfig,
): Feature<Point | Polygon, CellProps> {
  const properties: CellProps = { value: round(config.value(cell, time)) };
  if (config.direction) properties.direction = round(config.direction(cell, time));

  return {
    type: 'Feature',
    id: cell.index,
    geometry: config.geometry === 'point' ? point(cell) : square(cell),
    properties,
  };
}

/** Chart data: mean value over the grid for each time step. */
function aggregateSeries(range: TimeRange, config: MockSourceConfig): SeriesPoint[] {
  return buildSteps(range).map((t) => {
    const sum = GRID.reduce((acc, cell) => acc + config.value(cell, t), 0);
    return { t, value: round(sum / GRID.length) };
  });
}

/* ---------- value generators (plausible weather for Bishkek, early autumn) ---------- */

/** °C. Daily cycle peaking ~15:00, colder towards the mountains, urban heat island in the centre. */
export function temperatureAt(cell: GridCell, time: Timestamp): number {
  const h = localHour(time);
  const daily = Math.cos(((h - 15) / 24) * 2 * Math.PI); // 1 at 15:00, -1 at 03:00
  const altitude = -6 * cell.south;
  const heatIsland =
    2.5 * Math.exp(-(((cell.east - 0.5) / 0.25) ** 2 + ((cell.south - 0.35) / 0.25) ** 2));
  return 16 + 8 * daily + altitude + heatIsland + 1.5 * noise(cell, time);
}

/** m/s. Mountain–valley breeze: stronger near the foothills in the afternoon. */
export function windSpeedAt(cell: GridCell, time: Timestamp): number {
  const h = localHour(time);
  const breeze = Math.max(0, Math.sin(((h - 9) / 24) * 2 * Math.PI));
  return Math.max(0.3, 2 + 5 * breeze * (0.5 + cell.south) + 1.2 * noise(cell, time));
}

/**
 * Degrees, meteorological (where the wind comes FROM).
 * Day: valley breeze from the north (≈0°). Night: mountain breeze from the south (≈180°).
 */
export function windDirectionAt(cell: GridCell, time: Timestamp): number {
  const h = localHour(time);
  const isDay = h >= 9 && h < 20;
  const base = isDay ? 0 : 180;
  return (base + 40 * (cell.east - 0.5) + 25 * noise(cell, time) + 360) % 360;
}

/** W/m². Sun elevation profile × moving cloud cover. Zero at night. */
export function insolationAt(cell: GridCell, time: Timestamp): number {
  const h = localHour(time);
  const sun = Math.max(0, Math.sin(((h - 6.5) / 12.5) * Math.PI)); // sunrise ~6:30, sunset ~19:00
  const clouds =
    0.35 * smoothstep(Math.sin(cell.east * 6 + time / 3.6e6 / 2) * Math.cos(cell.south * 5));
  return 850 * sun * (1 - clouds) * (0.95 + 0.05 * noise(cell, time));
}

/* ---------- helpers ---------- */

function localHour(time: Timestamp): number {
  const d = new Date(time);
  return (d.getUTCHours() + d.getUTCMinutes() / 60 + UTC_OFFSET_H) % 24;
}

/** Deterministic pseudo-noise in [-1, 1], stable per (cell, hour). */
function noise(cell: GridCell, time: Timestamp): number {
  const hour = Math.floor(time / 3.6e6);
  const x = Math.sin(cell.index * 12.9898 + hour * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, (x + 1) / 2));
  return t * t * (3 - 2 * t);
}

const round = (v: number) => Math.round(v * 10) / 10;

function point(cell: GridCell): Point {
  return { type: 'Point', coordinates: [cell.lng, cell.lat] };
}

function square(cell: GridCell): Polygon {
  const dx = STEP_LNG / 2;
  const dy = STEP_LAT / 2;
  const { lng, lat } = cell;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - dx, lat - dy],
        [lng + dx, lat - dy],
        [lng + dx, lat + dy],
        [lng - dx, lat + dy],
        [lng - dx, lat - dy],
      ],
    ],
  };
}

/** Resolves after `ms`, or rejects with AbortError as soon as `signal` fires. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason ?? abortError());

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason ?? abortError());
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const abortError = () => new DOMException('Aborted', 'AbortError');
