import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount React trees and reset the DOM between tests.
afterEach(() => {
  cleanup()
})

// Each test starts with empty localStorage and no leftover spies/mocks.
beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  // Ensure the external Puter.js global is absent unless a test opts in.
  delete window.puter
})
