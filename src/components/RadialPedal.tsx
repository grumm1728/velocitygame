import { useEffect, useRef, useState } from 'react'
import { angleToPedalValue, MAX_ANGLE } from '../game/input'

type RadialPedalProps = {
  value: number
  onChange: (nextValue: number) => void
  onStartInteraction: () => void
  disabled?: boolean
}

export function RadialPedal({ value, onChange, onStartInteraction, disabled = false }: RadialPedalProps) {
  const pedalRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isDragging) {
      return undefined
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!pedalRef.current) {
        return
      }

      onChange(angleToPedalValue(event.clientX, event.clientY, pedalRef.current))
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      onChange(0)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, onChange])

  const needleAngle = value * MAX_ANGLE

  return (
    <section className="pedal-card">
      <div className="pedal-card__header">
        <p className="pedal-card__eyebrow">Acceleration Pedal</p>
        <strong>
          {value >= 0 ? '+' : ''}
          {value.toFixed(2)} input
        </strong>
      </div>

      <div
        ref={pedalRef}
        className={`pedal ${disabled ? 'pedal--disabled' : ''}`}
        onPointerDown={(event) => {
          if (disabled || !pedalRef.current) {
            return
          }

          setIsDragging(true)
          onStartInteraction()
          onChange(angleToPedalValue(event.clientX, event.clientY, pedalRef.current))
        }}
        role="slider"
        aria-label="Acceleration pedal"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={Number(value.toFixed(2))}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="pedal__arc" />
        <div className="pedal__center" />
        <div className="pedal__needle" style={{ transform: `translateX(-50%) rotate(${needleAngle}deg)` }} />
        <span className="pedal__label pedal__label--negative">Brake</span>
        <span className="pedal__label pedal__label--neutral">Coast</span>
        <span className="pedal__label pedal__label--positive">Push</span>
      </div>
    </section>
  )
}
