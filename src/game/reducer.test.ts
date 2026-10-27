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

})

describe('pause and resume', () => {
  /** Stage 3 in progress, awaiting input, with the first colour already entered. */
  function stage3Input(): GameState {
    let s = started(COLORS_10[0])
    for (const next of [COLORS_10[1], COLORS_10[2]]) {
      s = pressAll(awaiting(s), s.sequence)
      s = gameReducer(s, { type: 'roundAdvance', nextColor: next })
    }
    return pressAll(awaiting(s), [COLORS_10[0]])
  }

  it('pauses while presenting without changing the sequence, stage or counters', () => {
    const s = started('red')
    const p = gameReducer(s, { type: 'pause' })
    expect(p).toMatchObject({ status: 'paused', round: 1, sequence: ['red'], completedRounds: 0, gameId: s.gameId })
  })

  it('pauses mid-input: keeps the stage and sequence, throws the partial input away', () => {
    const s = stage3Input()
    expect(s).toMatchObject({ status: 'awaitingInput', round: 3, inputIndex: 1 })
    const p = gameReducer(s, { type: 'pause' })
    expect(p).toMatchObject({
      status: 'paused',
      round: 3,
      inputIndex: 0,
      completedRounds: 2,
      sequence: COLORS_10.slice(0, 3),
    })
  })

  it('makes an in-flight presentation obsolete', () => {
    const s = started('red')
    const p = gameReducer(s, { type: 'pause' })
    expect(gameReducer(p, { type: 'presentationDone', presentationId: s.presentationId })).toBe(p)
  })

  it('ignores presses while paused', () => {
    const p = gameReducer(stage3Input(), { type: 'pause' })
    expect(gameReducer(p, { type: 'press', color: COLORS_10[0] })).toBe(p)
  })

  it('resumes the same stage and the full sequence: no new colour, no new stage, no new game', () => {
    const paused = gameReducer(stage3Input(), { type: 'pause' })
    const r = gameReducer(paused, { type: 'resume' })
    expect(r).toMatchObject({
      status: 'presenting',
      round: 3,
      inputIndex: 0,
      completedRounds: 2,
      sequence: COLORS_10.slice(0, 3),
      gameId: paused.gameId,
    })
    expect(r.presentationId).not.toBe(paused.presentationId)
    // The restarted stage plays like a normal one.
    expect(awaiting(r).status).toBe('awaitingInput')
  })

  it('resumes only once: a second resume does nothing', () => {
    const r = gameReducer(gameReducer(started(), { type: 'pause' }), { type: 'resume' })
    expect(gameReducer(r, { type: 'resume' })).toBe(r)
  })

  it('only resumes a paused game', () => {
    for (const s of [initialGameState, started(), awaiting(started())]) {
      expect(gameReducer(s, { type: 'resume' })).toBe(s)
    }
  })

  it('pausing twice is harmless', () => {
    const p = gameReducer(started(), { type: 'pause' })
    expect(gameReducer(p, { type: 'pause' })).toBe(p)
  })

  it('does not touch a game that has not started or has finished', () => {
    expect(gameReducer(initialGameState, { type: 'pause' })).toBe(initialGameState)
    const lost = gameReducer(gameReducer(pressAll(awaiting(started('red')), ['green']), { type: 'finish' }), {
      type: 'pause',
    })
    expect(lost.status).toBe('lost')
  })

  it('pausing at a stage boundary keeps the completed stage; it is replayed on resume', () => {
    const boundary = pressAll(awaiting(started('red')), ['red'])
    expect(boundary).toMatchObject({ status: 'roundComplete', round: 1, completedRounds: 1 })
    const paused = gameReducer(boundary, { type: 'pause' })
    expect(paused).toMatchObject({ status: 'paused', round: 1, completedRounds: 1, sequence: ['red'] })
    const replay = awaiting(gameReducer(paused, { type: 'resume' }))
    // Failing the replay still reports the stage that had already been completed.
    expect(pressAll(replay, ['green'])).toMatchObject({ status: 'losing', completedRounds: 1 })
    // Completing it again moves on to the next stage as usual.
    expect(pressAll(replay, ['red']).status).toBe('roundComplete')
  })

  it('settles a decided outcome instead of pausing it, so a loss cannot be dodged', () => {
    const losing = pressAll(awaiting(started('red')), ['green'])
    expect(gameReducer(losing, { type: 'pause' })).toMatchObject({ status: 'lost', completedRounds: 0 })

    let winning = started(COLORS_10[0])
    for (let round = 1; round <= 10; round++) {
      winning = pressAll(awaiting(winning), winning.sequence)
      if (round < 10) winning = gameReducer(winning, { type: 'roundAdvance', nextColor: COLORS_10[round] })
    }
    expect(winning.status).toBe('winning')
    expect(gameReducer(winning, { type: 'pause' })).toMatchObject({ status: 'won', completedRounds: 10 })
  })
})
