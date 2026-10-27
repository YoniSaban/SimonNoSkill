import type { GameColor } from './colors'
import { TOTAL_ROUNDS } from './constants'

export type GameStatus =
  | 'idle'
  | 'presenting'
  | 'awaitingInput'
  | 'roundComplete' // transitional: completed stage stays on screen, input blocked
  | 'winning' // transitional: last press of stage 10 done, win dialog pending
  | 'losing' // transitional: wrong press done, loss dialog pending
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
  /** Temporary (Milestone 2 only): leaving the game screen cancels the game. */
  | { type: 'abandon' }

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
        return { ...state, status: 'losing', completedRounds: state.round - 1 }
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

    case 'abandon':
      if (state.status === 'idle') return state
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId + 1,
      }
  }
}
