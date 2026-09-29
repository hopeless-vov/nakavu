import { type Page,test as base } from '@playwright/test'

// Clicking before Vue hydrates hits dead SSR markup, so every navigation waits for the app.
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as { __vue_app__?: { $nuxt?: { isHydrating?: boolean } } } | null)?.__vue_app__
    return !!app && app.$nuxt?.isHydrating === false
  })
}

export function hydrateOnNavigation(page: Page): Page {
  const goto = page.goto.bind(page)
  page.goto = async (url, options) => {
    const response = await goto(url, options)
    await waitForHydration(page)
    return response
  }
  return page
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(hydrateOnNavigation(page))
  },
})

export { expect } from '@playwright/test'
