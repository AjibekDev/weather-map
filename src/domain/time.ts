import type { Frame, FrameKey, LayerId, TimeRange, Timestamp } from './types'

export const HOUR_MS = 60 * 60 * 1000

export const frameKey = (layerId: LayerId, time: Timestamp): FrameKey => `${layerId}:${time}`

export function clampTime(time: Timestamp, steps: readonly Timestamp[]): Timestamp {
  const first = steps[0]
  const last = steps[steps.length - 1]

  if (first === undefined || last === undefined) return time

  return Math.min(Math.max(time, first), last)
}

export function buildSteps({ start, end, stepMs }: TimeRange): Timestamp[] {
  const steps: Timestamp[] = []

  for (let t = start; t <= end; t += stepMs) steps.push(t)

  return steps
}

/** Two time steps surrounding `time` and the position between them (0..1). */
export interface TimeBracket {
  prev: Timestamp
  next: Timestamp
  ratio: number
}

/**
 * Time on the slider can be fractional (between steps) — this is what makes
 * playback smooth. To render it we need the two neighbouring frames.
 * Binary search keeps it O(log n) for long time axes.
 */
export function bracketTime(time: Timestamp, steps: readonly Timestamp[]): TimeBracket {
  const first = steps[0]
  const last = steps[steps.length - 1]

  if (first === undefined || last === undefined) throw new Error('Time axis is empty')

  if (time <= first) return { prev: first, next: first, ratio: 0 }
  if (time >= last) return { prev: last, next: last, ratio: 0 }

  let lo = 0
  let hi = steps.length - 1

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (steps[mid]! <= time) lo = mid
    else hi = mid
  }

  const prev = steps[lo]!
  const next = steps[hi]!

  return { prev, next, ratio: (time - prev) / (next - prev) }
}

export const lerp = (a: number, b: number, ratio: number): number => a + (b - a) * ratio

/** Interpolates angles along the shortest arc (350° → 10° goes through 0°, not 180°). */
export function lerpAngle(a: number, b: number, ratio: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180

  return (a + delta * ratio + 360) % 360
}

/** Builds an intermediate frame. Relies on the "same grid, same order" Frame contract. */
export function interpolateFrames(a: Frame, b: Frame, ratio: number): Frame {
  if (a === b || ratio <= 0) return a
  if (ratio >= 1) return b

  return {
    ...a,
    features: a.features.map((feature, i) => {
      const target = b.features[i]
      if (!target || target.id !== feature.id) return feature

      const from = feature.properties
      const to = target.properties
      const direction =
        from.direction !== undefined && to.direction !== undefined
          ? lerpAngle(from.direction, to.direction, ratio)
          : from.direction

      return {
        ...feature,
        properties: { ...from, value: lerp(from.value, to.value, ratio), direction },
      }
    }),
  }
}
