import { withoutTrailingSlash } from '~/utils/url'

describe('withoutTrailingSlash', () => {
  it('drops trailing slashes and leaves clean URLs alone', () => {
    expect(withoutTrailingSlash('https://nakavu.vercel.app/')).toBe('https://nakavu.vercel.app')
    expect(withoutTrailingSlash('https://nakavu.vercel.app//')).toBe('https://nakavu.vercel.app')
    expect(withoutTrailingSlash('https://nakavu.vercel.app')).toBe('https://nakavu.vercel.app')
  })
})
