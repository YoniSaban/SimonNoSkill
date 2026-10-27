export const TOTAL_ROUNDS = 10

/** Pacing, per the "קצב הצגת הרצף" table in DESIGN.md. Identical for every round. */
export const PRESENT_DELAY_MS = 1000 // before the first colour of a presentation
export const LIGHT_MS = 600 // each colour in the sequence: light + sound
export const GAP_MS = 250 // pause between two colours
export const ROUND_COMPLETE_MS = 1000 // completed stage stays on screen before the next one
export const RESULT_DELAY_MS = 1000 // last press (win) / wrong press (loss) until the result dialog
export const PRESS_MIN_MS = 300 // player press: light + sound, or while the finger is down if longer
