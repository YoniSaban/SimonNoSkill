import { COLORS, type GameColor } from './colors'

/** Game-only randomness; a repeated colour next to itself is allowed. */
export function randomColor(): GameColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id
}
