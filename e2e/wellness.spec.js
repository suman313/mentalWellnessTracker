import { test, expect } from '@playwright/test'
import { stubAi, logMood } from './helpers.js'

test.beforeEach(async ({ page }) => {
  // Each Playwright test gets a fresh browser context (empty localStorage), so
  // we only need to stub the AI provider here.
  await stubAi(page)
})

test('loads the app shell with both tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /MindMate/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^today$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^insights$/i })).toBeVisible()
})

test('full check-in flow: log mood → chat companion greets the student', async ({
  page,
}) => {
  await page.goto('/')

  // The logging form is shown first.
  await expect(
    page.getByRole('heading', { name: /daily check-in/i }),
  ).toBeVisible()

  await logMood(page, { journal: 'Nervous about the JEE mock test' })

  // After logging, the Today tab swaps to the chat companion, which
  // auto-greets using the stubbed AI.
  await expect(
    page.getByRole('heading', { name: 'Wellness Companion', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/Take a deep breath/i)).toBeVisible()
})

test('student can send a chat message and receive a reply', async ({ page }) => {
  await page.goto('/')
  await logMood(page)

  await expect(page.getByText(/Take a deep breath/i).first()).toBeVisible()

  await page.getByPlaceholder(/type a message/i).fill('How do I stop overthinking?')
  await page.getByRole('button', { name: /^send$/i }).click()

  // The user's own bubble appears (exact match avoids the AI echo bubble)...
  await expect(
    page.getByText('How do I stop overthinking?', { exact: true }),
  ).toBeVisible()
  // ...and the stubbed AI echoes the message back, proving the round-trip works.
  await expect(page.getByText(/re: How do I stop overthinking/)).toBeVisible()
})

test('insights tab shows badges, chart, and AI analysis', async ({ page }) => {
  await page.goto('/')
  await logMood(page, { mood: '7' })

  await page.getByRole('button', { name: /^insights$/i }).click()

  await expect(
    page.getByRole('heading', { name: /your insights/i }),
  ).toBeVisible()
  await expect(page.getByText(/weekly average/i)).toBeVisible()
  await expect(page.getByText(/current streak/i)).toBeVisible()
  await expect(page.getByRole('img', { name: /mood trend/i })).toBeVisible()

  await page.getByRole('button', { name: /analyze my patterns/i }).click()
  await expect(page.getByText(/Take a deep breath/i)).toBeVisible()
})

test('check-in persists across a page reload', async ({ page }) => {
  await page.goto('/')
  await logMood(page)
  await expect(
    page.getByRole('heading', { name: 'Wellness Companion', exact: true }),
  ).toBeVisible()

  await page.reload()

  // Because today's entry is stored, the app reopens straight into the chat.
  await expect(
    page.getByRole('heading', { name: 'Wellness Companion', exact: true }),
  ).toBeVisible()
})
