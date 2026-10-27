import { useState } from 'react'
import BottomNav, { type Screen } from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import AboutScreen from './screens/AboutScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  return (
    <div className="app">
      {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      <BottomNav screen={screen} onNavigate={setScreen} />
    </div>
  )
}
