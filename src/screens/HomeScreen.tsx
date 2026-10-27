import Board from '../components/Board'
import ResultDialog from '../components/ResultDialog'
import { TOTAL_ROUNDS } from '../game/constants'
import type { GameApi } from '../game/useGame'

type Props = {
  game: GameApi
  /** The last finished game could not be saved to the history. */
  saveFailed: boolean
}

export default function HomeScreen({ game, saveFailed }: Props) {
  const { state, litColor, audioFailed, start, resume, pressStart, dismiss } = game
  const { status, round, completedRounds } = state

  const label =
    status === 'presenting'
      ? 'המשחק מציג את הרצף'
      : status === 'awaitingInput'
        ? 'התור שלך'
        : status === 'paused'
          ? 'המשחק מושהה'
          : ''
  const audioError = audioFailed && (status === 'idle' || status === 'paused')
  const hint = audioError
    ? 'לא ניתן להפעיל את הצלילים. נסו שוב.'
    : status === 'presenting'
      ? 'המתן...'
      : status === 'awaitingInput'
        ? 'הקש על הצבעים לפי הסדר'
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
              dimmed={status === 'presenting' || status === 'paused'}
              interactive={status === 'awaitingInput'}
              onPressStart={pressStart}
            />
            {(status === 'won' || status === 'lost') && (
              <ResultDialog
                outcome={status}
                completedRounds={completedRounds}
                saveFailed={saveFailed}
                onConfirm={dismiss}
              />
            )}
          </div>
          <p className={`hint${audioError ? ' hint--error' : ''}`} aria-live="polite">
            {hint}
          </p>
        </div>
        <div className="actions">
          {status === 'idle' && (
            <button type="button" className="btn btn--primary" onClick={() => void start()}>
              התחל משחק
            </button>
          )}
          {status === 'paused' && (
            <button type="button" className="btn btn--primary" onClick={() => void resume()}>
              המשך משחק
            </button>
          )}
        </div>
      </main>
    </>
  )
}
