// Shared E2E helpers.

// Injects a deterministic fake Puter.js AI client before any app code runs, so
// the chat/insights flows resolve instantly and offline. Each call to
// puter.ai.chat echoes a canned reply that includes the user's message, which
// lets tests assert that context flowed through.
export async function stubAi(page, reply = 'Take a deep breath — you’ve got this. 🌱') {
  // Block the real Puter.js bundle so it can't overwrite our window.puter stub
  // (and so the suite never reaches out to the network / a login popup).
  await page.route('**/js.puter.com/**', (route) => route.abort())

  await page.addInitScript((cannedReply) => {
    window.puter = {
      ai: {
        chat: async (messages) => {
          const last = Array.isArray(messages)
            ? messages[messages.length - 1]?.content
            : ''
          return `${cannedReply} (re: ${last})`
        },
      },
    }
  }, reply)

  // Belt-and-suspenders: if the app ever falls back to the serverless endpoint
  // (e.g. Puter throws), answer it too so tests never hit a real network.
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply }),
    })
  })
}

// Fills out and submits the daily mood check-in form.
export async function logMood(page, { mood = '8', exam = 'JEE', journal = 'Feeling focused today' } = {}) {
  await page.getByRole('slider').fill(mood)
  await page.getByLabel(/exam you're preparing for/i).selectOption(exam)
  await page.getByLabel(/today's journal/i).fill(journal)
  await page.getByRole('button', { name: /save check-in/i }).click()
}
