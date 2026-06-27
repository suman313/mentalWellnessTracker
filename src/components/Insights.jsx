import { useState } from 'react'

const COLORS = {
  bg: '#1a1a2e',
  surface: '#16213e',
  accent: '#00c853',
  text: '#e6e6e6',
  muted: '#9aa0b4',
  border: '#2a2f4a',
  grid: '#2a2f4a',
}

const ANALYZE_MESSAGE =
  'Analyze my mood history and identify my key stress patterns and triggers. Give me 3 actionable insights.'

// Chart geometry.
const W = 420
const H = 180
const PAD_X = 32
const PAD_Y = 20

// Returns the count of consecutive days (ending today or yesterday) with a log.
function computeStreak(entries) {
  if (entries.length === 0) return 0

  const dates = new Set(entries.map((e) => e.date))
  let streak = 0
  const cursor = new Date()

  // Allow the streak to count even if today isn't logged yet (start from yesterday).
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function Insights({ history = [] }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  // Sort chronologically and take the last 7 for the chart.
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const last7 = sorted.slice(-7)

  const moods = last7.map((e) => e.mood)
  const weeklyAvg =
    moods.length > 0
      ? (moods.reduce((sum, m) => sum + m, 0) / moods.length).toFixed(1)
      : '—'

  const streak = computeStreak(sorted)

  // Map a data point to SVG coordinates.
  function pointFor(index, mood) {
    const usableW = W - PAD_X * 2
    const usableH = H - PAD_Y * 2
    const x =
      last7.length === 1
        ? W / 2
        : PAD_X + (usableW * index) / (last7.length - 1)
    // mood 1 → bottom, mood 10 → top
    const y = PAD_Y + usableH * (1 - (mood - 1) / 9)
    return { x, y }
  }

  const points = last7.map((e, i) => pointFor(i, e.mood))
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  async function analyze() {
    if (loading || history.length === 0) return
    setLoading(true)
    setAnalysis('')

    const latest = sorted[sorted.length - 1] || {}

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: latest.examType,
          mood: latest.mood,
          journal: latest.journal,
          history,
          message: ANALYZE_MESSAGE,
        }),
      })
      const data = await res.json()
      setAnalysis(
        data.reply || data.error || 'Could not analyze your patterns right now.'
      )
    } catch (err) {
      setAnalysis('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.heading}>Your Insights</h2>

      {/* Badges */}
      <div style={styles.badges}>
        <div style={styles.badge}>
          <span style={styles.badgeValue}>{weeklyAvg}</span>
          <span style={styles.badgeLabel}>Weekly Average</span>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeValue}>
            {streak} {streak === 1 ? 'day' : 'days'} 🔥
          </span>
          <span style={styles.badgeLabel}>Current Streak</span>
        </div>
      </div>

      {/* Mood trend chart */}
      <h3 style={styles.subheading}>Mood Trend (last 7)</h3>
      {last7.length === 0 ? (
        <p style={styles.empty}>No entries yet — log a mood to see your trend.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={styles.chart}
          role="img"
          aria-label="Mood trend line chart"
        >
          {/* Horizontal gridlines + Y labels for moods 1, 5, 10 */}
          {[1, 5, 10].map((m) => {
            const { y } = pointFor(0, m)
            return (
              <g key={m}>
                <line
                  x1={PAD_X}
                  y1={y}
                  x2={W - PAD_X}
                  y2={y}
                  stroke={COLORS.grid}
                  strokeWidth="1"
                />
                <text x={4} y={y + 4} fill={COLORS.muted} fontSize="10">
                  {m}
                </text>
              </g>
            )
          })}

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points + date labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill={COLORS.accent} />
              <text
                x={p.x}
                y={H - 4}
                fill={COLORS.muted}
                fontSize="9"
                textAnchor="middle"
              >
                {last7[i].date.slice(5)}
              </text>
            </g>
          ))}
        </svg>
      )}

      {/* AI analysis */}
      <button
        onClick={analyze}
        disabled={loading || history.length === 0}
        style={{
          ...styles.button,
          ...(loading || history.length === 0 ? styles.buttonDisabled : {}),
        }}
      >
        {loading ? 'Analyzing…' : 'Ask AI to analyze my patterns'}
      </button>

      {analysis && <div style={styles.analysis}>{analysis}</div>}
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
  },
  heading: { marginTop: 0, marginBottom: '1.25rem' },
  subheading: {
    fontSize: '0.95rem',
    color: COLORS.muted,
    margin: '1.5rem 0 0.5rem',
  },
  badges: {
    display: 'flex',
    gap: '1rem',
  },
  badge: {
    flex: 1,
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: '1rem',
    textAlign: 'center',
  },
  badgeValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: COLORS.accent,
  },
  badgeLabel: {
    fontSize: '0.75rem',
    color: COLORS.muted,
  },
  chart: {
    width: '100%',
    height: 'auto',
    background: COLORS.bg,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    padding: '1.5rem 0',
  },
  button: {
    marginTop: '1.5rem',
    width: '100%',
    padding: '0.75rem',
    borderRadius: 8,
    border: 'none',
    background: COLORS.accent,
    color: '#04210f',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  analysis: {
    marginTop: '1rem',
    padding: '1rem',
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
}
