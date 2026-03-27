import type { LevelDefinition, SimulationState, TracePoint } from '../types'

export const FIXED_TIMESTEP_SECONDS = 1 / 60

export function createInitialSimulationState(level: LevelDefinition): SimulationState {
  return {
    time: 0,
    position: level.initialState.position,
    velocity: level.initialState.velocity,
    acceleration: 0,
  }
}

export function integrateSimulationStep(
  state: SimulationState,
  acceleration: number,
  timeStep: number,
): SimulationState {
  const velocity = state.velocity + acceleration * timeStep
  const position = state.position + state.velocity * timeStep + 0.5 * acceleration * timeStep * timeStep

  return {
    time: state.time + timeStep,
    position,
    velocity,
    acceleration,
  }
}

export function appendTracePoint(trace: TracePoint[], point: TracePoint): TracePoint[] {
  if (trace.length >= 1500) {
    return [...trace.slice(trace.length - 1499), point]
  }

  return [...trace, point]
}
