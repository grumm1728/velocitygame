import { describe, expect, it } from 'vitest'
import { evaluatePiecewiseLinear, sampleLevel } from './levels'

describe('evaluatePiecewiseLinear', () => {
  it('returns exact breakpoint values', () => {
    expect(evaluatePiecewiseLinear(sampleLevel.breakpoints, 0)).toBe(0)
    expect(evaluatePiecewiseLinear(sampleLevel.breakpoints, 2)).toBe(4)
    expect(evaluatePiecewiseLinear(sampleLevel.breakpoints, 10)).toBe(-1)
  })

  it('interpolates within a segment', () => {
    expect(evaluatePiecewiseLinear(sampleLevel.breakpoints, 1)).toBe(2)
    expect(evaluatePiecewiseLinear(sampleLevel.breakpoints, 7.5)).toBe(1.5)
  })
})
