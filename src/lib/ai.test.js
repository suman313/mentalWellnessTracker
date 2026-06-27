import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSystemPrompt, getWellnessReply } from './ai.js'

const SAMPLE_HISTORY = [
  { date: '2026-06-20', mood: 4, journal: 'Tired after mock test' },
  { date: '2026-06-21', mood: 7, journal: '' },
  { date: '2026-06-22', mood: 6 },
]

describe('buildSystemPrompt', () => {
  it('includes the exam type and mood score', () => {
    const prompt = buildSystemPrompt({
      examType: 'NEET',
      mood: 8,
      journal: 'Feeling ready',
      history: [],
    })
    expect(prompt).toContain('NEET')
    expect(prompt).toContain('8/10')
    expect(prompt).toContain("Today's journal entry: \"Feeling ready\"")
  })

  it('falls back to defaults when fields are missing', () => {
    const prompt = buildSystemPrompt({})
    expect(prompt).toContain('a competitive exam')
    expect(prompt).toContain('not provided')
    expect(prompt).toContain('No journal entry was provided today.')
  })

  it('reports no history when history is empty', () => {
    const prompt = buildSystemPrompt({ history: [] })
    expect(prompt).toContain('No mood history is available for the past week.')
  })

  it('summarizes history with an average and per-day lines', () => {
    const prompt = buildSystemPrompt({ history: SAMPLE_HISTORY })
    // Average of 4, 7, 6 = 5.7
    expect(prompt).toContain('Average mood over the period: 5.7/10.')
    expect(prompt).toContain('- 2026-06-20: mood 4/10')
    expect(prompt).toContain('note: "Tired after mock test"')
    // Entry without a mood score / journal still renders gracefully.
    expect(prompt).toContain('- 2026-06-22: mood 6/10')
  })

  it('truncates long journal notes to 120 chars in the summary', () => {
    const long = 'x'.repeat(200)
    const prompt = buildSystemPrompt({
      history: [{ date: '2026-06-23', mood: 5, journal: long }],
    })
    expect(prompt).toContain('x'.repeat(120))
    expect(prompt).not.toContain('x'.repeat(121))
  })

  it('handles non-array history defensively', () => {
    const prompt = buildSystemPrompt({ history: 'not-an-array' })
    expect(prompt).toContain('No mood history is available for the past week.')
  })
})

describe('getWellnessReply', () => {
  const baseArgs = {
    examType: 'JEE',
    mood: 5,
    journal: 'Stressed about physics',
    history: SAMPLE_HISTORY,
    message: 'Help me focus',
  }

  beforeEach(() => {
    delete window.puter
    vi.restoreAllMocks()
  })

  it('uses Puter as the primary provider when available', async () => {
    const chat = vi.fn().mockResolvedValue('Puter says hi')
    window.puter = { ai: { chat } }

    const result = await getWellnessReply(baseArgs)

    expect(result).toEqual({ reply: 'Puter says hi', source: 'puter' })
    expect(chat).toHaveBeenCalledTimes(1)
    // Puter is called with [system, user] messages and a model option.
    const [messages, options] = chat.mock.calls[0]
    expect(messages[0].role).toBe('system')
    expect(messages[1]).toEqual({ role: 'user', content: 'Help me focus' })
    expect(options.model).toBe('google/gemini-2.0-flash')
  })

  it('normalizes a Puter response shaped as { message: { content } }', async () => {
    window.puter = {
      ai: { chat: vi.fn().mockResolvedValue({ message: { content: 'Nested text' } }) },
    }
    const result = await getWellnessReply(baseArgs)
    expect(result.reply).toBe('Nested text')
    expect(result.source).toBe('puter')
  })

  it('normalizes a Puter response with an array content block', async () => {
    window.puter = {
      ai: {
        chat: vi.fn().mockResolvedValue({
          message: { content: [{ text: 'part1 ' }, { text: 'part2' }] },
        }),
      },
    }
    const result = await getWellnessReply(baseArgs)
    expect(result.reply).toBe('part1 part2')
  })

  it('falls back to the serverless Gemini endpoint when Puter is unavailable', async () => {
    // No window.puter set → tryPuter throws → fallback to fetch.
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'Gemini reply' }),
    })

    const result = await getWellnessReply(baseArgs)

    expect(result).toEqual({ reply: 'Gemini reply', source: 'gemini' })
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.message).toBe('Help me focus')
    expect(body.examType).toBe('JEE')
  })

  it('falls back to Gemini when Puter returns an empty response', async () => {
    window.puter = { ai: { chat: vi.fn().mockResolvedValue('   ') } }
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'Gemini saved it' }),
    })

    const result = await getWellnessReply(baseArgs)
    expect(result.source).toBe('gemini')
    expect(result.reply).toBe('Gemini saved it')
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('throws a combined error when both providers fail', async () => {
    window.puter = {
      ai: { chat: vi.fn().mockRejectedValue(new Error('puter down')) },
    }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'gemini down' }),
    })

    await expect(getWellnessReply(baseArgs)).rejects.toThrow(
      /Both AI providers failed/,
    )
    await expect(getWellnessReply(baseArgs)).rejects.toThrow(/puter down/)
    await expect(getWellnessReply(baseArgs)).rejects.toThrow(/gemini down/)
  })

  it('throws when serverless responds ok but without a reply', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    await expect(getWellnessReply(baseArgs)).rejects.toThrow(
      /Both AI providers failed/,
    )
  })
})
