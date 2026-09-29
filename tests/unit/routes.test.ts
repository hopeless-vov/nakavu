import { routes } from '~/router/routes'

describe('routes', () => {
  it('has unique names and paths', () => {
    expect(new Set(routes.map((r) => r.name)).size).toBe(routes.length)
    expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length)
  })

  it('maps every route to a PascalCase *View component', () => {
    for (const r of routes) expect(r.view).toMatch(/^[A-Z][A-Za-z]+View$/)
  })

  it('keeps the catch-all route last', () => {
    expect(routes.at(-1)?.name).toBe('not-found')
  })
})
