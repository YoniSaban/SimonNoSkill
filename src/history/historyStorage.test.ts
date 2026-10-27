import {
  clearHistory,
  createResult,
  HISTORY_KEY,
  loadHistory,
  MAX_RESULTS,
  saveHistory,
  withResult,
  type GameResult,
} from './historyStorage'

const at = (minute: number) => new Date(2026, 9, 27, 10, minute)

function results(count: number): GameResult[] {
  let list: GameResult[] = []
  for (let i = 0; i < count; i++) list = withResult(list, createResult('loss', i % 10, at(i)))
  return list
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('historyStorage', () => {
  it('starts empty without an error', () => {
    expect(loadHistory()).toEqual({ results: [], error: false })
  })

  it('saves and reads back, newest first, with versioned data under one key', () => {
    const list = withResult(withResult([], createResult('loss', 3, at(1))), createResult('win', 10, at(2)))
    expect(saveHistory(list)).toBe(true)

    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY)!)
    expect(stored.schemaVersion).toBe(1)
    const loaded = loadHistory()
    expect(loaded.error).toBe(false)
    expect(loaded.results.map((r) => r.outcome)).toEqual(['win', 'loss'])
    expect(loaded.results[0]).toMatchObject({ completedRounds: 10, finishedAt: at(2).toISOString() })
  })

  it('keeps at most 10 results, dropping the oldest when an 11th is added', () => {
    const list = results(11)
    expect(list).toHaveLength(MAX_RESULTS)
    expect(list[0].finishedAt).toBe(at(10).toISOString())
    expect(list[list.length - 1].finishedAt).toBe(at(1).toISOString()) // at(0) was dropped
    saveHistory(list)
    expect(loadHistory().results).toHaveLength(MAX_RESULTS)
  })

  it('reports unreadable data as an error, and the next save writes a valid list', () => {
    localStorage.setItem(HISTORY_KEY, '{not json')
    expect(loadHistory()).toEqual({ results: [], error: true })

    expect(saveHistory(withResult([], createResult('win', 10, at(1))))).toBe(true)
    expect(loadHistory()).toMatchObject({ error: false, results: [{ outcome: 'win' }] })
  })

  it('reports another schema version as an error', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }))
    expect(loadHistory().error).toBe(true)
  })

  it('drops invalid records and keeps the valid ones', () => {
    const good = createResult('loss', 4, at(1))
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        schemaVersion: 1,
        results: [
          good,
          { ...good, id: 'x', completedRounds: 11 },
          { ...good, id: 'y', outcome: 'draw' },
          { ...good, id: 'z', finishedAt: 'yesterday' },
          '<script>',
          null,
        ],
      }),
    )
    expect(loadHistory()).toEqual({ results: [good], error: false })
  })

  it('clears the stored history', () => {
    saveHistory(results(3))
    expect(clearHistory()).toBe(true)
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    expect(loadHistory()).toEqual({ results: [], error: false })
  })

  it('never throws when storage is blocked; reports failure instead', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadHistory()).toEqual({ results: [], error: true })
    expect(saveHistory(results(1))).toBe(false)
    expect(clearHistory()).toBe(false)
  })

  it('creates distinct ids and a full ISO timestamp', () => {
    const a = createResult('win', 10, at(5))
    const b = createResult('win', 10, at(5))
    expect(a.id).not.toBe(b.id)
    expect(a.finishedAt).toBe(at(5).toISOString())
  })
})
