import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { COLORS } from './game/colors'

describe('App shell', () => {
  it('renders the home screen with title, stage indicator and start button', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument()
  })

  it('renders the four board areas in the spec positions', () => {
    render(<App />)
    const board = screen.getByRole('group', { name: 'לוח המשחק' })
    const positions = Object.fromEntries(
      within(board)
        .getAllByRole('button')
        .map((b) => [b.getAttribute('aria-label'), b.getAttribute('data-position')]),
    )
    expect(positions).toEqual({
      ירוק: 'top-left',
      אדום: 'top-right',
      צהוב: 'bottom-left',
      כחול: 'bottom-right',
    })
    expect(COLORS).toHaveLength(4)
  })

  it('keeps the board inert until a game is started', () => {
    render(<App />)
    const board = screen.getByRole('group', { name: 'לוח המשחק' })
    within(board)
      .getAllByRole('button')
      .forEach((b) => expect(b).toBeDisabled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates between exactly two screens without a page reload', async () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'ניווט ראשי' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['בית', 'אודות'])

    await userEvent.click(within(nav).getByRole('button', { name: 'אודות' }))
    expect(screen.getByRole('heading', { level: 1, name: 'אודות' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '10 המשחקים האחרונים' })).toBeInTheDocument()
    expect(screen.getByText('אין עדיין משחקים שמורים')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(within(nav).getByRole('button', { name: 'בית' }))
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page')
  })
})
