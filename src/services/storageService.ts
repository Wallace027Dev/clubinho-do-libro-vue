import type { PersistedRaffleState } from '../types/book'

const STORAGE_KEY = 'clubinho-do-libro:raffle-state'

export function loadRaffleState(): PersistedRaffleState | null {
  const rawState = window.localStorage.getItem(STORAGE_KEY)

  if (!rawState) {
    return null
  }

  try {
    return JSON.parse(rawState) as PersistedRaffleState
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveRaffleState(state: PersistedRaffleState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
