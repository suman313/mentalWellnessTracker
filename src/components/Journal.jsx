import { useState, useEffect } from 'react'

const STORAGE_KEY = 'mwt:journal'

export default function Journal() {
  const [entries, setEntries] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setEntries(JSON.parse(saved))
  }, [])

  function save(updated) {
    setEntries(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function addEntry(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const entry = {
      id: Date.now(),
      text: trimmed,
      date: new Date().toISOString(),
    }
    save([entry, ...entries])
    setText('')
  }

  function deleteEntry(id) {
    save(entries.filter((entry) => entry.id !== id))
  }

  return (
    <section className="journal">
      <h2>Journal</h2>

      <form onSubmit={addEntry}>
        <textarea
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
        <button type="submit" disabled={!text.trim()}>
          Save Entry
        </button>
      </form>

      <div className="journal-entries">
        {entries.length === 0 && <p>No journal entries yet.</p>}
        {entries.map((entry) => (
          <article key={entry.id} className="journal-entry">
            <header>
              <time>{new Date(entry.date).toLocaleString()}</time>
              <button
                className="delete-btn"
                onClick={() => deleteEntry(entry.id)}
                aria-label="Delete entry"
              >
                ×
              </button>
            </header>
            <p>{entry.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
