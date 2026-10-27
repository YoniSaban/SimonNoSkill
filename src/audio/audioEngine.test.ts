import { startTone, stopAll, TONE_FREQUENCIES, unlockAudio } from './audioEngine'

describe('audioEngine', () => {
  it('gives each of the four colours a different pitch', () => {
    const pitches = Object.values(TONE_FREQUENCIES)
    expect(pitches).toHaveLength(4)
    expect(new Set(pitches).size).toBe(4)
  })

  it('reports failure when Web Audio is unavailable instead of pretending to work', async () => {
    expect(await unlockAudio()).toBe(false)
  })

  it('is a harmless no-op to play or stop before audio is unlocked', () => {
    expect(() => startTone('red').stop()).not.toThrow()
    expect(() => stopAll()).not.toThrow()
  })
})
