import { describe, expect, it } from 'vitest'
import { sampleLevel } from './levels'
import { buildRunResult } from './scoring'

describe('buildRunResult', () => {
  it('gives a perfect score to an exact trace', () => {
    const trace = sampleLevel.breakpoints.map((point) => ({ t: point.t, y: point.y }))
    const result = buildRunResult(sampleLevel, trace)

    expect(result.integratedError).toBe(0)
    expect(result.normalizedScore).toBe(100)
  })

  it('reduces score when the player stays above the target', () => {
    const trace = sampleLevel.breakpoints.map((point) => ({ t: point.t, y: point.y + 1 }))
    const result = buildRunResult(sampleLevel, trace)

    expect(result.integratedError).toBeGreaterThan(0)
    expect(result.normalizedScore).toBeLessThan(100)
    expect(result.feedbackTags).toContain('Too fast early')
  })
})
