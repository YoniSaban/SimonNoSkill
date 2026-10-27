import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import * as audio from '../audio/audioEngine'
import { COLORS, type GameColor } from '../game/colors'
import { randomColor } from '../game/random'
import { HISTORY_KEY } from './historyStorage'

vi.mock('../audio/audioEngine', () => ({
  unlockAudio: vi.fn(),
  startTone: vi.fn(() => ({ stop: vi.fn() })),
  playWin: vi.fn(),
  playLose: vi.fn(),
  stopAll: vi.fn(),
  TONE_FREQUENCIES: {},
}))
vi.mock('../game/random', () => ({ randomColor: vi.fn() }))
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }))

const SEQ: GameColor[] = [
  'red', 'green', 'yellow', 'blue', 'red', 'blue', 'green', 'yellow', 'red', 'green',
]

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
const presentationMs = (n: number) => 1000 + n * 600 + (n - 1) * 250
const button = (name: string) => screen.getByRole('button', { name })
const labelOf = (color: GameColor) => COLORS.find((c) => c.id === color)!.label

function queueColors(colors: GameColor[]) {
  let i = 0
  vi.mocked(randomColor).mockImplementation(() => colors[i++ % colors.length])
}

async function startGame() {
  fireEvent.click(button('התחל משחק'))
  await advance(0)
}

function tap(color: GameColor) {
  fireEvent.pointerDown(button(labelOf(color)))
  fireEvent.pointerUp(document)
}

/** Plays stages 1..n correctly, ending right after the last press of stage n. */
async function playStages(n: number) {
  for (let stage = 1; stage <= n; stage++) {
    await advance(presentationMs(stage))
    for (let i = 0; i < stage; i++) tap(SEQ[i])
    if (stage < n) await advance(1000)
  }
}

/** A whole game lost at stage `stage` (so stage - 1 completed), ending with the dialog open. */
async function loseAtStage(stage: number) {
  queueColors(SEQ) // every game draws the same sequence from its start
  await startGame()
  if (stage > 1) {
    await playStages(stage - 1)
    await advance(1000)
  }
  await advance(presentationMs(stage))
  tap(SEQ[0] === 'blue' ? 'red' : 'blue') // the first colour of every stage is SEQ[0]
  await advance(1000)
}

const storedResults = () => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{"results":[]}').results
const goAbout = () => fireEvent.click(button('אודות'))
const goHome = () => fireEvent.click(button('בית'))
const historyCards = () => screen.queryAllByRole('listitem').filter((li) => li.classList.contains('history-card'))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  localStorage.clear()
  queueColors(SEQ)
  vi.mocked(audio.unlockAudio).mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('recording results', () => {
  it('a loss adds exactly one record, shown in "אודות" with stages completed and "הפסד"', async () => {
    render(<App />)
    await loseAtStage(3)
    expect(storedResults()).toHaveLength(1)
    expect(storedResults()[0]).toMatchObject({ outcome: 'loss', completedRounds: 2 })

    fireEvent.click(button('אישור'))
    goAbout()
    const cards = historyCards()
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('שלבים שהושלמו: 2')).toBeInTheDocument()
    expect(within(cards[0]).getByText('הפסד')).toBeInTheDocument()
    expect(within(cards[0]).getByText('27.10.2026, 12:00')).toBeInTheDocument()
    expect(screen.queryByText('אין עדיין משחקים שמורים')).not.toBeInTheDocument()
    expect(storedResults()).toHaveLength(1) // "אישור" and navigation added nothing
  })

  it('a loss at stage 1 records 0 stages completed', async () => {
    render(<App />)
    await loseAtStage(1)
    expect(storedResults()[0]).toMatchObject({ outcome: 'loss', completedRounds: 0 })
  })

  it('a win records 10 stages and "ניצחון"', async () => {
    render(<App />)
    await startGame()
    await playStages(10)
    await advance(1000)
    expect(screen.getByText('כל הכבוד!')).toBeInTheDocument()
    expect(storedResults()).toEqual([expect.objectContaining({ outcome: 'win', completedRounds: 10 })])

    goAbout()
    expect(within(historyCards()[0]).getByText('ניצחון')).toBeInTheDocument()
  })

  it('records once under React Strict Mode', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    await loseAtStage(2)
    expect(storedResults()).toHaveLength(1)
    fireEvent.click(button('אישור'))
    goAbout()
    goHome()
    expect(storedResults()).toHaveLength(1)
  })

  it('records the result the moment the game ends, even if the player leaves right away', async () => {
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    tap('blue') // wrong; the loss is decided
    goAbout() // leaving within the 1s before the dialog settles the loss
    expect(storedResults()).toEqual([expect.objectContaining({ outcome: 'loss', completedRounds: 0 })])
    expect(historyCards()).toHaveLength(1)
  })
})

describe('not recording', () => {
  it('pausing, navigating and resuming an active game add no record', async () => {
    render(<App />)
    await startGame()
    await advance(presentationMs(1))
    tap('red')
    await advance(1000)
    goAbout()
    expect(screen.getByText('אין עדיין משחקים שמורים')).toBeInTheDocument()
    goHome()
    fireEvent.click(button('המשך משחק'))
    await advance(0)
    await advance(presentationMs(2))
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })

  it('an active game cut short by a refresh adds no record and keeps the earlier history', async () => {
    const { unmount } = render(<App />)
    await loseAtStage(1)
    fireEvent.click(button('אישור'))
    await startGame()
    await advance(presentationMs(1)) // second game in progress
    unmount() // the page goes away

    render(<App />)
    expect(storedResults()).toHaveLength(1)
    expect(button('התחל משחק')).toBeInTheDocument()
  })
})

describe('history list', () => {
  it('keeps the 10 newest of 11 games, newest first, and they survive a refresh', async () => {
    const { unmount } = render(<App />)
    for (let game = 0; game < 11; game++) {
      vi.setSystemTime(new Date(2026, 9, 27, 12, game))
      await loseAtStage(game === 10 ? 2 : 1) // the 11th (newest) game completes one stage
      fireEvent.click(button('אישור'))
    }
    expect(storedResults()).toHaveLength(10)

    unmount()
    render(<App />)
    goAbout()
    const cards = historyCards()
    expect(cards).toHaveLength(10)
    expect(within(cards[0]).getByText('שלבים שהושלמו: 1')).toBeInTheDocument()
    expect(within(cards[0]).getByText('27.10.2026, 12:10')).toBeInTheDocument()
    expect(within(cards[9]).getByText('27.10.2026, 12:01')).toBeInTheDocument() // 12:00 was dropped
  })

  it('shows the empty state and no delete button when there is nothing saved', () => {
    render(<App />)
    goAbout()
    expect(screen.getByText('אין עדיין משחקים שמורים')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument()
  })
})

describe('deleting', () => {
  async function withTwoGames() {
    render(<App />)
    for (let game = 0; game < 2; game++) {
      await loseAtStage(1)
      fireEvent.click(button('אישור'))
    }
    goAbout()
    expect(historyCards()).toHaveLength(2)
  }

  it('"ביטול" leaves the history untouched', async () => {
    await withTwoGames()
    fireEvent.click(button('מחק היסטוריה'))
    const dialog = screen.getByRole('alertdialog', { name: 'למחוק את ההיסטוריה?' })
    expect(within(dialog).getByRole('button', { name: 'ביטול' })).toHaveFocus()

    fireEvent.click(within(dialog).getByRole('button', { name: 'ביטול' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(historyCards()).toHaveLength(2)
    expect(storedResults()).toHaveLength(2)
  })

  it('Escape cancels too', async () => {
    await withTwoGames()
    fireEvent.click(button('מחק היסטוריה'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(storedResults()).toHaveLength(2)
  })

  it('"מחק" after confirmation empties the history and shows the empty state', async () => {
    await withTwoGames()
    fireEvent.click(button('מחק היסטוריה'))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'מחק' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(historyCards()).toHaveLength(0)
    expect(screen.getByText('אין עדיין משחקים שמורים')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument()
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })
})

describe('storage failures', () => {
  it('a failed save is reported in the result dialog and does not block the next game', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    render(<App />)
    await loseAtStage(1)
    expect(screen.getByText('לא ניתן לשמור את תוצאת המשחק בהיסטוריה.')).toBeInTheDocument()

    fireEvent.click(button('אישור'))
    await startGame()
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
  })

  it('a failed delete is reported and the list stays on screen', async () => {
    render(<App />)
    await loseAtStage(1)
    fireEvent.click(button('אישור'))
    goAbout()

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    fireEvent.click(button('מחק היסטוריה'))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'מחק' }))

    expect(screen.getByText('מחיקת ההיסטוריה נכשלה. נסו שוב.')).toBeInTheDocument()
    expect(historyCards()).toHaveLength(1)
    expect(button('מחק היסטוריה')).toBeInTheDocument()
  })

  it('unreadable saved data is reported in "אודות", the game still works, and the next result replaces it', async () => {
    localStorage.setItem(HISTORY_KEY, '{broken')
    render(<App />)
    goAbout()
    expect(screen.getByText('לא ניתן לטעון את היסטוריית המשחקים.')).toBeInTheDocument()
    expect(screen.queryByText('אין עדיין משחקים שמורים')).not.toBeInTheDocument()

    goHome()
    await loseAtStage(1)
    fireEvent.click(button('אישור'))
    goAbout()
    expect(screen.queryByText('לא ניתן לטעון את היסטוריית המשחקים.')).not.toBeInTheDocument()
    expect(historyCards()).toHaveLength(1)
  })

  it('blocked storage still lets the game be played', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    render(<App />)
    await startGame()
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
  })
})
