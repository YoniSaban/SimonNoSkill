import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { playLose, playWin, startTone, stopAll, unlockAudio, type ToneHandle } from '../audio/audioEngine'
import type { GameColor } from './colors'
import {
  GAP_MS,
  LIGHT_MS,
  PRESENT_DELAY_MS,
  PRESS_MIN_MS,
  RESULT_DELAY_MS,
  ROUND_COMPLETE_MS,
} from './constants'
import { randomColor } from './random'
import { gameReducer, initialGameState } from './reducer'

/** Resolves true after `ms`, or false right away if `signal` aborts first. */
function wait(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false)
    const onAbort = () => {
      clearTimeout(id)
      resolve(false)
    }
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve(true)
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

type Hold = {
  color: GameColor
  tone: ToneHandle
  released: boolean
  minElapsed: boolean
  timer: number
}

const CONFETTI_COLORS = ['#00d26a', '#ff3b30', '#ffd600', '#00a3ff']

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [presentedColor, setPresentedColor] = useState<GameColor | null>(null)
  const [heldColor, setHeldColor] = useState<GameColor | null>(null)
  const [audioFailed, setAudioFailed] = useState(false)

  const { status, presentationId } = state
  const statusRef = useRef(status)
  statusRef.current = status
  const holdsRef = useRef<Hold[]>([])

  // --- Player presses -------------------------------------------------------

  const refreshHeldColor = useCallback(() => {
    const last = holdsRef.current[holdsRef.current.length - 1]
    setHeldColor(last ? last.color : null)
  }, [])

  const endHold = useCallback(
    (hold: Hold) => {
      clearTimeout(hold.timer)
      hold.tone.stop()
      holdsRef.current = holdsRef.current.filter((h) => h !== hold)
      refreshHeldColor()
    },
    [refreshHeldColor],
  )

  const tryEndHold = useCallback(
    (hold: Hold) => {
      if (hold.released && hold.minElapsed) endHold(hold)
    },
    [endHold],
  )

  const releaseAll = useCallback(() => {
    for (const hold of [...holdsRef.current]) {
      hold.released = true
      tryEndHold(hold)
    }
  }, [tryEndHold])

  const clearHolds = useCallback(() => {
    for (const hold of [...holdsRef.current]) endHold(hold)
  }, [endHold])

  const pressStart = useCallback(
    (color: GameColor) => {
      if (statusRef.current !== 'awaitingInput') return
      const hold: Hold = {
        color,
        tone: startTone(color),
        released: false,
        minElapsed: false,
        timer: 0,
      }
      hold.timer = window.setTimeout(() => {
        hold.minElapsed = true
        tryEndHold(hold)
      }, PRESS_MIN_MS)
      holdsRef.current.push(hold)
      refreshHeldColor()
      dispatch({ type: 'press', color })
    },
    [refreshHeldColor, tryEndHold],
  )

  // The quadrant may become disabled before the finger lifts, so releases are
  // listened for on the window rather than on the button.
  useEffect(() => {
    window.addEventListener('pointerup', releaseAll)
    window.addEventListener('pointercancel', releaseAll)
    window.addEventListener('keyup', releaseAll)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('pointerup', releaseAll)
      window.removeEventListener('pointercancel', releaseAll)
      window.removeEventListener('keyup', releaseAll)
      window.removeEventListener('blur', releaseAll)
    }
  }, [releaseAll])

  useEffect(() => {
    if (status === 'idle') clearHolds()
  }, [status, clearHolds])

  useEffect(
    () => () => {
      clearHolds()
      stopAll()
    },
    [clearHolds],
  )

  // --- Sequence presentation ------------------------------------------------

  useEffect(() => {
    if (status !== 'presenting') return
    const controller = new AbortController()
    const { signal } = controller
    const sequence = state.sequence

    void (async () => {
      if (!(await wait(PRESENT_DELAY_MS, signal))) return
      for (let i = 0; i < sequence.length; i++) {
        setPresentedColor(sequence[i])
        const tone = startTone(sequence[i])
        const completed = await wait(LIGHT_MS, signal)
        tone.stop()
        setPresentedColor(null)
        if (!completed) return
        if (i < sequence.length - 1 && !(await wait(GAP_MS, signal))) return
      }
      dispatch({ type: 'presentationDone', presentationId })
    })()

    return () => {
      controller.abort()
      setPresentedColor(null)
    }
    // `sequence` is fixed while presenting; a new presentation changes presentationId.
  }, [status, presentationId])

  // --- Timed transitions between stages and to the result -------------------

  useEffect(() => {
    let id: number | undefined
    if (status === 'roundComplete') {
      id = window.setTimeout(
        () => dispatch({ type: 'roundAdvance', nextColor: randomColor() }),
        ROUND_COMPLETE_MS,
      )
    } else if (status === 'winning' || status === 'losing') {
      id = window.setTimeout(() => dispatch({ type: 'finish' }), RESULT_DELAY_MS)
    }
    return () => clearTimeout(id)
  }, [status])

  // --- End of game: sound and confetti --------------------------------------

  useEffect(() => {
    if (status === 'won') {
      playWin()
      void confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.6 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      })
      return () => {
        void confetti.reset()
        stopAll()
      }
    }
    if (status === 'lost') {
      playLose()
      return () => stopAll()
    }
  }, [status])

  // --- Actions --------------------------------------------------------------

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle') return
    setAudioFailed(false)
    // Called synchronously inside the click so the AudioContext is allowed to start.
    const ready = await unlockAudio()
    if (!ready) {
      setAudioFailed(true)
      return
    }
    dispatch({ type: 'start', firstColor: randomColor() })
  }, [])

  const dismiss = useCallback(() => dispatch({ type: 'dismiss' }), [])

  const abandon = useCallback(() => {
    clearHolds()
    stopAll()
    setPresentedColor(null)
    dispatch({ type: 'abandon' })
  }, [clearHolds])

  return {
    state,
    litColor: status === 'presenting' ? presentedColor : heldColor,
    audioFailed,
    start,
    pressStart,
    dismiss,
    abandon,
  }
}

export type GameApi = ReturnType<typeof useGame>
