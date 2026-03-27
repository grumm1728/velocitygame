import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { GraphPanel } from './components/GraphPanel'
import { RadialPedal } from './components/RadialPedal'
import { sampleLevel, sampleTargetTrace } from './game/levels'
import { buildRunResult } from './game/scoring'
import {
  FIXED_TIMESTEP_SECONDS,
  appendTracePoint,
  createInitialSimulationState,
  integrateSimulationStep,
} from './game/simulation'
import type { RunResult, SimulationState, TracePoint } from './types'

type RunStatus = 'ready' | 'running' | 'finished'

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

export default function App() {
  const level = sampleLevel
  const targetVelocityTrace = useMemo(() => sampleTargetTrace(level, 'velocity'), [level])
  const initialState = useMemo(() => createInitialSimulationState(level), [level])
  const [status, setStatus] = useState<RunStatus>('ready')
  const [controlValue, setControlValue] = useState(0)
  const [simulationState, setSimulationState] = useState<SimulationState>(initialState)
  const [velocityTrace, setVelocityTrace] = useState<TracePoint[]>(() => [{ t: 0, y: initialState.velocity }])
  const [accelerationTrace, setAccelerationTrace] = useState<TracePoint[]>(() => [{ t: 0, y: 0 }])
  const [positionTrace, setPositionTrace] = useState<TracePoint[]>(() => [{ t: 0, y: initialState.position }])
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const controlValueRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const simStateRef = useRef(initialState)
  const velocityTraceRef = useRef<TracePoint[]>([{ t: 0, y: initialState.velocity }])
  const accelerationTraceRef = useRef<TracePoint[]>([{ t: 0, y: 0 }])
  const positionTraceRef = useRef<TracePoint[]>([{ t: 0, y: initialState.position }])
  const statusRef = useRef<RunStatus>('ready')

  const resetRun = () => {
    const resetState = createInitialSimulationState(level)
    const traces = buildInitialTraces(resetState)

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = null
    lastFrameRef.current = null
    accumulatorRef.current = 0
    controlValueRef.current = 0
    setControlValue(0)
    setStatus('ready')
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

  const startRun = () => {
    if (statusRef.current === 'running') {
      return
    }

    if (statusRef.current === 'finished') {
      resetRun()
    }

    setStatus('running')
    statusRef.current = 'running'
    lastFrameRef.current = null
    accumulatorRef.current = 0
    animationFrameRef.current = requestAnimationFrame(runFrame)
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const progress = simulationState.time / level.durationSeconds

  return (
    <main className="app-shell">
      <div className="app-shell__glow app-shell__glow--left" />
      <div className="app-shell__glow app-shell__glow--right" />

      <section className="hero-card">
        <div className="hero-card__copy">
          <p className="hero-card__eyebrow">Calculus Motion Lab</p>
          <h1>Control acceleration and draw the velocity story live.</h1>
          <p className="hero-card__summary">{level.prompt}</p>
        </div>

        <div className="hero-card__actions">
          <button type="button" className="button button--primary" onClick={() => startRun()}>
            {status === 'ready' ? 'Start run' : status === 'running' ? 'Running...' : 'Restart level'}
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
            <p>Hold clockwise for positive acceleration, release to coast, and drag left to brake.</p>
          </div>

          <GraphPanel
            title="Target vs Player"
            unitLabel="Velocity"
            duration={level.durationSeconds}
            currentTime={simulationState.time}
            playerTrace={velocityTrace}
            targetTrace={targetVelocityTrace}
            accentColor="#ff8a5b"
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
            disabled={status === 'finished'}
            onStartInteraction={() => startRun()}
            onChange={(nextValue) => {
              controlValueRef.current = nextValue
              setControlValue(nextValue)
            }}
          />

          <section className="score-card">
            <p className="score-card__eyebrow">Mission</p>
            <h2>{level.title}</h2>
            <p className="score-card__summary">
              Match the white target velocity trace. Your orange line should rise, plateau, dip, and recover at the
              finish.
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
                <strong className="results-card__score">--</strong>
                <span className="results-card__medal">Score appears at the finish</span>
                <p className="results-card__error">Try accelerating hard for 2 seconds, coasting, then braking.</p>
              </>
            )}
          </section>
        </aside>
      </section>
    </main>
  )
}
