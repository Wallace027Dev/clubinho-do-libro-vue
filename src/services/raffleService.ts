export function getRandomIndex(length: number): number {
  if (length <= 0) {
    throw new Error('Cannot draw from an empty list.')
  }

  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1)
    window.crypto.getRandomValues(values)
    return values[0] % length
  }

  return Math.floor(Math.random() * length)
}

function getRandomColorValue(): number {
  if (window.crypto?.getRandomValues) {
    const values = new Uint8Array(1)
    window.crypto.getRandomValues(values)
    return values[0]
  }

  return Math.floor(Math.random() * 256)
}

export function getRandomRgbColor(): string {
  const red = getRandomColorValue()
  const green = getRandomColorValue()
  const blue = getRandomColorValue()

  return `rgb(${red}, ${green}, ${blue})`
}

export function calculateWinnerRotation(
  winnerIndex: number,
  totalBooks: number,
  currentRotation: number
): number {
  const segmentSize = 360 / totalBooks
  const winnerCenter = winnerIndex * segmentSize + segmentSize / 2
  const pointerOffset = 360 - winnerCenter
  const normalizedRotation = currentRotation % 360
  const fullTurns = 5 * 360

  return currentRotation + fullTurns + pointerOffset - normalizedRotation
}

export function getSpinDurationMs(): number {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return reduceMotion ? 120 : 5600
}

export function vibrate(pattern: number | number[]) {
  if ('vibrate' in window.navigator) {
    window.navigator.vibrate(pattern)
  }
}
