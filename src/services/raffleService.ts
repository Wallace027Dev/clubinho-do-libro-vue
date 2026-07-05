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

export function getCurrentMonthKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit'
  }).format(date)
}

export function getNextMonthLabel(date = new Date()): string {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  }).format(nextMonth)
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  }).format(date)
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

  return reduceMotion ? 120 : 3600
}

export function vibrate(pattern: number | number[]) {
  if ('vibrate' in window.navigator) {
    window.navigator.vibrate(pattern)
  }
}
