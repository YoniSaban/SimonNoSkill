import type { GameColor } from './colors'
import { gameReducer, initialGameState, type GameState } from './reducer'

const COLORS_10: GameColor[] = [
  'red', 'green', 'yellow', 'blue', 'red', 'blue', 'green', 'yellow', 'red', 'green',
]

const started = (first: GameColor = 'red') =>
  gameReducer(initialGameState, { type: 'start', firstColor: first })

const awaiting = (s: GameState) =>
  gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId })

const pressAll = (s: GameState, colors: GameColor[]) =>
  colors.reduce((acc, color) => gameReducer(acc, { type: 'press', color }), s)

describe('gameReducer', () => {
  it('starts a game with a one-colour sequence at stage 1', () => {
    const s = started('blue')
    expect(s).toMatchObject({ status: 'presenting', round: 1, sequence: ['blue'], completedRounds: 0 })
    expect(s.gameId).toBe(1)
  })

  it('moves to awaitingInput only for the current presentation', () => {
    const s = started()
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId - 1 })).toBe(s)
    expect(awaiting(s).status).toBe('awaitingInput')
  })

  it('ignores presses unless it is the player\'s turn', () => {
    const s = started('red')
    expect(gameReducer(s, { type: 'press', color: 'green' })).toBe(s)
    expect(gameReducer(s, { type: 'press', color: 'red' })).toBe(s)
  })

  it('loses on a wrong press at stage 1 with 0 completed stages', () => {
    const s = pressAll(awaiting(started('red')), ['green'])
    expect(s).toMatchObject({ status: 'losing', completedRounds: 0, round: 1 })
    expect(gameReducer(s, { type: 'finish' }).status).toBe('lost')
  })

  it('loses on the first wrong press mid-sequence, without further attempts', () => {
    let s = awaiting(started('red'))
    s = pressAll(s, ['red'])
    s = gameReducer(s, { type: 'roundAdvance', nextColor: 'green' })
    s = awaiting(s)
    s = pressAll(s, ['red', 'blue']) // second colour should have been green
    expect(s).toMatchObject({ status: 'losing', completedRounds: 1, round: 2 })
    expect(gameReducer(s, { type: 'press', color: 'green' })).toBe(s)
  })

  it('grows the sequence by one colour per stage and keeps the earlier one as a prefix', () => {
    let s = started(COLORS_10[0])
    for (let round = 1; round <= 10; round++) {
      expect(s.status).toBe('presenting')
      expect(s.round).toBe(round)
      expect(s.sequence).toEqual(COLORS_10.slice(0, round))
      s = pressAll(awaiting(s), s.sequence)
      if (round < 10) {
        expect(s).toMatchObject({ status: 'roundComplete', completedRounds: round })
        s = gameReducer(s, { type: 'roundAdvance', nextColor: COLORS_10[round] })
      }
    }
    expect(s).toMatchObject({ status: 'winning', round: 10, completedRounds: 10 })
    expect(s.sequence).toHaveLength(10)
  })

  it('wins after stage 10 and never creates stage 11', () => {
    let s = started(COLORS_10[0])
    for (let round = 1; round <= 10; round++) {
      s = pressAll(awaiting(s), s.sequence)
      if (round < 10) s = gameReducer(s, { type: 'roundAdvance', nextColor: COLORS_10[round] })
    }
    expect(gameReducer(s, { type: 'roundAdvance', nextColor: 'red' })).toBe(s)
    const won = gameReducer(s, { type: 'finish' })
    expect(won).toMatchObject({ status: 'won', round: 10, completedRounds: 10 })
  })

  it('returns to idle on dismiss and starts a fresh game with a new sequence and id', () => {
    const lost = gameReducer(pressAll(awaiting(started('red')), ['green']), { type: 'finish' })
    const idle = gameReducer(lost, { type: 'dismiss' })
    expect(idle).toMatchObject({ status: 'idle', round: 1, sequence: [], completedRounds: 0 })
    const next = gameReducer(idle, { type: 'start', firstColor: 'yellow' })
    expect(next.sequence).toEqual(['yellow'])
    expect(next.gameId).toBe(lost.gameId + 1)
  })

  it('only dismisses a finished game', () => {
    const s = awaiting(started())
    expect(gameReducer(s, { type: 'dismiss' })).toBe(s)
  })

  it('abandon cancels an active game and invalidates a pending presentation', () => {
    const s = started('red')
    const idle = gameReducer(s, { type: 'abandon' })
    expect(idle.status).toBe('idle')
    expect(gameReducer(idle, { type: 'presentationDone', presentationId: s.presentationId })).toBe(idle)
  })
})
