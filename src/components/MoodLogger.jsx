import { useState } from 'react'

const EXAM_TYPES = ['NEET', 'JEE', 'CUET', 'CAT', 'GATE', 'UPSC']

const STORAGE_KEY = 'wellnessHistory'
const MAX_ENTRIES = 30

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

// Maps a 1–10 mood score to an emoji + label band.
function moodFace(mood) {
  if (mood <= 3) return { emoji: '😔', label: 'Struggling' }
  if (mood <= 6) return { emoji: '😐', label: 'Okay' }
  return { emoji: '😊', label: 'Feeling Good' }
}

const COLORS = {
  bg: '#0c1424',
  surface: '#13223b',
  accent: '#3be28d',
  text: '#f5f7ff',
  muted: '#9aa0b4',
  border: '#223a57',
}

export default function MoodLogger({ onLogComplete }) {
  const [mood, setMood] = useState(5)
  const [examType, setExamType] = useState(EXAM_TYPES[0])
  const [journal, setJournal] = useState('')
  const [saved, setSaved] = useState(false)

  const face = moodFace(mood)

  function handleSubmit(e) {
    e.preventDefault()

    const todayEntry = {
      date: new Date().toISOString().slice(0, 10),
      mood,
      examType,
      journal: journal.trim(),
    }

    const history = loadHistory()
    const updated = [...history, todayEntry].slice(-MAX_ENTRIES)
    saveHistory(updated)

    setJournal('')
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)

    if (typeof onLogComplete === 'function') {
      onLogComplete(todayEntry)
    }
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.heading}>Daily Check-In</h2>

      <form onSubmit={handleSubmit}>
        {/* Mood slider */}
        <label style={styles.label}>How's your mood today?</label>
        <div style={styles.moodDisplay}>
          <span style={styles.emoji}>{face.emoji}</span>
          <div>
            <div style={styles.moodLabel}>{face.label}</div>
            <div style={styles.moodScore}>{mood} / 10</div>
          </div>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.scaleRow}>
          <span>😔 1</span>
          <span>😐 5</span>
          <span>😊 10</span>
        </div>

        {/* Exam type */}
        <label style={styles.label} htmlFor="examType">
          Exam you're preparing for
        </label>
        <select
          id="examType"
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
          style={styles.select}
        >
          {EXAM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* Journal */}
        <label style={styles.label} htmlFor="journal">
          Today's journal
        </label>
        <textarea
          id="journal"
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          placeholder="How are you feeling today? What's on your mind?"
          rows={5}
          style={styles.textarea}
        />

        <button type="submit" style={styles.button}>
          {saved ? '✓ Saved' : 'Save Check-In'}
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
    boxShadow: '0 20px 50px rgba(2, 8, 23, 0.32)',
    backdropFilter: 'blur(14px)',
  },
  heading: {
    marginTop: 0,
    marginBottom: '1.25rem',
    color: COLORS.text,
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: COLORS.muted,
    margin: '1rem 0 0.5rem',
  },
  moodDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  emoji: {
    fontSize: '2.5rem',
    lineHeight: 1,
  },
  moodLabel: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: COLORS.accent,
  },
  moodScore: {
    fontSize: '0.85rem',
    color: COLORS.muted,
  },
  slider: {
    width: '100%',
    accentColor: COLORS.accent,
    cursor: 'pointer',
  },
  scaleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: COLORS.muted,
    marginTop: '0.25rem',
  },
  select: {
    width: '100%',
    padding: '0.7rem',
    borderRadius: 10,
    background: COLORS.bg,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.95rem',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  textarea: {
    width: '100%',
    padding: '0.7rem',
    borderRadius: 10,
    background: COLORS.bg,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.95rem',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  button: {
    marginTop: '1.25rem',
    width: '100%',
    padding: '0.8rem',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #3be28d 0%, #20b96b 100%)',
    color: '#04150d',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(59, 226, 141, 0.22)',
  },
}
