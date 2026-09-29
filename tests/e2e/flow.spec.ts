// Full journey against local Supabase (`npm run db:start`) and Mailpit.
// Run with: E2E_SUPABASE=1 SUPABASE_SERVICE_ROLE_KEY=<secret key from `supabase status`> npm run test:e2e -- flow
import { type Browser, expect, type Page, test } from '@playwright/test'

const API = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321'
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:55324'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

test.skip(!process.env.E2E_SUPABASE, 'needs local Supabase + Mailpit (set E2E_SUPABASE=1)')
test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const owner = `owner.${stamp}@e2e.test`
const guest = `guest.${stamp}@e2e.test`

async function latestCode(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`)
    const { messages } = (await res.json()) as { messages: { ID: string }[] }
    if (messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`)).json()) as { Text: string; HTML: string }
      const code = (msg.Text || msg.HTML).match(/\b(\d{6})\b/)?.[1]
      if (code) return code
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`No sign-in code for ${email}`)
}

async function signIn(page: Page, email: string) {
  await page.getByRole('textbox').first().fill(email)
  await page.getByRole('button', { name: 'Надіслати лист' }).click()
  await expect(page.getByRole('heading', { name: 'Перевірте пошту' })).toBeVisible()
  const code = await latestCode(email)
  await page.getByRole('group', { name: 'Код із листа' }).getByRole('textbox').first().fill(code)
}

async function onboard(page: Page, firstName: string) {
  await expect(page).toHaveURL(/\/onboarding/)
  await page.getByLabel('Ім’я').fill(firstName)
  await page.getByRole('button', { name: 'Походи' }).click()
  await page.getByRole('button', { name: 'Готово — до головної' }).click()
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

let inviteLink = ''
let ownerPage: Page
let browserRef: Browser

test('owner signs in with the emailed code, onboards and creates a workspace', async ({ browser }) => {
  browserRef = browser
  ownerPage = await (await browser.newContext()).newPage()
  await ownerPage.goto('/sign-in?next=%2Fapp%2Fworkspaces%2Fnew')
  await signIn(ownerPage, owner)
  await onboard(ownerPage, 'Olena')
  await expect(ownerPage).toHaveURL(/\/app\/workspaces\/new/)
  await ownerPage.getByLabel('Назва').fill(`E2E Guild ${stamp}`)
  await ownerPage.getByRole('radio', { name: /Друзі/ }).click()
  await ownerPage.getByRole('button', { name: 'Створити воркспейс' }).click()
  await expect(ownerPage.getByRole('heading', { name: /готовий!/ })).toBeVisible()
  inviteLink = await ownerPage.getByRole('textbox', { name: 'Посилання-запрошення' }).inputValue()
  expect(inviteLink).toMatch(/\/join\/[0-9a-f]+$/)
})

test('a guest joins with the invite link', async () => {
  const page = await (await browserRef.newContext()).newPage()
  await page.goto(new URL(inviteLink).pathname)
  await expect(page.getByRole('heading', { name: /Вас запросили до E2E Guild/ })).toBeVisible()
  await page.getByRole('link', { name: 'Увійти й приєднатися' }).click()
  await signIn(page, guest)
  await expect(page.getByRole('button', { name: /Приєднатися до/ })).toBeVisible()
  await page.getByRole('button', { name: /Приєднатися до/ }).click()
  await onboard(page, 'Taras')
  await expect(page.getByText('Пари ще немає')).toBeVisible()
})

test('a round matches them and the owner sees the reveal, answers and sees stats', async () => {
  test.skip(!SERVICE_KEY, 'needs SUPABASE_SERVICE_ROLE_KEY to create the round')
  const [ws] = (await rest(`workspaces?slug=like.e2e-guild-${stamp}*&select=id`)) as { id: string }[]
  const members = (await rest(`memberships?workspace_id=eq.${ws!.id}&select=user_id`)) as { user_id: string }[]
  const [round] = (await rest('rounds', { method: 'POST', body: JSON.stringify({ workspace_id: ws!.id, scheduled_for: new Date().toISOString(), status: 'done', participant_count: 2 }) })) as { id: string }[]
  const [match] = (await rest('matches', { method: 'POST', body: JSON.stringify({ round_id: round!.id, workspace_id: ws!.id }) })) as { id: string }[]
  await rest('match_members', { method: 'POST', body: JSON.stringify(members.map((m) => ({ match_id: match!.id, user_id: m.user_id }))) })

  await ownerPage.goto('/app')
  await expect(ownerPage.getByText('Taras').first()).toBeVisible({ timeout: 15_000 })
  await expect(ownerPage.getByText('Ви обоє вказали «Походи»')).toBeVisible()
  await ownerPage.getByRole('radio', { name: 'Так' }).click()
  await ownerPage.goto('/app/history')
  await expect(ownerPage.getByRole('radio', { name: /✓ Так/ })).toBeVisible()

  await ownerPage.goto('/app/workspaces')
  await ownerPage.getByRole('link', { name: 'Адмін-панель' }).click()
  await expect(ownerPage.getByText('Учасники').first()).toBeVisible()
})
