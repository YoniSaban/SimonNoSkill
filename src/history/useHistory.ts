import { useCallback, useRef, useState } from 'react'
import {
  clearHistory,
  createResult,
  loadHistory,
  saveHistory,
  withResult,
  type GameResult,
  type Outcome,
} from './historyStorage'

/**
 * Saved game results plus the outcome of the last storage operation of each kind.
 * The list shown is always what is actually stored: a result that failed to save
 * is not displayed, and a failed delete leaves the list in place.
 */
export function useHistory() {
  const [initial] = useState(loadHistory)
  const [results, setResults] = useState<GameResult[]>(initial.results)
  const [loadFailed, setLoadFailed] = useState(initial.error)
  const [saveFailed, setSaveFailed] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  // Read synchronously so two saves in a row never build on a stale list.
  const resultsRef = useRef(results)

  const add = useCallback((outcome: Outcome, completedRounds: number) => {
    const next = withResult(resultsRef.current, createResult(outcome, completedRounds))
    if (!saveHistory(next)) {
      setSaveFailed(true)
      return
    }
    resultsRef.current = next
    setResults(next)
    setSaveFailed(false)
    // A successful write replaced whatever unreadable data was there before.
    setLoadFailed(false)
  }, [])

  const clear = useCallback(() => {
    if (!clearHistory()) {
      setDeleteFailed(true)
      return
    }
    resultsRef.current = []
    setResults([])
    setDeleteFailed(false)
    setLoadFailed(false)
  }, [])

  return { results, loadFailed, saveFailed, deleteFailed, add, clear }
}

export type HistoryApi = ReturnType<typeof useHistory>
