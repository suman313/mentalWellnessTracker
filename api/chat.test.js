import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from './chat.js'

// Minimal Express-style response mock capturing status/json/headers.
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    setHeader(key, value) {
      this.headers[key] = value
      return this
    },
  }
  return res
}

function makeReq({ method = 'POST', body } = {}) {
  return { method, body }
}

const ORIGINAL_KEY = process.env.GEMINI_API_KEY

describe('api/chat handler', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = ORIGINAL_KEY
  })

  it('rejects non-POST methods with 405', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('POST')
    expect(res.body.error).toMatch(/not allowed/i)
  })

  it('returns 500 when the API key is not configured', async () => {
    delete process.env.GEMINI_API_KEY
    const res = makeRes()
    await handler(makeReq({ body: { message: 'hi' } }), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toMatch(/GEMINI_API_KEY/)
  })

  it('returns 400 on invalid JSON string body', async () => {
    const res = makeRes()
    await handler(makeReq({ body: '{ not json' }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/Invalid JSON/)
  })

  it('returns 400 when message is missing or empty', async () => {
    const res1 = makeRes()
    await handler(makeReq({ body: {} }), res1)
    expect(res1.statusCode).toBe(400)

    const res2 = makeRes()
    await handler(makeReq({ body: { message: '   ' } }), res2)
    expect(res2.statusCode).toBe(400)
    expect(res2.body.error).toMatch(/non-empty/)
  })

  it('parses a stringified JSON body and returns the model reply', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '  Stay strong!  ' }] } }],
      }),
    })

    const res = makeRes()
    await handler(
      makeReq({
        body: JSON.stringify({ message: 'help', examType: 'NEET', mood: 6 }),
      }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.reply).toBe('Stay strong!')

    // Verify the system prompt and message reached Gemini.
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('generativelanguage.googleapis.com')
    expect(url).toContain('key=test-key')
    const payload = JSON.parse(init.body)
    expect(payload.contents[0].parts[0].text).toBe('help')
    expect(payload.systemInstruction.parts[0].text).toContain('NEET')
  })

  it('maps a Gemini 429 to a 429 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    })
    const res = makeRes()
    await handler(makeReq({ body: { message: 'help' } }), res)
    expect(res.statusCode).toBe(429)
    expect(res.body.error).toMatch(/Gemini API error/)
  })

  it('maps other Gemini failures to 502', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad request',
    })
    const res = makeRes()
    await handler(makeReq({ body: { message: 'help' } }), res)
    expect(res.statusCode).toBe(502)
  })

  it('returns 502 when the model produces no text', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    })
    const res = makeRes()
    await handler(makeReq({ body: { message: 'help' } }), res)
    expect(res.statusCode).toBe(502)
    expect(res.body.error).toMatch(/No reply/)
  })

  it('returns 500 when fetch itself throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network boom'))
    const res = makeRes()
    await handler(makeReq({ body: { message: 'help' } }), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.detail).toMatch(/network boom/)
  })
})
