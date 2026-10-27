import { act, fireEvent, render, screen } from '@testing-library/react'
import confetti from 'canvas-confetti'
import App from '../App'
import * as audio from '../audio/audioEngine'
import { COLORS, type GameColor } from './colors'
import { randomColor } from './random'

vi.mock('../audio/audioEngine', () => ({
  unlockAudio: vi.fn(),
  startTone: vi.fn(),
  playWin: vi.fn(),
  playLose: vi.fn(),
  stopAll: vi.fn(),
  TONE_FREQUENCIES: {},
}))
vi.mock('./random', () => ({ randomColor: vi.fn() }))
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }))

type FakeTone = { stop: ReturnType<typeof vi.fn> }
let tones: FakeTone[]

const SEQ: GameColor[] = [
  'red', 'green', 'yellow', 'blue', 'red', 'blue', 'green', 'yellow', 'red', 'green',
]

function queueColors(colors: GameColor[]) {
  let i = 0
  vi.mocked(randomColor).mockImplementation(() => colors[i++])
}

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

/** Whole presentation of an n-colour sequence: 1000 delay + n lights + (n-1) gaps. */
const presentationMs = (n: number) => 1000 + n * 600 + (n - 1) * 250

const button = (name: string) => screen.getByRole('button', { name })
const labelOf = (color: GameColor) => COLORS.find((c) => c.id === color)!.label

async function startGame() {
  fireEvent.click(button('התחל משחק'))
  await advance(0)
}

function tap(color: GameColor) {
  fireEvent.pointerDown(button(labelOf(color)))
  fireEvent.pointerUp(document)
}

/** Plays stages 1..n correctly, stopping right after the last press of stage n. */
async function playStages(n: number) {
  for (let stage = 1; stage <= n; stage++) {
    await advance(presentationMs(stage))
    for (let i = 0; i < stage; i++) tap(SEQ[i])
    if (stage < n) await advance(1000)
  }
}

const quadrants = () => COLORS.map((c) => button(c.label))

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  tones = []
  vi.mocked(audio.unlockAudio).mockResolvedValue(true)
  vi.mocked(audio.startTone).mockImplementation(() => {
    const tone = { stop: vi.fn() }
    tones.push(tone)
    return tone
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('presenting the sequence', () => {
  it('waits, then lights and sounds the colour with the fixed pacing, then hands over to the player', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    quadrants().forEach((q) => expect(q).toBeDisabled())

    await advance(999)
    expect(audio.startTone).not.toHaveBeenCalled()
    await advance(1)
    expect(audio.startTone).toHaveBeenCalledWith('red')
    expect(button('אדום')).toHaveClass('quadrant--lit')

    await advance(599)
    expect(tones[0].stop).not.toHaveBeenCalled()
    await advance(1)
    expect(tones[0].stop).toHaveBeenCalled()
    expect(button('אדום')).not.toHaveClass('quadrant--lit')
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
    quadrants().forEach((q) => expect(q).toBeEnabled())
  })

  it('ignores presses while the sequence is shown and plays on normally', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()

    fireEvent.pointerDown(button('כחול'))
    fireEvent.pointerUp(document)
    expect(audio.startTone).not.toHaveBeenCalled()

    await advance(presentationMs(1))
    expect(audio.startTone).toHaveBeenCalledTimes(1) // only the presentation's own tone
    tap('red')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await advance(1000)
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument()
  })

  it('keeps the same pacing in a later stage (stage 3: 3 lights, 2 gaps)', async () => {
    queueColors(SEQ)
    render(<App />)
    await startGame()
    await playStages(2)
    await advance(1000) // stage 2 done -> stage 3 starts presenting
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument()
    vi.mocked(audio.startTone).mockClear()

    await advance(1000)
    expect(audio.startTone).toHaveBeenLastCalledWith('red')
    await advance(600 + 250)
    expect(audio.startTone).toHaveBeenLastCalledWith('green')
    await advance(600 + 250)
    expect(audio.startTone).toHaveBeenLastCalledWith('yellow')
    await advance(600)
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
  })
})

describe('losing', () => {
  it('a wrong press at stage 1 sounds the pressed colour at once, then loses after 1s with 0 completed', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))

    tap('green')
    expect(audio.startTone).toHaveBeenLastCalledWith('green')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(audio.playLose).not.toHaveBeenCalled()

    await advance(999)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await advance(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('נפסלת!')).toBeInTheDocument()
    expect(screen.getByText('לא השלמת אף שלב')).toBeInTheDocument()
    expect(audio.playLose).toHaveBeenCalledTimes(1)
    expect(audio.playWin).not.toHaveBeenCalled()
    expect(confetti).not.toHaveBeenCalled()
    quadrants().forEach((q) => expect(q).toBeDisabled())
  })

  it('a wrong press at a later stage reports the stages completed before it', async () => {
    queueColors(SEQ)
    render(<App />)
    await startGame()
    await playStages(2)
    await advance(1000)
    await advance(presentationMs(3))

    tap('blue') // stage 3 starts with red
    await advance(1000)
    expect(screen.getByText('השלמת 2 שלבים')).toBeInTheDocument()
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument()
    expect(confetti).not.toHaveBeenCalled()
  })

  it('"אישור" only closes the dialog; a new game starts with a fresh sequence', async () => {
    queueColors(['red', 'yellow'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    tap('green')
    await advance(1000)

    fireEvent.click(button('אישור'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    expect(button('התחל משחק')).toBeInTheDocument()
    expect(randomColor).toHaveBeenCalledTimes(1) // dismiss starts nothing

    vi.mocked(audio.startTone).mockClear()
    await startGame()
    await advance(1000)
    expect(audio.startTone).toHaveBeenLastCalledWith('yellow')
  })
})

describe('winning', () => {
  it('completes ten stages, waits 1s, then shows the win with sound and confetti once', async () => {
    queueColors([...SEQ, 'blue'])
    render(<App />)
    await startGame()
    await playStages(10)

    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument()
    await advance(999)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(confetti).not.toHaveBeenCalled()
    await advance(1)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('כל הכבוד!')).toBeInTheDocument()
    expect(screen.getByText('ניצחת!')).toBeInTheDocument()
    expect(audio.playWin).toHaveBeenCalledTimes(1)
    expect(audio.playLose).not.toHaveBeenCalled()
    expect(confetti).toHaveBeenCalledTimes(1)
    expect(randomColor).toHaveBeenCalledTimes(10) // 1 start + 9 stage advances, no stage 11
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument()

    await advance(10_000)
    expect(confetti).toHaveBeenCalledTimes(1)
    expect(randomColor).toHaveBeenCalledTimes(10)
  })

  it('"אישור" clears the confetti and the next game gets a new sequence', async () => {
    queueColors([...SEQ, 'blue'])
    render(<App />)
    await startGame()
    await playStages(10)
    await advance(1000)

    fireEvent.click(button('אישור'))
    expect(confetti.reset).toHaveBeenCalled()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()

    vi.mocked(audio.startTone).mockClear()
    await startGame()
    await advance(1000)
    expect(audio.startTone).toHaveBeenLastCalledWith('blue')
  })
})

describe('player press feedback', () => {
  it('keeps the light and sound for at least 300ms after a quick tap', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    const before = tones.length

    tap('red')
    const tone = tones[before]
    expect(button('אדום')).toHaveClass('quadrant--lit')
    await advance(299)
    expect(tone.stop).not.toHaveBeenCalled()
    await advance(1)
    expect(tone.stop).toHaveBeenCalled()
    expect(button('אדום')).not.toHaveClass('quadrant--lit')
  })

  it('keeps the light and sound for as long as the finger stays down', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    const before = tones.length

    fireEvent.pointerDown(button('אדום'))
    const tone = tones[before]
    await advance(800) // well past the 300ms minimum, still before the next stage starts
    expect(tone.stop).not.toHaveBeenCalled()
    expect(button('אדום')).toHaveClass('quadrant--lit')
    fireEvent.pointerUp(document)
    expect(tone.stop).toHaveBeenCalled()
  })
})

describe('audio and navigation', () => {
  it('does not start a silent game when audio cannot be unlocked, and allows a retry', async () => {
    queueColors(['red'])
    vi.mocked(audio.unlockAudio).mockResolvedValue(false)
    render(<App />)
    await startGame()
    expect(screen.getByText('לא ניתן להפעיל את הצלילים. נסו שוב.')).toBeInTheDocument()
    expect(button('התחל משחק')).toBeInTheDocument()
    expect(randomColor).not.toHaveBeenCalled()

    vi.mocked(audio.unlockAudio).mockResolvedValue(true)
    await startGame()
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
  })

})

const goAbout = () => fireEvent.click(button('אודות'))
const goHome = () => fireEvent.click(button('בית'))

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  fireEvent(document, new Event('visibilitychange'))
}

describe('pausing', () => {
  afterEach(() => setVisibility('visible'))

  it('leaving for "אודות" while the sequence is shown stops the light and sound at once and pauses', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(1000) // red is lit and sounding
    expect(button('אדום')).toHaveClass('quadrant--lit')

    goAbout()
    await advance(0)
    expect(audio.stopAll).toHaveBeenCalled()
    expect(tones[0].stop).toHaveBeenCalled()

    const toneCount = tones.length
    goHome()
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    quadrants().forEach((q) => {
      expect(q).not.toHaveClass('quadrant--lit')
      expect(q).toBeDisabled()
    })
    expect(screen.getByRole('group', { name: 'לוח המשחק' }).className).toContain('board--dim')

    await advance(30_000)
    expect(tones).toHaveLength(toneCount) // a cancelled presentation produced nothing more
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(audio.playLose).not.toHaveBeenCalled() // a paused game is not a loss
  })

  it('does not resume by itself on returning; "המשך משחק" shows for a paused game only', async () => {
    queueColors(['red'])
    render(<App />)
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()
    await startGame()
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument()

    goAbout()
    goHome()
    expect(button('המשך משחק')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument()
    await advance(10_000)
    expect(audio.startTone).not.toHaveBeenCalled()
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
  })

  it('pausing in the middle of the player\'s input keeps the stage and replays the whole sequence on resume', async () => {
    queueColors(SEQ)
    render(<App />)
    await startGame()
    await playStages(2)
    await advance(1000)
    await advance(presentationMs(3)) // stage 3: red, green, yellow
    tap('red') // one of three entered
    expect(randomColor).toHaveBeenCalledTimes(3)

    goAbout()
    goHome()
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument()
    vi.mocked(audio.startTone).mockClear()

    fireEvent.click(button('המשך משחק'))
    await advance(0)
    expect(audio.unlockAudio).toHaveBeenCalled()
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()

    await advance(1000)
    expect(audio.startTone).toHaveBeenLastCalledWith('red')
    await advance(600 + 250)
    expect(audio.startTone).toHaveBeenLastCalledWith('green')
    await advance(600 + 250)
    expect(audio.startTone).toHaveBeenLastCalledWith('yellow')
    await advance(600)
    expect(audio.startTone).toHaveBeenCalledTimes(3) // the whole sequence, once

    // Input starts again from the first colour; the earlier "red" does not count.
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
    tap('red')
    tap('green')
    tap('yellow')
    await advance(1000)
    expect(screen.getByText('שלב 4 מתוך 10')).toBeInTheDocument()
    expect(randomColor).toHaveBeenCalledTimes(4) // resuming added no colour; only finishing stage 3 did
  })

  it('pausing in the middle of the player\'s input and getting the order wrong on resume still loses', async () => {
    queueColors(SEQ)
    render(<App />)
    await startGame()
    await playStages(1)
    await advance(1000)
    await advance(presentationMs(2)) // stage 2: red, green
    tap('red')

    goAbout()
    goHome()
    fireEvent.click(button('המשך משחק'))
    await advance(0)
    await advance(presentationMs(2))
    tap('green') // would have been right before the pause; now input restarts at red
    await advance(1000)
    expect(screen.getByText('נפסלת!')).toBeInTheDocument()
    expect(screen.getByText('השלמת שלב אחד')).toBeInTheDocument()
  })

  it('ignores a second press on "המשך משחק" and a stale presentation after resume', async () => {
    queueColors(['red', 'green'])
    render(<App />)
    await startGame()
    await advance(1000) // mid presentation
    goAbout()
    goHome()
    vi.mocked(audio.startTone).mockClear()

    const resume = button('המשך משחק')
    fireEvent.click(resume)
    fireEvent.click(resume)
    await advance(0)
    await advance(presentationMs(1))
    expect(audio.startTone).toHaveBeenCalledTimes(1) // one presentation, not two
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
  })

  it('stays paused with a message when audio cannot be unlocked, and resumes on retry', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    goAbout()
    goHome()

    vi.mocked(audio.unlockAudio).mockResolvedValue(false)
    fireEvent.click(button('המשך משחק'))
    await advance(0)
    expect(screen.getByText('לא ניתן להפעיל את הצלילים. נסו שוב.')).toBeInTheDocument()
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    expect(button('המשך משחק')).toBeInTheDocument()

    vi.mocked(audio.unlockAudio).mockResolvedValue(true)
    fireEvent.click(button('המשך משחק'))
    await advance(0)
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
    expect(screen.queryByText('לא ניתן להפעיל את הצלילים. נסו שוב.')).not.toBeInTheDocument()
  })

  it('hiding the app pauses like leaving for "אודות", and showing it again does not resume', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(1000)
    expect(button('אדום')).toHaveClass('quadrant--lit')

    setVisibility('hidden')
    await advance(0)
    expect(tones[0].stop).toHaveBeenCalled()
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()

    const toneCount = tones.length
    setVisibility('visible')
    await advance(10_000)
    expect(tones).toHaveLength(toneCount)
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    expect(button('המשך משחק')).toBeInTheDocument()
  })

  it('"pagehide" pauses the game too', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    expect(screen.getByText('התור שלך')).toBeInTheDocument()

    fireEvent(window, new Event('pagehide'))
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    quadrants().forEach((q) => expect(q).toBeDisabled())
  })

  it('pausing during the pause between two stages keeps the completed stage and replays it on resume', async () => {
    queueColors(SEQ)
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    tap('red') // stage 1 done; 1s pause before stage 2
    await advance(400)

    goAbout()
    goHome()
    await advance(5000) // the pending move to stage 2 was cancelled
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    expect(randomColor).toHaveBeenCalledTimes(1)

    fireEvent.click(button('המשך משחק'))
    await advance(0)
    await advance(presentationMs(1))
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
    expect(randomColor).toHaveBeenCalledTimes(1) // still no second colour
  })

  it('pausing right after a wrong press settles the loss quietly; it cannot be dodged', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    tap('green') // wrong; the loss dialog is 1s away

    goAbout()
    await advance(5000)
    expect(audio.playLose).not.toHaveBeenCalled() // nothing is played while away
    goHome()
    expect(screen.getByText('נפסלת!')).toBeInTheDocument()
    expect(screen.getByText('לא השלמת אף שלב')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()
  })

  it('pausing right after the last correct press of stage 10 settles the win quietly', async () => {
    queueColors(SEQ)
    render(<App />)
    await startGame()
    await playStages(10)

    goAbout()
    await advance(5000)
    expect(audio.playWin).not.toHaveBeenCalled()
    expect(confetti).not.toHaveBeenCalled()
    goHome()
    expect(screen.getByText('כל הכבוד!')).toBeInTheDocument()
  })

  it('leaving with the result dialog open keeps the result and silences the confetti', async () => {
    queueColors(['red'])
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    tap('green')
    await advance(1000)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    goAbout()
    expect(audio.stopAll).toHaveBeenCalled()
    expect(confetti.reset).toHaveBeenCalled()
    goHome()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(button('אישור'))
    expect(button('התחל משחק')).toBeInTheDocument()
  })

  it('leaving before a game starts changes nothing', async () => {
    render(<App />)
    goAbout()
    goHome()
    expect(button('התחל משחק')).toBeInTheDocument()
    expect(screen.queryByText('המשחק מושהה')).not.toBeInTheDocument()
  })
})
