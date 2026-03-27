const MAX_ANGLE = 90

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function angleToPedalValue(clientX: number, clientY: number, element: HTMLDivElement) {
  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2 + rect.height * 0.1
  const dx = clientX - centerX
  const dy = clientY - centerY
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI

  return clamp(angle / MAX_ANGLE, -1, 1)
}

export { MAX_ANGLE }
