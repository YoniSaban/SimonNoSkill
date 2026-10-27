import { useEffect, useRef, useState } from 'react'
import BottomNav, { type Screen } from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import AboutScreen from './screens/AboutScreen'
import { useGame } from './game/useGame'
import { useHistory } from './history/useHistory'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  // Both live here (not in a screen) so switching screens never unmounts them.
  const game = useGame()
  const history = useHistory()

  // Record each finished game exactly once, the moment it ends (also under
  // StrictMode's double effects, and never again on "אישור" or navigation).
  const recordedGameIdRef = useRef<number | null>(null)
  const { status, gameId, completedRounds } = game.state
  const { add } = history
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return
    if (recordedGameIdRef.current === gameId) return
    recordedGameIdRef.current = gameId
    add(status === 'won' ? 'win' : 'loss', completedRounds)
  }, [status, gameId, completedRounds, add])

  const navigate = (next: Screen) => {
    // Leaving the game screen pauses an active game; coming back never resumes it.
    if (next === 'about') game.pause()
    setScreen(next)
  }

  return (
    <div className="app">
      {screen === 'home' ? (
        <HomeScreen game={game} saveFailed={history.saveFailed} />
      ) : (
        <AboutScreen history={history} />
      )}
      <BottomNav screen={screen} onNavigate={navigate} />
    </div>
  )
}
