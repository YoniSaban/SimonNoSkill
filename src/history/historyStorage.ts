import { TOTAL_ROUNDS } from '../game/constants'

export const HISTORY_KEY = 'simon.history.v1'
export const MAX_RESULTS = 10

export type Outcome = 'win' | 'loss'

export type GameResult = {
  /** Local id, from time + random (crypto.randomUUID is missing on insecure origins). */
  id: string
  /** ISO 8601, full time. Formatted only for display. */
  finishedAt: string
  /** Stages completed successfully, 0..TOTAL_ROUNDS. */
  completedRounds: number
  outcome: Outcome
}

type HistoryData = {
  schemaVersion: 1
  results: GameResult[]
}

export type LoadedHistory = {
  /** Newest first, at most MAX_RESULTS. */
  results: GameResult[]
  /** Stored data exists but could not be read (blocked storage, bad JSON, other schema). */
  error: boolean
}

function isGameResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= TOTAL_ROUNDS &&
    (r.outcome === 'win' || r.outcome === 'loss')
  )
}

function newestFirst(results: GameResult[]): GameResult[] {
  return [...results].sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
}

/** Never throws. Invalid records are dropped; unreadable data is reported as an error. */
export function loadHistory(): LoadedHistory {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (raw === null) return { results: [], error: false }
    const data = JSON.parse(raw) as Partial<HistoryData> | null
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.results)) {
      return { results: [], error: true }
    }
    return {
      results: newestFirst(data.results.filter(isGameResult)).slice(0, MAX_RESULTS),
      error: false,
    }
  } catch {
    return { results: [], error: true }
  }
}

/** Never throws; false when the list could not be written. */
export function saveHistory(results: GameResult[]): boolean {
  try {
    const data: HistoryData = { schemaVersion: 1, results: results.slice(0, MAX_RESULTS) }
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/** Never throws; false when the stored history could not be removed. */
export function clearHistory(): boolean {
  try {
    window.localStorage.removeItem(HISTORY_KEY)
    return true
  } catch {
    return false
  }
}

/** New list with `result` first, keeping only the newest MAX_RESULTS. */
export function withResult(results: GameResult[], result: GameResult): GameResult[] {
  return [result, ...results].slice(0, MAX_RESULTS)
}

export function createResult(outcome: Outcome, completedRounds: number, now = new Date()): GameResult {
  return {
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    finishedAt: now.toISOString(),
    completedRounds,
    outcome,
  }
}
