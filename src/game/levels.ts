import type { Breakpoint, LevelDefinition, Quantity, TracePoint } from '../types'

export const sampleLevel: LevelDefinition = {
  id: 'ant-velocity-01',
  title: 'Ant Sprint',
  prompt:
    'Match the target velocity graph by pressing the acceleration pedal, coasting at zero, then braking into the dip before the finish.',
  durationSeconds: 16,
  targetQuantity: 'velocity',
  breakpoints: [
    { t: 0, y: 0 },
    { t: 2, y: 4 },
    { t: 5, y: 4 },
    { t: 10, y: -1 },
    { t: 16, y: 2 },
  ],
  initialState: {
    position: 0,
    velocity: 0,
  },
  maxAcceleration: 3,
  scoreBands: {
    bronze: 60,
    silver: 78,
    gold: 90,
  },
}

export function evaluatePiecewiseLinear(breakpoints: Breakpoint[], time: number): number {
  if (breakpoints.length === 0) {
    return 0
  }

  if (time <= breakpoints[0].t) {
    return breakpoints[0].y
  }

  const lastPoint = breakpoints[breakpoints.length - 1]

  if (time >= lastPoint.t) {
    return lastPoint.y
  }

  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const start = breakpoints[index]
    const end = breakpoints[index + 1]

    if (time >= start.t && time <= end.t) {
      const span = end.t - start.t
      const progress = span === 0 ? 0 : (time - start.t) / span
      return start.y + (end.y - start.y) * progress
    }
  }

  return lastPoint.y
}

export function sampleTargetTrace(
  level: LevelDefinition,
  quantity: Quantity,
  timeStep = 1 / 60,
): TracePoint[] {
  const samples: TracePoint[] = []
  const cappedStep = Math.max(0.01, timeStep)

  for (let time = 0; time < level.durationSeconds; time += cappedStep) {
    samples.push({
      t: time,
      y: quantity === level.targetQuantity ? evaluatePiecewiseLinear(level.breakpoints, time) : 0,
    })
  }

  samples.push({
    t: level.durationSeconds,
    y:
      quantity === level.targetQuantity
        ? evaluatePiecewiseLinear(level.breakpoints, level.durationSeconds)
        : 0,
  })

  return samples
}
