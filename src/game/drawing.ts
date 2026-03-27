import type { Breakpoint } from '../types'

type Domain = {
  min: number
  max: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getBreakpointDomain(breakpoints: Breakpoint[], padding = 1.2): Domain {
  const values = breakpoints.map((point) => point.y)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return {
    min: Math.min(min - padding, -padding),
    max: Math.max(max + padding, padding),
  }
}

export function smoothDrawnBreakpoints(
  points: Breakpoint[],
  durationSeconds: number,
  domain: Domain,
  smoothingPasses = 2,
): Breakpoint[] {
  if (points.length < 2) {
    return [
      { t: 0, y: 0 },
      { t: durationSeconds, y: 0 },
    ]
  }

  const sortedPoints = [...points]
    .sort((left, right) => left.t - right.t)
    .map((point) => ({
      t: clamp(point.t, 0, durationSeconds),
      y: clamp(point.y, domain.min, domain.max),
    }))

  let smoothed = sortedPoints

  for (let pass = 0; pass < smoothingPasses; pass += 1) {
    smoothed = smoothed.map((point, index) => {
      if (index === 0 || index === smoothed.length - 1) {
        return point
      }

      const previous = smoothed[index - 1]
      const next = smoothed[index + 1]

      return {
        t: point.t,
        y: clamp((previous.y + point.y * 2 + next.y) / 4, domain.min, domain.max),
      }
    })
  }

  const merged: Breakpoint[] = []

  for (const point of smoothed) {
    const lastPoint = merged[merged.length - 1]

    if (lastPoint && Math.abs(lastPoint.t - point.t) < 0.12) {
      lastPoint.y = (lastPoint.y + point.y) / 2
      continue
    }

    merged.push(point)
  }

  if (merged[0].t > 0) {
    merged.unshift({ t: 0, y: merged[0].y })
  } else {
    merged[0] = { ...merged[0], t: 0 }
  }

  const lastPoint = merged[merged.length - 1]

  if (lastPoint.t < durationSeconds) {
    merged.push({ t: durationSeconds, y: lastPoint.y })
  } else {
    merged[merged.length - 1] = { ...lastPoint, t: durationSeconds }
  }

  return merged
}
