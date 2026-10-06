import { HOUR_MS } from '@/domain/time';
import type { TimeRange } from '@/domain/types';

const BISHKEK_UTC_OFFSET_H = 6;

/** Today 06:00–22:00 Bishkek time, hourly. Fixed at module load — fine for a demo. */
function todayRange(): TimeRange {
  const now = new Date();
  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    6 - BISHKEK_UTC_OFFSET_H,
  );
  return { start, end: start + 16 * HOUR_MS, stepMs: HOUR_MS };
}

export const DEFAULT_RANGE = todayRange();
