import type { ReactNode } from 'react'

export type Screen = 'home' | 'about'

type Props = {
  screen: Screen
  onNavigate: (screen: Screen) => void
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" />
    </svg>
  )
}

const TABS: { id: Screen; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'בית', icon: <HomeIcon /> },
  { id: 'about', label: 'אודות', icon: <InfoIcon /> },
]

export default function BottomNav({ screen, onNavigate }: Props) {
  return (
    <nav className="nav" aria-label="ניווט ראשי">
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className="nav__tab"
          aria-current={screen === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
