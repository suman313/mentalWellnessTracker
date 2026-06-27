import { useState, useEffect } from 'react'
import MoodLogger from './components/MoodLogger.jsx'
import Chat from './components/Chat.jsx'
import Insights from './components/Insights.jsx'

const STORAGE_KEY = 'wellnessHistory'

const COLORS = {
  bg: '#1a1a2e',
  surface: '#16213e',
  accent: '#00c853',
  text: '#e6e6e6',
  muted: '#9aa0b4',
  border: '#2a2f4a',
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function App() {
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('today')

  // Load saved history once on mount.
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // The most recent entry, and whether it belongs to today.
  const latest = history.length > 0 ? history[history.length - 1] : null
  const loggedToday = latest?.date === todayString()
  const todayEntry = loggedToday ? latest : null

  // MoodLogger writes to localStorage itself; mirror the new entry into state.
  function handleLogComplete(entry) {
    setHistory((prev) => [...prev, entry].slice(-30))
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          🧠❤️ MindMate <span style={styles.subtitle}>— Your Wellness Companion</span>
        </h1>
      </header>

      <nav style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'today' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('today')}
        >
          Today
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'insights' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
      </nav>

      <main style={styles.main}>
        {activeTab === 'today' &&
          (loggedToday ? (
            <Chat todayEntry={todayEntry} history={history} />
          ) : (
            <MoodLogger onLogComplete={handleLogComplete} />
          ))}

        {activeTab === 'insights' && <Insights history={history} />}
      </main>
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    padding: '1rem',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    padding: '1rem 0 0.5rem',
  },
  title: {
    fontSize: 'clamp(1.3rem, 4vw, 1.9rem)',
    margin: 0,
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontWeight: 400,
    fontSize: '0.8em',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    maxWidth: 480,
    margin: '1rem auto 1.5rem',
  },
  tab: {
    flex: 1,
    padding: '0.6rem 1rem',
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    color: COLORS.muted,
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabActive: {
    background: COLORS.accent,
    color: '#04210f',
    borderColor: COLORS.accent,
  },
  main: {
    paddingBottom: '2rem',
  },
}
