import { describe, expect, it } from 'vitest'
import { sampleLevel } from './levels'
import { createInitialSimulationState, integrateSimulationStep } from './simulation'

describe('integrateSimulationStep', () => {
  it('keeps velocity constant when acceleration is zero', () => {
    const state = createInitialSimulationState(sampleLevel)
    const next = integrateSimulationStep({ ...state, velocity: 3 }, 0, 2)

    expect(next.velocity).toBe(3)
    expect(next.position).toBe(6)
  })

  it('applies positive acceleration exactly over the step', () => {
    const state = createInitialSimulationState(sampleLevel)
    const next = integrateSimulationStep(state, 2, 3)

    expect(next.velocity).toBe(6)
    expect(next.position).toBe(9)
  })

  it('applies negative acceleration correctly', () => {
    const state = createInitialSimulationState(sampleLevel)
    const next = integrateSimulationStep({ ...state, velocity: 5 }, -2, 2)

    expect(next.velocity).toBe(1)
    expect(next.position).toBe(6)
  })
})
