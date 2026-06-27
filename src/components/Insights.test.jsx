import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Insights from './Insights.jsx'
import { getWellnessReply } from '../lib/ai.js'

vi.mock('../lib/ai.js', () => ({
  getWellnessReply: vi.fn(),
}))

// computeStreak reads the real `new Date()`, so build dates relative to today
// instead of pinning the clock (fake timers interfere with async findBy* polling).
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function entry(date, mood, extra = {}) {
  return { date, mood, examType: 'NEET', journal: '', ...extra }
}

describe('Insights', () => {
  beforeEach(() => {
    getWellnessReply.mockReset()
  })

  it('shows an empty state when there is no history', () => {
    render(<Insights history={[]} />)
    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /analyze my patterns/i }),
    ).toBeDisabled()
  })

  it('computes the weekly average over the last 7 entries', () => {
    const history = [
      entry(daysAgo(2), 4),
      entry(daysAgo(1), 6),
      entry(daysAgo(0), 8),
    ]
    render(<Insights history={history} />)
    // (4 + 6 + 8) / 3 = 6.0
    expect(screen.getByText('6.0')).toBeInTheDocument()
  })

  it('computes a current streak ending today', () => {
    const history = [
      entry(daysAgo(2), 5),
      entry(daysAgo(1), 5),
      entry(daysAgo(0), 5),
    ]
    render(<Insights history={history} />)
    expect(screen.getByText(/3 days/i)).toBeInTheDocument()
  })

  it('counts the streak from yesterday when today is not logged', () => {
    const history = [entry(daysAgo(2), 5), entry(daysAgo(1), 5)]
    render(<Insights history={history} />)
    expect(screen.getByText(/2 days/i)).toBeInTheDocument()
  })

  it('breaks the streak when there is a gap', () => {
    // Today logged, but yesterday missing → streak of 1.
    const history = [entry(daysAgo(3), 5), entry(daysAgo(0), 5)]
    render(<Insights history={history} />)
    expect(screen.getByText(/\b1 day\b/i)).toBeInTheDocument()
  })

  it('renders the mood trend chart with one point per recent entry', () => {
    const history = [
      entry(daysAgo(2), 3),
      entry(daysAgo(1), 5),
      entry(daysAgo(0), 7),
    ]
    render(<Insights history={history} />)
    const chart = screen.getByRole('img', { name: /mood trend/i })
    // One <circle> data point per entry.
    expect(chart.querySelectorAll('circle')).toHaveLength(3)
  })

  it('runs AI analysis and displays the reply', async () => {
    const user = userEvent.setup()
    getWellnessReply.mockResolvedValue({
      reply: 'You tend to dip before mock tests.',
      source: 'gemini',
    })
    render(<Insights history={[entry(daysAgo(0), 6)]} />)

    await user.click(screen.getByRole('button', { name: /analyze my patterns/i }))

    expect(
      await screen.findByText('You tend to dip before mock tests.'),
    ).toBeInTheDocument()
    expect(getWellnessReply).toHaveBeenCalledWith(
      expect.objectContaining({ history: expect.any(Array) }),
    )
  })

  it('shows a fallback message when analysis fails', async () => {
    const user = userEvent.setup()
    getWellnessReply.mockRejectedValue(new Error('down'))
    render(<Insights history={[entry(daysAgo(0), 6)]} />)

    await user.click(screen.getByRole('button', { name: /analyze my patterns/i }))
    expect(
      await screen.findByText(/could not analyze your patterns/i),
    ).toBeInTheDocument()
  })
})
