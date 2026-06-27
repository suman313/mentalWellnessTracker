import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest configuration for unit + component tests.
// Playwright E2E specs live under e2e/ and are excluded here.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}', 'api/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}', 'api/**/*.js'],
      exclude: [
        'src/main.jsx',
        'src/**/*.{test,spec}.{js,jsx}',
        'api/**/*.{test,spec}.{js,jsx}',
      ],
    },
  },
})
