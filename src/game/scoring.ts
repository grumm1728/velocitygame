import type { LevelDefinition, RunFeedbackTag, RunResult, TracePoint } from '../types'
import { evaluatePiecewiseLinear } from './levels'

export function calculateNormalizedScore(error: number, level: LevelDefinition): number {
  const targetValues = level.breakpoints.map((point) => point.y)
  const targetSpread = Math.max(...targetValues) - Math.min(...targetValues)
  const normalizationArea = level.durationSeconds * Math.max(targetSpread + 2, level.maxAcceleration * 2.5)
  const score = 100 * (1 - error / normalizationArea)

  return Math.max(0, Math.min(100, score))
}

export function buildFeedbackTags(
  sampleErrors: Array<{ t: number; signedError: number }>,
): RunFeedbackTag[] {
  if (sampleErrors.length === 0) {
    return ['Great pacing']
  }

  const midpoint = sampleErrors[sampleErrors.length - 1].t / 2
  const firstHalf = sampleErrors.filter((sample) => sample.t <= midpoint)
  const secondHalf = sampleErrors.filter((sample) => sample.t > midpoint)

  const average = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length

  const earlyAverage = average(firstHalf.map((sample) => sample.signedError))
  const lateAverage = average(secondHalf.map((sample) => sample.signedError))
  const tags: RunFeedbackTag[] = []

  if (earlyAverage > 0.5) {
    tags.push('Too fast early')
  } else if (earlyAverage < -0.5) {
    tags.push('Too slow early')
  }

  if (lateAverage > 0.5) {
    tags.push('Braked too late')
  } else if (lateAverage < -0.5) {
    tags.push('Braked too hard')
  }

  if (tags.length === 0) {
    tags.push('Great pacing')
  }

  return tags
}

export function buildRunResult(level: LevelDefinition, playerTrace: TracePoint[]): RunResult {
  let integratedError = 0
  const sampleErrors: Array<{ t: number; signedError: number }> = []

  for (let index = 1; index < playerTrace.length; index += 1) {
    const previous = playerTrace[index - 1]
    const current = playerTrace[index]
    const deltaTime = current.t - previous.t
    const targetValue = evaluatePiecewiseLinear(level.breakpoints, current.t)
    const signedError = current.y - targetValue

    integratedError += Math.abs(signedError) * deltaTime
    sampleErrors.push({ t: current.t, signedError })
  }

  return {
    playerTrace,
    targetTrace: playerTrace.map((sample) => ({
      t: sample.t,
      y: evaluatePiecewiseLinear(level.breakpoints, sample.t),
    })),
    integratedError,
    normalizedScore: calculateNormalizedScore(integratedError, level),
    feedbackTags: buildFeedbackTags(sampleErrors),
  }
}
