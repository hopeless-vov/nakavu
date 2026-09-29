import en from '../../i18n/locales/en.json'
import nl from '../../i18n/locales/nl.json'
import uk from '../../i18n/locales/uk.json'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) }
  }, {})
}

const locales = { uk: flatten(uk as Tree), en: flatten(en as Tree), nl: flatten(nl as Tree) }
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('locale files', () => {
  it('have exactly the same keys in uk, en and nl', () => {
    const ukKeys = Object.keys(locales.uk).sort()
    expect(Object.keys(locales.en).sort()).toEqual(ukKeys)
    expect(Object.keys(locales.nl).sort()).toEqual(ukKeys)
  })

  it('have no empty messages', () => {
    for (const [code, messages] of Object.entries(locales)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(value.trim(), `${code}:${key}`).not.toBe('')
      }
    }
  })

  it('use the same placeholders in every language', () => {
    for (const [key, value] of Object.entries(locales.uk)) {
      expect(placeholders(locales.en[key]!), `en:${key}`).toEqual(placeholders(value))
      expect(placeholders(locales.nl[key]!), `nl:${key}`).toEqual(placeholders(value))
    }
  })
})
