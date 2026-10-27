import Board from '../components/Board'
import { TOTAL_ROUNDS } from '../game/constants'

export default function HomeScreen() {
  return (
    <>
      <header className="screen-header">
        <h1>סיימון</h1>
      </header>
      <main className="screen home">
        <p className="stage">
          שלב 1 מתוך {TOTAL_ROUNDS}
        </p>
        <Board />
        <div className="status" aria-live="polite" />
        <button type="button" className="btn btn--primary">
          התחל משחק
        </button>
      </main>
    </>
  )
}
