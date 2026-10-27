import { COLORS } from '../game/colors'

export default function Board() {
  return (
    <div className="board" role="group" aria-label="לוח המשחק">
      {COLORS.map(({ id, label, position, row, col }) => (
        <button
          key={id}
          type="button"
          className={`quadrant quadrant--${id} quadrant--${position}`}
          style={{ gridRow: row, gridColumn: col }}
          data-position={position}
          aria-label={label}
          disabled
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  )
}
