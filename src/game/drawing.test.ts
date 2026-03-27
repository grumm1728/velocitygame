import { describe, expect, it } from 'vitest'
import { getBreakpointDomain, smoothDrawnBreakpoints } from './drawing'
import { sampleLevel } from './levels'

describe('smoothDrawnBreakpoints', () => {
  it('adds endpoints and keeps values in range', () => {
    const domain = getBreakpointDomain(sampleLevel.breakpoints)
    const result = smoothDrawnBreakpoints(
      [
        { t: 1, y: 10 },
        { t: 4, y: -10 },
      ],
      sampleLevel.durationSeconds,
      domain,
    )

    expect(result[0].t).toBe(0)
    expect(result[result.length - 1].t).toBe(sampleLevel.durationSeconds)
    expect(Math.max(...result.map((point) => point.y))).toBeLessThanOrEqual(domain.max)
    expect(Math.min(...result.map((point) => point.y))).toBeGreaterThanOrEqual(domain.min)
  })

  it('smooths interior points without changing time order', () => {
    const domain = getBreakpointDomain(sampleLevel.breakpoints)
    const result = smoothDrawnBreakpoints(
      [
        { t: 0, y: 0 },
        { t: 2, y: 4 },
        { t: 4, y: -4 },
        { t: 6, y: 4 },
      ],
      sampleLevel.durationSeconds,
      domain,
    )

    expect(result[1].t).toBeGreaterThanOrEqual(result[0].t)
    expect(result[2].t).toBeGreaterThanOrEqual(result[1].t)
    expect(result[2].y).not.toBe(-4)
  })
})
