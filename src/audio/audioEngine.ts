import type { GameColor } from '../game/colors'

/** One distinct pitch per colour (the original Simon's notes). */
export const TONE_FREQUENCIES: Record<GameColor, number> = {
  green: 415.3,
  red: 310,
  yellow: 252,
  blue: 209,
}

export type ToneHandle = { stop: () => void }

type Note = { freq: number; start: number; duration: number }

const PEAK_GAIN = 0.25
const ATTACK_S = 0.01
const RELEASE_S = 0.05

// Rising, bright motif for a win; falling, low motif for a loss.
const WIN_NOTES: Note[] = [
  { freq: 523.25, start: 0, duration: 0.14 },
  { freq: 659.25, start: 0.14, duration: 0.14 },
  { freq: 783.99, start: 0.28, duration: 0.14 },
  { freq: 1046.5, start: 0.42, duration: 0.5 },
]
const LOSE_NOTES: Note[] = [
  { freq: 233.08, start: 0, duration: 0.22 },
  { freq: 196, start: 0.22, duration: 0.22 },
  { freq: 146.83, start: 0.44, duration: 0.6 },
]

let ctx: AudioContext | null = null
const active = new Set<ToneHandle>()

function isRunning(c: AudioContext): boolean {
  return c.state === 'running'
}

/**
 * Creates/resumes the AudioContext. Must be called synchronously from a user
 * gesture (the "start" / "resume" button). Resolves false if sound cannot be
 * made available, so the game never advances silently.
 */
export function unlockAudio(): Promise<boolean> {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return Promise.resolve(false)
    if (!ctx || ctx.state === 'closed') ctx = new Ctor()
    const c = ctx
    const ready = isRunning(c) ? Promise.resolve() : c.resume()
    return ready.then(() => isRunning(c)).catch(() => false)
  } catch {
    return Promise.resolve(false)
  }
}

function scheduleTone(
  c: AudioContext,
  freq: number,
  type: OscillatorType,
  startAt: number,
  duration: number | null,
  peak: number,
): ToneHandle {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(c.destination)

  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(peak, startAt + ATTACK_S)

  let stopped = false
  const handle: ToneHandle = {
    stop() {
      if (stopped) return
      stopped = true
      const now = Math.max(c.currentTime, startAt)
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + RELEASE_S)
      osc.stop(now + RELEASE_S + 0.01)
    },
  }
  osc.onended = () => {
    active.delete(handle)
    osc.disconnect()
    gain.disconnect()
  }
  active.add(handle)
  osc.start(startAt)
  if (duration !== null) {
    // Natural end of a scheduled note: fade out just before `duration`.
    const end = startAt + duration
    gain.gain.setValueAtTime(peak, Math.max(startAt + ATTACK_S, end - RELEASE_S))
    gain.gain.linearRampToValueAtTime(0, end)
    osc.stop(end + 0.01)
  }
  return handle
}

const SILENT: ToneHandle = { stop() {} }

/** Starts a colour's tone; it sounds until `stop()` is called. */
export function startTone(color: GameColor): ToneHandle {
  if (!ctx || !isRunning(ctx)) return SILENT
  return scheduleTone(ctx, TONE_FREQUENCIES[color], 'triangle', ctx.currentTime, null, PEAK_GAIN)
}

function playMotif(notes: Note[], type: OscillatorType, peak: number) {
  if (!ctx || !isRunning(ctx)) return
  const t0 = ctx.currentTime
  for (const n of notes) {
    scheduleTone(ctx, n.freq, type, t0 + n.start, n.duration, peak)
  }
}

export function playWin() {
  playMotif(WIN_NOTES, 'triangle', PEAK_GAIN)
}

export function playLose() {
  playMotif(LOSE_NOTES, 'sawtooth', 0.16)
}

/** Silences every sound that is currently playing or scheduled. */
export function stopAll() {
  for (const handle of [...active]) handle.stop()
}
