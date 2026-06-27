import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { getWellnessReply } from './lib/ai.js'

// Stub AI so Chat/Insights don't hit the network.
vi.mock('./lib/ai.js', () => ({
  getWellnessReply: vi.fn().mockResolvedValue({ reply: 'AI says hi', source: 'puter' }),
}))

const STORAGE_KEY = 'wellnessHistory'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

describe('App', () => {
  beforeEach(() => {
    getWellnessReply.mockClear()
  })

  it('shows the MoodLogger when nothing is logged today', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /daily check-in/i }),
    ).toBeInTheDocument()
  })

  it('shows the Chat companion when today is already logged', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { date: todayString(), mood: 7, examType: 'JEE', journal: 'Good day' },
      ]),
    )
    render(<App />)
    // Scope to the section heading (h2); the h1 subtitle also says "Wellness Companion".
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /wellness companion/i,
      }),
    ).toBeInTheDocument()
  })

  it('switches to the Insights tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /insights/i }))
    expect(
      screen.getByRole('heading', { name: /your insights/i }),
    ).toBeInTheDocument()
  })

  it('transitions from logging to the chat after a check-in', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Logging form is shown first.
    expect(
      screen.getByRole('heading', { name: /daily check-in/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save check-in/i }))

    // After logging, the same Today tab now renders the Chat companion.
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /wellness companion/i }),
      ).toBeInTheDocument()
    })
  })
})
