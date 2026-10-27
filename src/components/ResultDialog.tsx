type Props = {
  outcome: 'won' | 'lost'
  completedRounds: number
  /** The result could not be written to the history. */
  saveFailed: boolean
  onConfirm: () => void
}

function completedText(n: number): string {
  if (n === 0) return 'לא השלמת אף שלב'
  if (n === 1) return 'השלמת שלב אחד'
  return `השלמת ${n} שלבים`
}

export default function ResultDialog({ outcome, completedRounds, saveFailed, onConfirm }: Props) {
  const won = outcome === 'won'
  return (
    <div
      className={`result result--${outcome}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      {won ? (
        <h2 id="result-title" className="result__title">
          <span className="result__title-main">כל הכבוד!</span>
          <span>ניצחת!</span>
        </h2>
      ) : (
        <>
          <h2 id="result-title" className="result__title result__title-main">
            נפסלת!
          </h2>
          <p className="result__text">{completedText(completedRounds)}</p>
        </>
      )}
      {saveFailed && (
        <p className="error-text" role="alert">
          לא ניתן לשמור את תוצאת המשחק בהיסטוריה.
        </p>
      )}
      <button type="button" className="btn btn--primary" autoFocus onClick={onConfirm}>
        אישור
      </button>
    </div>
  )
}
