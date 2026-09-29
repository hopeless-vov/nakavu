// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSeo } from '~/composables/use-seo'

const { useSeoMeta, useHead } = vi.hoisted(() => ({ useSeoMeta: vi.fn(), useHead: vi.fn() }))
mockNuxtImport('useSeoMeta', () => useSeoMeta)
mockNuxtImport('useHead', () => useHead)

type Getter = () => unknown
const resolve = (meta: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, typeof v === 'function' ? (v as Getter)() : v]))

describe('useSeo', () => {
  beforeEach(() => {
    useSeoMeta.mockClear()
    useHead.mockClear()
  })

  it('sets localized title, description, social cards and indexing', async () => {
    await withSetup(() => useSeo({ title: 'seo.notFound.title', description: 'seo.notFound.description' }))
    const meta = resolve(useSeoMeta.mock.calls.at(-1)![0])
    expect(meta.title).toBe('Сторінку не знайдено')
    expect(meta.description).toBe('Схоже, ця філіжанка порожня.')
    expect(meta.ogTitle).toBe('Сторінку не знайдено · Nakavu')
    expect(meta.ogImage).toBe('http://localhost:3000/og/uk.png')
    expect(meta.twitterImage).toBe('http://localhost:3000/og/uk.png')
    expect(meta.ogLocale).toBe('uk_UA')
    expect(meta.ogSiteName).toBe('Nakavu')
    expect(meta.ogDescription).toBe('Схоже, ця філіжанка порожня.')
    expect(meta.ogImageAlt).toContain('Nakavu')
    expect(meta.robots).toContain('index, follow')
  })

  it('marks private pages noindex and emits JSON-LD', async () => {
    const jsonLd = { '@type': 'WebPage', name: 'x' }
    await withSetup(() => useSeo({ title: 'seo.notFound.title', description: 'seo.notFound.description', noindex: true, jsonLd }))
    expect(resolve(useSeoMeta.mock.calls.at(-1)![0]).robots).toBe('noindex, nofollow')
    const script = useHead.mock.calls.at(-1)![0].script[0]
    expect(script.type).toBe('application/ld+json')
    expect(JSON.parse(script.innerHTML())).toEqual(jsonLd)
  })
})
