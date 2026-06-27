import { useState, useEffect, useRef } from 'react'
import { getWellnessReply } from '../lib/ai.js'
import Avatar from './Avatar.jsx'

const COLORS = {
  bg: '#1a1a2e',
  surface: '#16213e',
  userBubble: '#1b5e20',
  aiBubble: '#2a2f4a',
  accent: '#00c853',
  text: '#e6e6e6',
  muted: '#9aa0b4',
  border: '#2a2f4a',
}

const OPENING_MESSAGE =
  'Hello, I just logged my mood and journal. Please greet me and share an initial insight.'

export default function Chat({ todayEntry, history = [] }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // 'idle' | 'thinking' | 'talking' — drives Mira's animation.
  const [avatarState, setAvatarState] = useState('idle')

  const scrollRef = useRef(null)
  const didGreet = useRef(false)
  const talkTimer = useRef(null)

  // Auto-scroll to the latest message whenever the list or loading state changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  // Clean up the talk timer on unmount.
  useEffect(() => () => clearTimeout(talkTimer.current), [])

  // Make Mira "talk" for a spell proportional to the reply length, then rest.
  function playTalking(text) {
    setAvatarState('talking')
    clearTimeout(talkTimer.current)
    const duration = Math.min(6000, Math.max(1800, (text?.length || 0) * 45))
    talkTimer.current = setTimeout(() => setAvatarState('idle'), duration)
  }

  // On first load, automatically request an opening greeting + insight.
  useEffect(() => {
    if (didGreet.current) return
    didGreet.current = true
    sendToApi(OPENING_MESSAGE, { showUser: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendToApi(message, { showUser = true } = {}) {
    if (showUser) {
      setMessages((prev) => [...prev, { role: 'user', content: message }])
    }
    setLoading(true)
    setAvatarState('thinking')

    try {
      const { reply } = await getWellnessReply({
        examType: todayEntry?.examType,
        mood: todayEntry?.mood,
        journal: todayEntry?.journal,
        history,
        message,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      playTalking(reply)
    } catch (err) {
      const fallback =
        "I'm having trouble connecting right now. Please try again in a moment."
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallback },
      ])
      playTalking(fallback)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setInput('')
    sendToApi(trimmed)
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.heading}>Wellness Companion</h2>

      <div ref={scrollRef} style={styles.messages}>
        {messages.length === 0 && !loading && (
          <p style={styles.empty}>Starting your check-in…</p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.row,
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                ...styles.bubble,
                ...(m.role === 'user' ? styles.userBubble : styles.aiBubble),
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.row, justifyContent: 'flex-start' }}>
            <div style={{ ...styles.bubble, ...styles.aiBubble }}>
              <span style={styles.typing}>● ● ●</span>
            </div>
          </div>
        )}
      </div>

      <form style={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          placeholder="Type a message…"
          onChange={(e) => setInput(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.sendBtn} disabled={loading}>
          Send
        </button>
      </form>
    </section>
  )
}

const styles = {
  card: {
    background: COLORS.surface,
    color: COLORS.text,
    borderRadius: 16,
    padding: '1.5rem',
    maxWidth: 480,
    margin: '0 auto',
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    marginTop: 0,
    marginBottom: '1rem',
  },
  messages: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    height: 380,
    overflowY: 'auto',
    paddingRight: '0.25rem',
    marginBottom: '1rem',
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: '2rem',
  },
  row: {
    display: 'flex',
  },
  bubble: {
    padding: '0.6rem 0.9rem',
    borderRadius: 14,
    maxWidth: '80%',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userBubble: {
    background: COLORS.userBubble,
    color: '#eafff0',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    background: COLORS.aiBubble,
    color: COLORS.text,
    borderBottomLeftRadius: 4,
  },
  typing: {
    letterSpacing: '0.15em',
    color: COLORS.muted,
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.65rem',
    borderRadius: 8,
    background: COLORS.bg,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.95rem',
  },
  sendBtn: {
    padding: '0 1.25rem',
    borderRadius: 8,
    border: 'none',
    background: COLORS.accent,
    color: '#04210f',
    fontWeight: 700,
    cursor: 'pointer',
  },
}
