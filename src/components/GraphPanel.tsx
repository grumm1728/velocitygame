import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import type { Breakpoint, TracePoint } from '../types'

type Domain = {
  min: number
  max: number
}

type GraphDrawingProps = {
  enabled: boolean
  previewTrace: TracePoint[]
  onDrawStart: (point: Breakpoint) => void
  onDrawMove: (point: Breakpoint) => void
  onDrawEnd: () => void
}

type GraphPanelProps = {
  title: string
  unitLabel: string
  duration: number
  currentTime: number
  playerTrace: TracePoint[]
  targetTrace?: TracePoint[]
  accentColor: string
  actions?: ReactNode
  fixedDomain?: Domain
  drawing?: GraphDrawingProps
}

const WIDTH = 760
const HEIGHT = 180
const PADDING_X = 48
const PADDING_Y = 18

function getYDomain(playerTrace: TracePoint[], targetTrace?: TracePoint[]): Domain {
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

function convertPointerToGraphPoint(
  event: PointerEvent<SVGSVGElement>,
  duration: number,
  domain: Domain,
): Breakpoint {
  const bounds = event.currentTarget.getBoundingClientRect()
  const usableWidth = bounds.width - (PADDING_X / WIDTH) * bounds.width * 2
  const usableHeight = bounds.height - (PADDING_Y / HEIGHT) * bounds.height * 2
  const left = bounds.left + (PADDING_X / WIDTH) * bounds.width
  const top = bounds.top + (PADDING_Y / HEIGHT) * bounds.height
  const x = Math.min(Math.max(event.clientX - left, 0), usableWidth)
  const y = Math.min(Math.max(event.clientY - top, 0), usableHeight)
  const time = (x / usableWidth) * duration
  const value = domain.max - (y / usableHeight) * (domain.max - domain.min || 1)

  return { t: time, y: value }
}

export function GraphPanel({
  title,
  unitLabel,
  duration,
  currentTime,
  playerTrace,
  targetTrace,
  accentColor,
  actions,
  fixedDomain,
  drawing,
}: GraphPanelProps) {
  const domain = fixedDomain ?? getYDomain(playerTrace, targetTrace)
  const { min, max } = domain
  const currentX = PADDING_X + (currentTime / duration) * (WIDTH - PADDING_X * 2)
  const ticks = Array.from({ length: Math.floor(duration) + 1 }, (_, index) => index)
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) / 4) * index)
  const zeroY = HEIGHT - PADDING_Y - ((0 - min) / (max - min || 1)) * (HEIGHT - PADDING_Y * 2)

  return (
    <section className={`graph-panel ${drawing?.enabled ? 'graph-panel--drawing' : ''}`}>
      <header className="graph-panel__header">
        <div>
          <p className="graph-panel__eyebrow">{title}</p>
          <h3>{unitLabel}</h3>
        </div>
        {actions ? <div className="graph-panel__actions">{actions}</div> : null}
      </header>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="graph-panel__svg"
        aria-label={`${title} graph`}
        onPointerDown={(event) => {
          if (!drawing?.enabled) {
            return
          }

          event.currentTarget.setPointerCapture(event.pointerId)
          drawing.onDrawStart(convertPointerToGraphPoint(event, duration, domain))
        }}
        onPointerMove={(event) => {
          if (!drawing?.enabled || (event.buttons & 1) === 0) {
            return
          }

          drawing.onDrawMove(convertPointerToGraphPoint(event, duration, domain))
        }}
        onPointerUp={() => {
          if (!drawing?.enabled) {
            return
          }

          drawing.onDrawEnd()
        }}
      >
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

        {zeroY >= PADDING_Y && zeroY <= HEIGHT - PADDING_Y ? (
          <line x1={PADDING_X} y1={zeroY} x2={WIDTH - PADDING_X} y2={zeroY} className="graph-panel__axis" />
        ) : null}

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

        {drawing?.previewTrace && drawing.previewTrace.length > 1 ? (
          <path d={linePath(drawing.previewTrace, duration, min, max)} className="graph-panel__draft" />
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
