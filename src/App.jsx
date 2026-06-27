import { useState, useEffect } from 'react'
import MoodLogger from './components/MoodLogger.jsx'
import Chat from './components/Chat.jsx'
import Insights from './components/Insights.jsx'

const STORAGE_KEY = 'wellnessHistory'

const COLORS = {
  bg: '#07111f',
  surface: '#111c31',
  accent: '#3be28d',
  text: '#f5f7ff',
  muted: '#8a94b3',
  border: '#223a57',
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
    background: 'radial-gradient(circle at top, #1f335d 0%, #0f1728 42%, #080c14 100%)',
    color: COLORS.text,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    padding: '1.25rem',
    boxSizing: 'border-box',
    maxWidth: '980px',
    margin: '0 auto',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 70px rgba(2, 8, 23, 0.48)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    padding: '1rem 0 0.6rem',
  },
  title: {
    fontSize: 'clamp(1.35rem, 4vw, 2rem)',
    margin: 0,
    color: COLORS.text,
    letterSpacing: '0.02em',
    fontWeight: 800,
  },
  subtitle: {
    color: COLORS.muted,
    fontWeight: 500,
    fontSize: '0.8em',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    maxWidth: 500,
    margin: '1rem auto 1.5rem',
    padding: '0.3rem',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  tab: {
    flex: 1,
    padding: '0.65rem 1rem',
    borderRadius: 999,
    border: 'none',
    background: 'transparent',
    color: COLORS.muted,
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 180ms ease',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #3be28d 0%, #20b96b 100%)',
    color: '#04150d',
    boxShadow: '0 8px 18px rgba(59, 226, 141, 0.24)',
  },
  main: {
    paddingBottom: '2rem',
  },
}
