import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoodLogger from './MoodLogger.jsx'

const STORAGE_KEY = 'wellnessHistory'

function readHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

describe('MoodLogger', () => {
  it('renders the check-in form with default mood band', () => {
    render(<MoodLogger />)
    expect(
      screen.getByRole('heading', { name: /daily check-in/i }),
    ).toBeInTheDocument()
    // Default mood is 5 → "Okay" band.
    expect(screen.getByText('Okay')).toBeInTheDocument()
    expect(screen.getByText('5 / 10')).toBeInTheDocument()
  })

  it('updates the mood face band as the slider changes', () => {
    render(<MoodLogger />)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '2' } })
    expect(screen.getByText('Struggling')).toBeInTheDocument()

    fireEvent.change(slider, { target: { value: '9' } })
    expect(screen.getByText('Feeling Good')).toBeInTheDocument()
  })

  it('saves an entry to localStorage and calls onLogComplete', async () => {
    const user = userEvent.setup()
    const onLogComplete = vi.fn()
    render(<MoodLogger onLogComplete={onLogComplete} />)

    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } })
    await user.selectOptions(
      screen.getByLabelText(/exam you're preparing for/i),
      'JEE',
    )
    await user.type(
      screen.getByLabelText(/today's journal/i),
      'Felt productive today',
    )
    await user.click(screen.getByRole('button', { name: /save check-in/i }))

    const history = readHistory()
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      mood: 8,
      examType: 'JEE',
      journal: 'Felt productive today',
    })
    expect(history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    expect(onLogComplete).toHaveBeenCalledTimes(1)
    expect(onLogComplete).toHaveBeenCalledWith(
      expect.objectContaining({ mood: 8, examType: 'JEE' }),
    )
  })

  it('trims journal whitespace before saving', async () => {
    const user = userEvent.setup()
    render(<MoodLogger />)
    await user.type(screen.getByLabelText(/today's journal/i), '   spaced   ')
    await user.click(screen.getByRole('button', { name: /save check-in/i }))
    expect(readHistory()[0].journal).toBe('spaced')
  })

  it('appends to existing history and trims to 30 entries', async () => {
    const user = userEvent.setup()
    // Seed 30 prior entries.
    const seed = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      mood: 5,
      examType: 'NEET',
      journal: '',
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))

    render(<MoodLogger />)
    await user.click(screen.getByRole('button', { name: /save check-in/i }))

    const history = readHistory()
    expect(history).toHaveLength(30)
    // Oldest entry was dropped; the second-oldest is now first.
    expect(history[0].date).toBe('2026-05-02')
  })

  it('shows a saved confirmation after submitting', async () => {
    const user = userEvent.setup()
    render(<MoodLogger />)
    await user.click(screen.getByRole('button', { name: /save check-in/i }))
    expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()
  })

  it('recovers from corrupted localStorage by starting fresh', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{')
    render(<MoodLogger />)
    await user.click(screen.getByRole('button', { name: /save check-in/i }))
    expect(readHistory()).toHaveLength(1)
  })
})
