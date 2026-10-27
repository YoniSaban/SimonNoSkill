import type { GameColor } from './colors'
import { TOTAL_ROUNDS } from './constants'

export type GameStatus =
  | 'idle'
  | 'presenting'
  | 'awaitingInput'
  | 'roundComplete' // transitional: completed stage stays on screen, input blocked
  | 'winning' // transitional: last press of stage 10 done, win dialog pending
  | 'losing' // transitional: wrong press done, loss dialog pending
  | 'paused' // in-memory only; resumed manually by the player
  | 'won'
  | 'lost'

export type GameState = {
  status: GameStatus
  /** 1..TOTAL_ROUNDS; also the length of `sequence` while a game is active. */
  round: number
  sequence: GameColor[]
  inputIndex: number
  /** Stages completed successfully, 0..TOTAL_ROUNDS. */
  completedRounds: number
  /** Bumped on every new game; lets a result be recorded once (Milestone 4). */
  gameId: number
  /** Bumped on every (re)presentation and abandon; stale callbacks compare against it. */
  presentationId: number
}

export const initialGameState: GameState = {
  status: 'idle',
  round: 1,
  sequence: [],
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
}

export type GameAction =
  | { type: 'start'; firstColor: GameColor }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: GameColor }
  | { type: 'roundAdvance'; nextColor: GameColor }
  | { type: 'finish' }
  | { type: 'dismiss' }
  /** Leaving the game (About screen, app hidden, phone locked). */
  | { type: 'pause' }
  /** Only from the explicit "המשך משחק" press. */
  | { type: 'resume' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state
      return {
        ...initialGameState,
        status: 'presenting',
        sequence: [action.firstColor],
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
      }

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) {
        return state
      }
      return { ...state, status: 'awaitingInput', inputIndex: 0 }

    case 'press': {
      if (state.status !== 'awaitingInput') return state
      if (action.color !== state.sequence[state.inputIndex]) {
        // `completedRounds` already holds the stages finished so far (round - 1, or
        // `round` when this stage is being replayed after a pause at its boundary).
        return { ...state, status: 'losing' }
      }
      const inputIndex = state.inputIndex + 1
      if (inputIndex < state.sequence.length) return { ...state, inputIndex }
      if (state.round === TOTAL_ROUNDS) {
        return { ...state, status: 'winning', inputIndex, completedRounds: state.round }
      }
      return { ...state, status: 'roundComplete', inputIndex, completedRounds: state.round }
    }

    case 'roundAdvance':
      if (state.status !== 'roundComplete') return state
      return {
        ...state,
        status: 'presenting',
        round: state.round + 1,
        sequence: [...state.sequence, action.nextColor],
        inputIndex: 0,
        presentationId: state.presentationId + 1,
      }

    case 'finish':
      if (state.status === 'winning') return { ...state, status: 'won' }
      if (state.status === 'losing') return { ...state, status: 'lost' }
      return state

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state
      return { ...initialGameState, gameId: state.gameId, presentationId: state.presentationId }

    case 'pause':
      switch (state.status) {
        case 'presenting':
        case 'awaitingInput':
        case 'roundComplete':
          // Sequence, round and counters are kept; partial input is thrown away and
          // the bumped presentationId makes any in-flight presentation obsolete.
          return {
            ...state,
            status: 'paused',
            inputIndex: 0,
            presentationId: state.presentationId + 1,
          }
        // The outcome is already decided: settle it so it cannot be dodged by leaving.
        case 'winning':
          return { ...state, status: 'won' }
        case 'losing':
          return { ...state, status: 'lost' }
        default:
          return state
      }

    case 'resume':
      if (state.status !== 'paused') return state
      return {
        ...state,
        status: 'presenting',
        inputIndex: 0,
        presentationId: state.presentationId + 1,
      }
  }
}
