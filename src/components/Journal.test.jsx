import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Journal from './Journal.jsx'

const STORAGE_KEY = 'mwt:journal'

describe('Journal', () => {
  it('shows an empty state when there are no entries', () => {
    render(<Journal />)
    expect(screen.getByText(/no journal entries yet/i)).toBeInTheDocument()
  })

  it('disables the save button until text is entered', async () => {
    const user = userEvent.setup()
    render(<Journal />)
    const button = screen.getByRole('button', { name: /save entry/i })
    expect(button).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/what's on your mind/i), 'Hi')
    expect(button).toBeEnabled()
  })

  it('adds an entry and persists it to localStorage', async () => {
    const user = userEvent.setup()
    render(<Journal />)

    await user.type(
      screen.getByPlaceholderText(/what's on your mind/i),
      'Today was tough but okay',
    )
    await user.click(screen.getByRole('button', { name: /save entry/i }))

    expect(screen.getByText('Today was tough but okay')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].text).toBe('Today was tough but okay')

    // Input is cleared after saving.
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toHaveValue('')
  })

  it('ignores whitespace-only submissions', async () => {
    const user = userEvent.setup()
    render(<Journal />)
    const textarea = screen.getByPlaceholderText(/what's on your mind/i)

    await user.type(textarea, '    ')
    // Button stays disabled, so submit via the form has no effect.
    expect(screen.getByRole('button', { name: /save entry/i })).toBeDisabled()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('prepends newer entries above older ones', async () => {
    const user = userEvent.setup()
    render(<Journal />)
    const textarea = screen.getByPlaceholderText(/what's on your mind/i)

    await user.type(textarea, 'First entry')
    await user.click(screen.getByRole('button', { name: /save entry/i }))
    await user.type(textarea, 'Second entry')
    await user.click(screen.getByRole('button', { name: /save entry/i }))

    const entries = screen.getAllByRole('article')
    expect(entries[0]).toHaveTextContent('Second entry')
    expect(entries[1]).toHaveTextContent('First entry')
  })

  it('deletes an entry', async () => {
    const user = userEvent.setup()
    render(<Journal />)

    await user.type(
      screen.getByPlaceholderText(/what's on your mind/i),
      'Delete me',
    )
    await user.click(screen.getByRole('button', { name: /save entry/i }))
    expect(screen.getByText('Delete me')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete entry/i }))
    expect(screen.queryByText('Delete me')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(0)
  })

  it('loads previously saved entries on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 1, text: 'Saved earlier', date: '2026-06-01T10:00:00.000Z' },
      ]),
    )
    render(<Journal />)
    expect(screen.getByText('Saved earlier')).toBeInTheDocument()
  })
})
