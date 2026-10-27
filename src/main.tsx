import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/heebo/400.css'
import '@fontsource/heebo/600.css'
import '@fontsource/heebo/700.css'
import './styles.css'
import App from './App'

// ADR-6: no onNeedRefresh and no skipWaiting – an update waits until every
// window of the app is closed, so it can never reload an active game.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
