import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chat from './Chat.jsx'
import { getWellnessReply } from '../lib/ai.js'

// Mock the AI module so no real network/Puter calls happen.
vi.mock('../lib/ai.js', () => ({
  getWellnessReply: vi.fn(),
}))

const todayEntry = {
  date: '2026-06-27',
  mood: 6,
  examType: 'NEET',
  journal: 'Bit anxious about bio',
}

describe('Chat', () => {
  beforeEach(() => {
    getWellnessReply.mockReset()
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() }
    window.SpeechRecognition = undefined
    window.webkitSpeechRecognition = undefined
  })

  it('offers push-to-talk voice control that starts and stops speech recognition', async () => {
    const start = vi.fn()
    const stop = vi.fn()
    const recognition = {
      start,
      stop,
      lang: 'en-US',
      continuous: false,
      interimResults: false,
      onresult: null,
      onerror: null,
      onend: null,
    }

    window.SpeechRecognition = vi.fn(() => recognition)

    render(<Chat todayEntry={todayEntry} history={[todayEntry]} />)
    const button = screen.getByRole('button', { name: /hold to talk/i })

    fireEvent.mouseDown(button)
    expect(start).toHaveBeenCalledTimes(1)

    fireEvent.mouseUp(button)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('requests an opening greeting automatically on mount', async () => {
    getWellnessReply.mockResolvedValue({ reply: 'Hi there! 🌱', source: 'puter' })
    render(<Chat todayEntry={todayEntry} history={[todayEntry]} />)

    await waitFor(() => {
      expect(screen.getByText('Hi there! 🌱')).toBeInTheDocument()
    })

    // The greeting is auto-sent (not shown as a user bubble) exactly once.
    expect(getWellnessReply).toHaveBeenCalledTimes(1)
    expect(getWellnessReply).toHaveBeenCalledWith(
      expect.objectContaining({
        examType: 'NEET',
        mood: 6,
        journal: 'Bit anxious about bio',
      }),
    )
  })

  it('sends a user message and renders the AI reply', async () => {
    const user = userEvent.setup()
    getWellnessReply
      .mockResolvedValueOnce({ reply: 'Welcome!', source: 'puter' })
      .mockResolvedValueOnce({ reply: 'Try a 5-minute breather.', source: 'puter' })

    render(<Chat todayEntry={todayEntry} history={[todayEntry]} />)
    await screen.findByText('Welcome!')

    await user.type(screen.getByPlaceholderText(/type a message/i), 'I feel stuck')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText('I feel stuck')).toBeInTheDocument()
    expect(await screen.findByText('Try a 5-minute breather.')).toBeInTheDocument()
  })

  it('shows a friendly error message when the AI call fails', async () => {
    getWellnessReply.mockRejectedValue(new Error('all providers down'))
    render(<Chat todayEntry={todayEntry} history={[todayEntry]} />)

    expect(
      await screen.findByText(/having trouble connecting/i),
    ).toBeInTheDocument()
  })

  it('does not send empty input', async () => {
    const user = userEvent.setup()
    getWellnessReply.mockResolvedValue({ reply: 'Hello', source: 'puter' })
    render(<Chat todayEntry={todayEntry} history={[todayEntry]} />)
    await screen.findByText('Hello')

    // One call from the opening greeting only.
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(getWellnessReply).toHaveBeenCalledTimes(1)
  })
})
