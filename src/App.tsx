import { useState } from 'react'
import BottomNav, { type Screen } from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import AboutScreen from './screens/AboutScreen'
import { useGame } from './game/useGame'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  // Lives here (not in HomeScreen) so switching screens never unmounts the game.
  const game = useGame()

  const navigate = (next: Screen) => {
    // Temporary until Milestone 3 adds pause/resume: leaving the game cancels it.
    if (next === 'about' && game.state.status !== 'idle') game.abandon()
    setScreen(next)
  }

  return (
    <div className="app">
      {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      <BottomNav screen={screen} onNavigate={navigate} />
    </div>
  )
}
