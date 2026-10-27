import { useCallback, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import HistoryList from '../components/HistoryList'
import type { HistoryApi } from '../history/useHistory'

type Props = { history: HistoryApi }

export default function AboutScreen({ history }: Props) {
  const { results, loadFailed, deleteFailed, clear } = history
  const [confirming, setConfirming] = useState(false)
  const closeConfirm = useCallback(() => setConfirming(false), [])

  return (
    <>
      <header className="screen-header">
        <h1>אודות</h1>
      </header>
      <main className="screen about">
        <section className="card" aria-labelledby="about-game">
          <h2 id="about-game">על המשחק</h2>
          <p>סיימון הוא משחק זיכרון: המשחק מציג רצף צבעים וצלילים, ואתם משחזרים אותו.</p>
          <ul>
            <li>זכרו את רצף הצבעים שמוצג.</li>
            <li>לחצו על הצבעים באותו הסדר.</li>
            <li>בכל שלב מתווסף צבע אחד. טעות אחת מסיימת את המשחק.</li>
            <li>נסו להגיע עד שלב 10!</li>
          </ul>
        </section>

        <section aria-labelledby="history-title">
          <h2 id="history-title">10 המשחקים האחרונים</h2>
          {loadFailed && (
            <p className="card error-text" role="alert">
              לא ניתן לטעון את היסטוריית המשחקים.
            </p>
          )}
          {results.length > 0 ? (
            <HistoryList results={results} />
          ) : (
            !loadFailed && <div className="card card--empty">אין עדיין משחקים שמורים</div>
          )}
          {deleteFailed && (
            <p className="error-text history__error" role="alert">
              מחיקת ההיסטוריה נכשלה. נסו שוב.
            </p>
          )}
          {results.length > 0 && (
            <button
              type="button"
              className="btn btn--secondary history__delete"
              onClick={() => setConfirming(true)}
            >
              מחק היסטוריה
            </button>
          )}
        </section>
      </main>

      {confirming && (
        <ConfirmDialog
          title="למחוק את ההיסטוריה?"
          description="כל תוצאות המשחקים השמורות יימחקו."
          confirmLabel="מחק"
          cancelLabel="ביטול"
          onConfirm={() => {
            clear()
            setConfirming(false)
          }}
          onCancel={closeConfirm}
        />
      )}
    </>
  )
}
