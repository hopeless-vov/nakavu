import { expect, test } from './fixtures'
import AxeBuilder from '@axe-core/playwright'

const pages = ['/', '/for-teams', '/for-friends', '/faq', '/privacy', '/terms', '/sign-in']

test.describe('public site', () => {
  test('landing renders the hero in Ukrainian, English and Dutch', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('ніколи')
    await page.goto('/en')
    await expect(page.locator('h1')).toContainText('never')
    await page.goto('/nl')
    await expect(page.locator('h1')).toContainText('nooit')
  })

  test('has SEO tags: title, description, canonical, hreflang, OG image and JSON-LD', async ({ page }) => {
    await page.goto('/en')
    await expect(page).toHaveTitle(/Coffee roulette for teams and friends · Nakavu/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Nakavu/)
    await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveCount(1)
    await expect(page.locator('link[rel="alternate"][hreflang="nl"]')).toHaveAttribute('href', /\/nl$/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/en\.png$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB')
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(JSON.parse(jsonLd!)['@graph'][0]['@type']).toBe('WebApplication')
  })

  test('unknown pages return 404', async ({ page }) => {
    const res = await page.goto('/does-not-exist')
    expect(res?.status()).toBe(404)
    await expect(page.locator('h1')).toContainText('Тут кави немає')
  })

  test('language switcher keeps the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'switcher lives in the menu on phones')
    await page.goto('/faq')
    await page.getByRole('radio', { name: 'EN' }).first().click()
    await expect(page).toHaveURL(/\/en\/faq$/)
    await expect(page.locator('h1')).toContainText('Questions and answers')
  })

  test('mobile menu opens and navigates', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones only')
    await page.goto('/')
    await page.getByRole('button', { name: 'Меню' }).click()
    await page.getByRole('link', { name: 'Для друзів' }).last().click()
    await expect(page).toHaveURL(/\/for-friends$/)
  })

  test('theme toggle flips data-theme and remembers it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'toggle lives in the menu on phones')
    await page.goto('/')
    const before = await page.locator('html').getAttribute('data-theme')
    await page.getByRole('button', { name: 'Змінити тему' }).first().click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before!)
    await page.reload()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before!)
  })

  test('sign-in validates the email before sending', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('textbox').fill('not-an-email')
    await page.getByRole('button', { name: 'Надіслати лист' }).click()
    await expect(page.getByRole('alert')).toContainText('коректну адресу')
  })

  test('private pages send guests to sign-in and remember where they were going', async ({ page }) => {
    await page.goto('/app/history')
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fhistory|\/sign-in\?next=\/app\/history/)
  })

  for (const path of pages) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${path} has no serious accessibility issues (${theme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
      })
    }
  }
})
