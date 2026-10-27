import Board from '../components/Board'
import ResultDialog from '../components/ResultDialog'
import { TOTAL_ROUNDS } from '../game/constants'
import type { GameApi } from '../game/useGame'

type Props = { game: GameApi }

export default function HomeScreen({ game }: Props) {
  const { state, litColor, audioFailed, start, pressStart, dismiss } = game
  const { status, round, completedRounds } = state

  const label =
    status === 'presenting' ? 'המשחק מציג את הרצף' : status === 'awaitingInput' ? 'התור שלך' : ''
  const hint =
    status === 'presenting'
      ? 'המתן...'
      : status === 'awaitingInput'
        ? 'הקש על הצבעים לפי הסדר'
        : status === 'idle' && audioFailed
          ? 'לא ניתן להפעיל את הצלילים. נסו שוב.'
          : ''

  return (
    <>
      <header className="screen-header">
        <h1>סיימון</h1>
      </header>
      <main className="screen home">
        <p className="stage">
          שלב {round} מתוך {TOTAL_ROUNDS}
        </p>
        <p className="status" aria-live="polite">
          {label}
        </p>
        <div className="play">
          <div className="board-wrap">
            <Board
              litColor={litColor}
              dimmed={status === 'presenting'}
              interactive={status === 'awaitingInput'}
              onPressStart={pressStart}
            />
            {(status === 'won' || status === 'lost') && (
              <ResultDialog outcome={status} completedRounds={completedRounds} onConfirm={dismiss} />
            )}
          </div>
          <p className={`hint${audioFailed && status === 'idle' ? ' hint--error' : ''}`} aria-live="polite">
            {hint}
          </p>
        </div>
        <div className="actions">
          {status === 'idle' && (
            <button type="button" className="btn btn--primary" onClick={() => void start()}>
              התחל משחק
            </button>
          )}
        </div>
      </main>
    </>
  )
}
