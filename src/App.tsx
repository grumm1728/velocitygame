import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { GraphPanel } from './components/GraphPanel'
import { RadialPedal } from './components/RadialPedal'
import { getBreakpointDomain, smoothDrawnBreakpoints } from './game/drawing'
import { sampleLevel, sampleTargetTrace } from './game/levels'
import { buildRunResult } from './game/scoring'
import {
  FIXED_TIMESTEP_SECONDS,
  appendTracePoint,
  createInitialSimulationState,
  integrateSimulationStep,
} from './game/simulation'
import type { Breakpoint, LevelDefinition, RunResult, SimulationState, TracePoint } from './types'

type RunStatus = 'ready' | 'countdown' | 'running' | 'finished'

function formatNumber(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function getMedal(score: number) {
  if (score >= sampleLevel.scoreBands.gold) {
    return 'Gold'
  }

  if (score >= sampleLevel.scoreBands.silver) {
    return 'Silver'
  }

  if (score >= sampleLevel.scoreBands.bronze) {
    return 'Bronze'
  }

  return 'Keep practicing'
}

function buildInitialTraces(initialState: SimulationState) {
  return {
    velocity: [{ t: 0, y: initialState.velocity }],
    acceleration: [{ t: 0, y: 0 }],
    position: [{ t: 0, y: initialState.position }],
  }
}

function buildLevel(targetBreakpoints: Breakpoint[]): LevelDefinition {
  return {
    ...sampleLevel,
    breakpoints: targetBreakpoints,
  }
}

export default function App() {
  const [targetBreakpoints, setTargetBreakpoints] = useState<Breakpoint[]>(sampleLevel.breakpoints)
  const [status, setStatus] = useState<RunStatus>('ready')
  const [countdownValue, setCountdownValue] = useState<number | null>(null)
  const [controlValue, setControlValue] = useState(0)
  const [isDrawingTarget, setIsDrawingTarget] = useState(false)
  const [draftBreakpoints, setDraftBreakpoints] = useState<Breakpoint[]>([])
  const level = useMemo(() => buildLevel(targetBreakpoints), [targetBreakpoints])
  const targetVelocityTrace = useMemo(() => sampleTargetTrace(level, 'velocity'), [level])
  const drawingDomain = useMemo(() => getBreakpointDomain(targetBreakpoints), [targetBreakpoints])
  const draftTrace = useMemo(
    () => (draftBreakpoints.length > 1 ? sampleTargetTrace(buildLevel(draftBreakpoints), 'velocity') : []),
    [draftBreakpoints],
  )
  const initialState = useMemo(() => createInitialSimulationState(level), [level])
  const [simulationState, setSimulationState] = useState<SimulationState>(initialState)
  const [velocityTrace, setVelocityTrace] = useState<TracePoint[]>(() => [{ t: 0, y: initialState.velocity }])
  const [accelerationTrace, setAccelerationTrace] = useState<TracePoint[]>(() => [{ t: 0, y: 0 }])
  const [positionTrace, setPositionTrace] = useState<TracePoint[]>(() => [{ t: 0, y: initialState.position }])
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const controlValueRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const simStateRef = useRef(initialState)
  const velocityTraceRef = useRef<TracePoint[]>([{ t: 0, y: initialState.velocity }])
  const accelerationTraceRef = useRef<TracePoint[]>([{ t: 0, y: 0 }])
  const positionTraceRef = useRef<TracePoint[]>([{ t: 0, y: initialState.position }])
  const statusRef = useRef<RunStatus>('ready')
  const drawnPointsRef = useRef<Breakpoint[]>([])

  const clearCountdown = () => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  const resetRun = (nextLevel: LevelDefinition = level) => {
    const resetState = createInitialSimulationState(nextLevel)
    const traces = buildInitialTraces(resetState)

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    clearCountdown()
    animationFrameRef.current = null
    lastFrameRef.current = null
    accumulatorRef.current = 0
    controlValueRef.current = 0
    setControlValue(0)
    setStatus('ready')
    setCountdownValue(null)
    setRunResult(null)
    setSimulationState(resetState)
    setVelocityTrace(traces.velocity)
    setAccelerationTrace(traces.acceleration)
    setPositionTrace(traces.position)
    simStateRef.current = resetState
    velocityTraceRef.current = traces.velocity
    accelerationTraceRef.current = traces.acceleration
    positionTraceRef.current = traces.position
    statusRef.current = 'ready'
  }

  const finishRun = () => {
    const result = buildRunResult(level, velocityTraceRef.current)
    setStatus('finished')
    statusRef.current = 'finished'
    setRunResult(result)
    setControlValue(0)
    controlValueRef.current = 0
    setCountdownValue(null)

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  const stepSimulation = () => {
    if (statusRef.current !== 'running') {
      return
    }

    const nextAcceleration = controlValueRef.current * level.maxAcceleration
    const nextState = integrateSimulationStep(simStateRef.current, nextAcceleration, FIXED_TIMESTEP_SECONDS)
    const clampedState =
      nextState.time >= level.durationSeconds
        ? { ...nextState, time: level.durationSeconds }
        : nextState

    const nextVelocityTrace = appendTracePoint(velocityTraceRef.current, {
      t: clampedState.time,
      y: clampedState.velocity,
    })
    const nextAccelerationTrace = appendTracePoint(accelerationTraceRef.current, {
      t: clampedState.time,
      y: clampedState.acceleration,
    })
    const nextPositionTrace = appendTracePoint(positionTraceRef.current, {
      t: clampedState.time,
      y: clampedState.position,
    })

    simStateRef.current = clampedState
    velocityTraceRef.current = nextVelocityTrace
    accelerationTraceRef.current = nextAccelerationTrace
    positionTraceRef.current = nextPositionTrace

    setSimulationState(clampedState)
    setVelocityTrace(nextVelocityTrace)
    setAccelerationTrace(nextAccelerationTrace)
    setPositionTrace(nextPositionTrace)

    if (clampedState.time >= level.durationSeconds) {
      finishRun()
    }
  }

  function runFrame(frameTime: number) {
    if (statusRef.current !== 'running') {
      return
    }

    if (lastFrameRef.current === null) {
      lastFrameRef.current = frameTime
    }

    const elapsed = Math.min(0.05, (frameTime - lastFrameRef.current) / 1000)
    lastFrameRef.current = frameTime
    accumulatorRef.current += elapsed

    while (accumulatorRef.current >= FIXED_TIMESTEP_SECONDS && statusRef.current === 'running') {
      stepSimulation()
      accumulatorRef.current -= FIXED_TIMESTEP_SECONDS
    }

    if (statusRef.current === 'running') {
      animationFrameRef.current = requestAnimationFrame(runFrame)
    }
  }

  const beginRunning = () => {
    clearCountdown()
    setStatus('running')
    statusRef.current = 'running'
    setCountdownValue(null)
    lastFrameRef.current = null
    accumulatorRef.current = 0
    animationFrameRef.current = requestAnimationFrame(runFrame)
  }

  const startRun = () => {
    if (statusRef.current === 'running' || statusRef.current === 'countdown' || isDrawingTarget) {
      return
    }

    const freshLevel = buildLevel(targetBreakpoints)

    resetRun(freshLevel)
    setStatus('countdown')
    statusRef.current = 'countdown'
    setCountdownValue(3)

    let nextCount = 3
    countdownIntervalRef.current = window.setInterval(() => {
      nextCount -= 1

      if (nextCount <= 0) {
        beginRunning()
        return
      }

      setCountdownValue(nextCount)
    }, 1000)
  }

  const beginDrawingTarget = () => {
    clearCountdown()
    if (statusRef.current === 'running') {
      return
    }

    setIsDrawingTarget(true)
    setDraftBreakpoints([])
    drawnPointsRef.current = []
  }

  const cancelCustomGraph = () => {
    setIsDrawingTarget(false)
    setDraftBreakpoints([])
    drawnPointsRef.current = []
    setTargetBreakpoints(sampleLevel.breakpoints)
    resetRun(buildLevel(sampleLevel.breakpoints))
  }

  const submitCustomGraph = () => {
    if (draftBreakpoints.length < 2) {
      return
    }

    setIsDrawingTarget(false)
    setTargetBreakpoints(draftBreakpoints)
    resetRun(buildLevel(draftBreakpoints))
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      clearCountdown()
    }
  }, [])

  const progress = simulationState.time / level.durationSeconds
  const isControlDisabled = status !== 'running'
  const hasCustomTarget = targetBreakpoints !== sampleLevel.breakpoints
  const startButtonLabel =
    status === 'countdown'
      ? `Starting in ${countdownValue ?? 3}`
      : status === 'running'
        ? 'Run in progress'
        : status === 'finished'
          ? 'Run again'
          : 'Start run'

  return (
    <main className="app-shell">
      <div className="app-shell__glow app-shell__glow--left" />
      <div className="app-shell__glow app-shell__glow--right" />

      <section className="hero-card">
        <div className="hero-card__copy">
          <p className="hero-card__eyebrow">Calculus Motion Lab</p>
          <h1>Control acceleration. Match the velocity graph.</h1>
          <p className="hero-card__summary">
            Press start for a countdown, then steer acceleration with the pedal while position, velocity, and
            acceleration evolve together.
          </p>
        </div>

        <div className="hero-card__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => startRun()}
            disabled={status === 'countdown' || status === 'running' || isDrawingTarget}
          >
            {startButtonLabel}
          </button>
          <button type="button" className="button button--ghost" onClick={() => resetRun()}>
            Reset
          </button>
        </div>
      </section>

      <section className="dashboard">
        <div className="dashboard__left">
          <div className="stats-grid">
            <article className="stat-card">
              <span>Time</span>
              <strong>
                {simulationState.time.toFixed(2)}s / {level.durationSeconds}s
              </strong>
            </article>
            <article className="stat-card">
              <span>Position</span>
              <strong>{formatNumber(simulationState.position)}</strong>
            </article>
            <article className="stat-card">
              <span>Velocity</span>
              <strong>{formatNumber(simulationState.velocity)}</strong>
            </article>
            <article className="stat-card">
              <span>Acceleration</span>
              <strong>{formatNumber(simulationState.acceleration)}</strong>
            </article>
          </div>

          <div className="timeline-card">
            <div className="timeline-card__bar">
              <div className="timeline-card__fill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
            </div>
            <p>
              {status === 'countdown'
                ? `Countdown: ${countdownValue}`
                : 'Hold clockwise for positive acceleration, release to coast, and drag left to brake.'}
            </p>
          </div>

          <GraphPanel
            title="Target vs Player"
            unitLabel="Velocity"
            duration={level.durationSeconds}
            currentTime={simulationState.time}
            playerTrace={velocityTrace}
            targetTrace={targetVelocityTrace}
            accentColor="#ff8a5b"
            fixedDomain={drawingDomain}
            actions={
              isDrawingTarget ? (
                <>
                  <button
                    type="button"
                    className="button button--graph"
                    onClick={() => submitCustomGraph()}
                    disabled={draftBreakpoints.length < 2}
                  >
                    Submit graph
                  </button>
                  <button type="button" className="button button--ghost button--graph" onClick={() => cancelCustomGraph()}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button button--graph"
                  onClick={() => beginDrawingTarget()}
                  disabled={status === 'running' || status === 'countdown'}
                >
                  Draw new graph
                </button>
              )
            }
            drawing={{
              enabled: isDrawingTarget,
              previewTrace: draftTrace,
              onDrawStart: (point) => {
                drawnPointsRef.current = [point]
                setDraftBreakpoints([point])
              },
              onDrawMove: (point) => {
                drawnPointsRef.current = [...drawnPointsRef.current, point]
                setDraftBreakpoints(drawnPointsRef.current)
              },
              onDrawEnd: () => {
                const smoothed = smoothDrawnBreakpoints(
                  drawnPointsRef.current,
                  level.durationSeconds,
                  drawingDomain,
                )
                drawnPointsRef.current = smoothed
                setDraftBreakpoints(smoothed)
              },
            }}
          />
          <GraphPanel
            title="Player Input"
            unitLabel="Acceleration"
            duration={level.durationSeconds}
            currentTime={simulationState.time}
            playerTrace={accelerationTrace}
            accentColor="#7ce0c3"
          />
          <GraphPanel
            title="Accumulated Motion"
            unitLabel="Position"
            duration={level.durationSeconds}
            currentTime={simulationState.time}
            playerTrace={positionTrace}
            accentColor="#7fb2ff"
          />
        </div>

        <aside className="dashboard__right">
          <RadialPedal
            value={controlValue}
            disabled={isControlDisabled}
            onStartInteraction={() => {}}
            onChange={(nextValue) => {
              controlValueRef.current = nextValue
              setControlValue(nextValue)
            }}
          />

          <section className="score-card">
            <p className="score-card__eyebrow">Mission</p>
            <h2>{hasCustomTarget ? 'Custom Trace' : level.title}</h2>
            <p className="score-card__summary">
              {hasCustomTarget
                ? 'You are matching your own custom velocity curve. Submit another sketch anytime to build a new challenge.'
                : 'Match the white target velocity trace. Your orange line should rise, plateau, dip, and recover at the finish.'}
            </p>

            <div className="score-card__bands">
              <span>Bronze {level.scoreBands.bronze}</span>
              <span>Silver {level.scoreBands.silver}</span>
              <span>Gold {level.scoreBands.gold}</span>
            </div>
          </section>

          <section className="results-card">
            <p className="results-card__eyebrow">Run Result</p>
            {runResult ? (
              <>
                <strong className="results-card__score">{runResult.normalizedScore.toFixed(0)}</strong>
                <span className="results-card__medal">{getMedal(runResult.normalizedScore)}</span>
                <p className="results-card__error">
                  Area error: {runResult.integratedError.toFixed(2)} velocity-seconds
                </p>
                <div className="results-card__tags">
                  {runResult.feedbackTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <strong className="results-card__score">{status === 'countdown' ? countdownValue : '--'}</strong>
                <span className="results-card__medal">
                  {status === 'countdown' ? 'Get ready to launch' : 'Score appears at the finish'}
                </span>
                <p className="results-card__error">
                  {isDrawingTarget
                    ? 'Sketch directly on the velocity graph, release to smooth it, then submit or cancel.'
                    : 'Try accelerating hard for 2 seconds, coasting, then braking.'}
                </p>
              </>
            )}
          </section>
        </aside>
      </section>
    </main>
  )
}
