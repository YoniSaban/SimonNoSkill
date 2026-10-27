export type GameColor = 'green' | 'red' | 'yellow' | 'blue'

export type BoardPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type ColorDef = {
  id: GameColor
  label: string
  position: BoardPosition
  /** 1-based grid row/column; the board is always LTR, so this is spatial and never mirrors in RTL. */
  row: 1 | 2
  col: 1 | 2
}

export const COLORS: readonly ColorDef[] = [
  { id: 'green', label: 'ירוק', position: 'top-left', row: 1, col: 1 },
  { id: 'red', label: 'אדום', position: 'top-right', row: 1, col: 2 },
  { id: 'yellow', label: 'צהוב', position: 'bottom-left', row: 2, col: 1 },
  { id: 'blue', label: 'כחול', position: 'bottom-right', row: 2, col: 2 },
]
