import { COLORS, type GameColor } from '../game/colors'

type Props = {
  litColor: GameColor | null
  /** Sequence is being shown: unlit areas are dimmed. */
  dimmed: boolean
  /** Only true while it is the player's turn. */
  interactive: boolean
  onPressStart: (color: GameColor) => void
}

export default function Board({ litColor, dimmed, interactive, onPressStart }: Props) {
  return (
    <div
      className={`board${dimmed ? ' board--dim' : ''}`}
      role="group"
      aria-label="לוח המשחק"
    >
      {COLORS.map(({ id, label, position, row, col }) => (
        <button
          key={id}
          type="button"
          className={`quadrant quadrant--${id} quadrant--${position}${litColor === id ? ' quadrant--lit' : ''}`}
          style={{ gridRow: row, gridColumn: col }}
          data-position={position}
          aria-label={label}
          disabled={!interactive}
          onPointerDown={(e) => {
            e.preventDefault()
            onPressStart(id)
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault()
              onPressStart(id)
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  )
}
