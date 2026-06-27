import { useCallback, useEffect, useRef, useState } from 'react'
import { getWellnessReply } from '../lib/ai.js'
import Avatar from './Avatar.jsx'

const COLORS = {
  bg: '#0c1424',
  surface: '#13223b',
  userBubble: '#1b5e20',
  aiBubble: '#1f2f47',
  accent: '#3be28d',
  text: '#f5f7ff',
  muted: '#9aa0b4',
  border: '#223a57',
}

const OPENING_MESSAGE =
  'Hello, I just logged my mood and journal. Please greet me and share an initial insight.'

function normalizeVoiceTranscript(text) {
  return text.replace(/^mira\s*,?\s*/i, '').trim()
}

export default function Chat({ todayEntry, history = [] }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  // 'idle' | 'thinking' | 'talking' — drives Mira's animation.
  const [avatarState, setAvatarState] = useState('idle')

  const scrollRef = useRef(null)
  const didGreet = useRef(false)
  const talkTimer = useRef(null)
  const recognitionRef = useRef(null)
  const loadingRef = useRef(false)
  const pendingMessagesRef = useRef([])

  const clearVoiceState = useCallback(() => {
    setListening(false)
    setAvatarState('idle')
  }, [])

  // Auto-scroll to the latest message whenever the list or loading state changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  // Clean up the talk timer and recognition on unmount.
  useEffect(() => {
    return () => {
      clearTimeout(talkTimer.current)
      recognitionRef.current?.stop?.()
    }
  }, [])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  // Make Mira "talk" for a spell proportional to the reply length, then rest.
  const playTalking = useCallback((text) => {
    setAvatarState('talking')
    clearTimeout(talkTimer.current)
    const duration = Math.min(6000, Math.max(1800, (text?.length || 0) * 45))
    talkTimer.current = setTimeout(() => setAvatarState('idle'), duration)
  }, [])

  const speak = useCallback((text) => {
    if (typeof window === 'undefined') return

    const speechSynthesis = window.speechSynthesis
    const SpeechSynthesisUtteranceCtor = window.SpeechSynthesisUtterance

    if (!speechSynthesis || !SpeechSynthesisUtteranceCtor) return

    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtteranceCtor(text)
    utterance.lang = 'en-US'
    utterance.rate = 1
    utterance.pitch = 1
    speechSynthesis.speak(utterance)
  }, [])

  const sendToApi = useCallback(
    async (message, { showUser = true } = {}) => {
      if (loadingRef.current) {
        if (showUser) {
          pendingMessagesRef.current.push(message)
        }
        return
      }

      loadingRef.current = true
      setLoading(true)
      setAvatarState('thinking')

      if (showUser) {
        setMessages((prev) => [...prev, { role: 'user', content: message }])
      }

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
        speak(reply)
      } catch {
        const fallback =
          "I'm having trouble connecting right now. Please try again in a moment."
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fallback },
        ])
        playTalking(fallback)
        speak(fallback)
      } finally {
        loadingRef.current = false
        setLoading(false)

        const nextMessage = pendingMessagesRef.current.shift()
        if (nextMessage) {
          sendToApi(nextMessage)
        }
      }
    },
    [history, playTalking, speak, todayEntry?.examType, todayEntry?.journal, todayEntry?.mood],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim()

      const cleaned = normalizeVoiceTranscript(transcript)

      if (cleaned) {
        setInput(cleaned)
        sendToApi(cleaned)
      }
      clearVoiceState()
    }

    recognition.onerror = () => {
      clearVoiceState()
    }

    recognition.onend = () => {
      clearVoiceState()
    }

    recognitionRef.current = recognition
  }, [clearVoiceState, sendToApi])

  const startVoice = useCallback(() => {
    if (!recognitionRef.current || listening) return

    setListening(true)
    setAvatarState('talking')
    recognitionRef.current.start()
  }, [listening])

  const stopVoice = useCallback(() => {
    if (!recognitionRef.current || !listening) return

    recognitionRef.current.stop()
    clearVoiceState()
  }, [clearVoiceState, listening])

  // On first load, automatically request an opening greeting + insight.
  useEffect(() => {
    if (didGreet.current) return
    didGreet.current = true
    sendToApi(OPENING_MESSAGE, { showUser: false })
  }, [sendToApi])

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || loading) return
      setInput('')
      sendToApi(trimmed)
    },
    [input, loading, sendToApi],
  )

  return (
    <section style={styles.card}>
      <div style={styles.assistantBar}>
        <Avatar state={loading ? 'thinking' : avatarState} mood={todayEntry?.mood} />
        <div style={styles.assistantCopy}>
          <div style={styles.assistantName}>Mira</div>
          <div style={styles.assistantHint}>
            {listening ? 'Listening for your voice…' : 'Say “Mira” and tell me how you feel'}
          </div>
        </div>
        <button
          type="button"
          onMouseDown={startVoice}
          onMouseUp={stopVoice}
          onMouseLeave={stopVoice}
          onTouchStart={startVoice}
          onTouchEnd={stopVoice}
          onTouchCancel={stopVoice}
          style={{
            ...styles.voiceBtn,
            ...(listening ? styles.voiceBtnActive : {}),
          }}
          aria-pressed={listening}
        >
          {listening ? 'Listening' : 'Hold to talk'}
        </button>
      </div>

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

        {listening && (
          <div style={{ ...styles.row, justifyContent: 'flex-start' }}>
            <div style={{ ...styles.bubble, ...styles.aiBubble }}>
              <span style={styles.waveform} aria-hidden="true">
                <span style={{ ...styles.waveformBar, ...styles.waveformBar1 }} />
                <span style={{ ...styles.waveformBar, ...styles.waveformBar2 }} />
                <span style={{ ...styles.waveformBar, ...styles.waveformBar3 }} />
              </span>
            </div>
          </div>
        )}

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
    background: 'linear-gradient(180deg, rgba(19,34,59,0.97) 0%, rgba(12,20,36,0.97) 100%)',
    color: COLORS.text,
    borderRadius: 20,
    padding: '1.5rem',
    maxWidth: 480,
    margin: '0 auto',
    border: `1px solid rgba(255,255,255,0.08)`,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 50px rgba(2, 8, 23, 0.32)',
    backdropFilter: 'blur(14px)',
  },
  assistantBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    padding: '0.8rem',
    borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(12,20,36,0.96) 0%, rgba(16,28,49,0.96) 100%)',
    border: `1px solid rgba(255,255,255,0.08)`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  assistantCopy: {
    flex: 1,
  },
  assistantName: {
    fontWeight: 700,
    color: COLORS.accent,
  },
  assistantHint: {
    fontSize: '0.85rem',
    color: COLORS.muted,
    marginTop: '0.2rem',
  },
  voiceBtn: {
    border: 'none',
    borderRadius: 999,
    padding: '0.6rem 0.9rem',
    background: 'linear-gradient(135deg, #3be28d 0%, #20b96b 100%)',
    color: '#04150d',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(59, 226, 141, 0.22)',
  },
  voiceBtnActive: {
    background: 'linear-gradient(135deg, #ff8a80 0%, #f25f53 100%)',
    color: '#2f0a08',
    boxShadow: '0 10px 20px rgba(242, 95, 83, 0.2)',
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
  waveform: {
    display: 'inline-flex',
    alignItems: 'flex-end',
    gap: '2px',
    height: '1rem',
  },
  waveformBar: {
    width: '3px',
    background: COLORS.accent,
    borderRadius: 999,
    animation: 'voiceWave 0.9s ease-in-out infinite',
  },
  waveformBar1: {
    height: '0.45rem',
    animationDelay: '0s',
  },
  waveformBar2: {
    height: '0.8rem',
    animationDelay: '0.15s',
  },
  waveformBar3: {
    height: '0.6rem',
    animationDelay: '0.3s',
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.7rem',
    borderRadius: 10,
    background: COLORS.bg,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.95rem',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  sendBtn: {
    padding: '0 1.25rem',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #3be28d 0%, #20b96b 100%)',
    color: '#04150d',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(59, 226, 141, 0.22)',
  },
}
