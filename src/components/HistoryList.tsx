import type { GameResult } from '../history/historyStorage'

const dateTimeFormat = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type Props = { results: GameResult[] }

export default function HistoryList({ results }: Props) {
  return (
    <ol className="history">
      {results.map((r) => (
        <li key={r.id} className="history-card">
          <div className="history-card__main">
            <span className="history-card__rounds">שלבים שהושלמו: {r.completedRounds}</span>
            <span className={`history-card__outcome history-card__outcome--${r.outcome}`}>
              {r.outcome === 'win' ? 'ניצחון' : 'הפסד'}
            </span>
          </div>
          {/* Isolated LTR so the date and time digits never reorder inside Hebrew text. */}
          <time className="history-card__date" dateTime={r.finishedAt} dir="ltr">
            {dateTimeFormat.format(new Date(r.finishedAt))}
          </time>
        </li>
      ))}
    </ol>
  )
}
