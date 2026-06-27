// Shared AI client for MindMate.
//
// Strategy: try Puter.js first (client-side, user-pays, no API key, no quota
// limits for the developer). If Puter is unavailable or errors, fall back to
// the /api/chat Vercel serverless function (Google Gemini).
//
// Both paths use the same context-rich system prompt so responses stay
// consistent regardless of which provider answers.

// Claude Sonnet via Puter — warm, emotionally nuanced replies, ideal for an
// empathetic wellness companion. Reliable on Puter (no API key / quota for us).
const PUTER_MODEL = 'claude-sonnet-4-5'

// Builds the same empathetic-companion system prompt the serverless function uses.
function summarizeHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return 'No mood history is available for the past week.'
  }

  const lines = history.map((entry) => {
    const date = entry?.date ? String(entry.date) : 'unknown date'
    const mood =
      typeof entry?.mood === 'number' ? `${entry.mood}/10` : 'no mood score'
    const journal = entry?.journal
      ? ` — note: "${String(entry.journal).slice(0, 120)}"`
      : ''
    return `- ${date}: mood ${mood}${journal}`
  })

  const scores = history.map((e) => e?.mood).filter((m) => typeof m === 'number')
  const average =
    scores.length > 0
      ? (scores.reduce((sum, m) => sum + m, 0) / scores.length).toFixed(1)
      : 'N/A'

  return `Average mood over the period: ${average}/10.\n${lines.join('\n')}`
}

export function buildSystemPrompt({ examType, mood, journal, history }) {
  const examLabel = examType || 'a competitive exam'
  const moodLabel = typeof mood === 'number' ? `${mood}/10` : 'not provided'
  const historySummary = summarizeHistory(history)
  const journalText = journal
    ? `Today's journal entry: "${journal}"`
    : 'No journal entry was provided today.'

  return [
    'You are an empathetic mental wellness companion for Indian students preparing for competitive exams.',
    `The student is preparing for ${examLabel}. Their current mood score is ${moodLabel}.`,
    '',
    'Last 7 days mood history:',
    historySummary,
    '',
    journalText,
    '',
    'Your responsibilities:',
    '- Carefully read the journal entry and mood history to detect specific stress triggers (e.g., comparison with peers, syllabus pressure, family expectations, sleep, self-doubt).',
    '- Offer hyper-personalized coping strategies, mindfulness tips, or motivation tailored to this student and their exam.',
    '- Acknowledge the cultural context of Indian competitive exams without being preachy.',
    '',
    'Style rules:',
    '- Keep every response under 150 words.',
    '- Be warm, encouraging, and human — never clinical or robotic.',
    '- Do not diagnose. If the student appears to be in crisis, gently suggest reaching out to a trusted person or a helpline.',
  ].join('\n')
}

// Normalizes the various shapes puter.ai.chat() can return into a string.
function extractPuterText(response) {
  if (!response) return ''
  if (typeof response === 'string') return response
  if (typeof response.message?.content === 'string') return response.message.content
  if (Array.isArray(response.message?.content)) {
    return response.message.content.map((p) => p?.text ?? '').join('')
  }
  if (typeof response.text === 'string') return response.text
  return String(response)
}

async function tryPuter({ systemPrompt, message }) {
  if (typeof window === 'undefined' || !window.puter?.ai?.chat) {
    throw new Error('Puter.js not available')
  }

  const response = await window.puter.ai.chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    { model: PUTER_MODEL },
  )

  const text = extractPuterText(response).trim()
  if (!text) throw new Error('Empty response from Puter')
  return text
}

async function tryServerless({ examType, mood, journal, history, message }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examType, mood, journal, history, message }),
  })
  const data = await res.json()
  if (!res.ok || !data.reply) {
    throw new Error(data.error || 'Serverless AI request failed')
  }
  return data.reply
}

// Public entry point used by the components.
// Returns { reply, source } where source is 'puter' or 'gemini'.
export async function getWellnessReply({
  examType,
  mood,
  journal,
  history = [],
  message,
}) {
  const systemPrompt = buildSystemPrompt({ examType, mood, journal, history })

  // 1) Primary: Puter (client-side, no quota for us).
  try {
    const reply = await tryPuter({ systemPrompt, message })
    return { reply, source: 'puter' }
  } catch (puterErr) {
    // 2) Fallback: Gemini via serverless function.
    try {
      const reply = await tryServerless({
        examType,
        mood,
        journal,
        history,
        message,
      })
      return { reply, source: 'gemini' }
    } catch (serverErr) {
      throw new Error(
        `Both AI providers failed (Puter: ${puterErr.message}; Gemini: ${serverErr.message})`,
      )
    }
  }
}
