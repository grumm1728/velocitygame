import type { CSSProperties } from 'react'
import type { TracePoint } from '../types'

type GraphPanelProps = {
  title: string
  unitLabel: string
  duration: number
  currentTime: number
  playerTrace: TracePoint[]
  targetTrace?: TracePoint[]
  accentColor: string
}

const WIDTH = 760
const HEIGHT = 180
const PADDING_X = 48
const PADDING_Y = 18

function getYDomain(playerTrace: TracePoint[], targetTrace?: TracePoint[]) {
  const values = [...playerTrace, ...(targetTrace ?? [])].map((point) => point.y)

  if (values.length === 0) {
    return { min: -1, max: 1 }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max(0.8, (max - min) * 0.18 || 1)

  return {
    min: min - padding,
    max: max + padding,
  }
}

function linePath(trace: TracePoint[], duration: number, minY: number, maxY: number): string {
  if (trace.length === 0) {
    return ''
  }

  const usableWidth = WIDTH - PADDING_X * 2
  const usableHeight = HEIGHT - PADDING_Y * 2
  const range = maxY - minY || 1

  return trace
    .map((point, index) => {
      const x = PADDING_X + (point.t / duration) * usableWidth
      const y = HEIGHT - PADDING_Y - ((point.y - minY) / range) * usableHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export function GraphPanel({
  title,
  unitLabel,
  duration,
  currentTime,
  playerTrace,
  targetTrace,
  accentColor,
}: GraphPanelProps) {
  const { min, max } = getYDomain(playerTrace, targetTrace)
  const currentX = PADDING_X + (currentTime / duration) * (WIDTH - PADDING_X * 2)
  const ticks = Array.from({ length: Math.floor(duration) + 1 }, (_, index) => index)
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) / 4) * index)

  return (
    <section className="graph-panel">
      <header className="graph-panel__header">
        <div>
          <p className="graph-panel__eyebrow">{title}</p>
          <h3>{unitLabel}</h3>
        </div>
      </header>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="graph-panel__svg" aria-label={`${title} graph`}>
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="24" className="graph-panel__background" />

        {ticks.map((tick) => {
          const x = PADDING_X + (tick / duration) * (WIDTH - PADDING_X * 2)
          return (
            <g key={`x-${tick}`}>
              <line x1={x} y1={PADDING_Y} x2={x} y2={HEIGHT - PADDING_Y} className="graph-panel__grid" />
              <text x={x} y={HEIGHT - 4} className="graph-panel__label graph-panel__label--x">
                {tick}
              </text>
            </g>
          )
        })}

        {yTicks.map((tick) => {
          const y = HEIGHT - PADDING_Y - ((tick - min) / (max - min || 1)) * (HEIGHT - PADDING_Y * 2)
          return (
            <g key={`y-${tick.toFixed(2)}`}>
              <line x1={PADDING_X} y1={y} x2={WIDTH - PADDING_X} y2={y} className="graph-panel__grid" />
              <text x={8} y={y + 4} className="graph-panel__label">
                {tick.toFixed(1)}
              </text>
            </g>
          )
        })}

        {targetTrace && targetTrace.length > 1 ? (
          <path d={linePath(targetTrace, duration, min, max)} className="graph-panel__target" />
        ) : null}

        {playerTrace.length > 1 ? (
          <path
            d={linePath(playerTrace, duration, min, max)}
            className="graph-panel__player"
            style={{ '--graph-accent': accentColor } as CSSProperties}
          />
        ) : null}

        <line
          x1={currentX}
          y1={PADDING_Y}
          x2={currentX}
          y2={HEIGHT - PADDING_Y}
          className="graph-panel__cursor"
        />
      </svg>
    </section>
  )
}
