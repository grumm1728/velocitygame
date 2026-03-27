export type Quantity = 'position' | 'velocity' | 'acceleration'

export type Breakpoint = {
  t: number
  y: number
}

export type ScoreBands = {
  bronze: number
  silver: number
  gold: number
}

export type LevelDefinition = {
  id: string
  title: string
  prompt: string
  durationSeconds: number
  targetQuantity: Quantity
  breakpoints: Breakpoint[]
  initialState: {
    position: number
    velocity: number
  }
  maxAcceleration: number
  scoreBands: ScoreBands
}

export type SimulationState = {
  time: number
  position: number
  velocity: number
  acceleration: number
}

export type ControlInput = {
  normalized: number
  acceleration: number
}

export type TracePoint = {
  t: number
  y: number
}

export type RunFeedbackTag =
  | 'Too fast early'
  | 'Too slow early'
  | 'Braked too late'
  | 'Braked too hard'
  | 'Great pacing'

export type RunResult = {
  playerTrace: TracePoint[]
  targetTrace: TracePoint[]
  integratedError: number
  normalizedScore: number
  feedbackTags: RunFeedbackTag[]
}
