/** `https://nakavu.app/` → `https://nakavu.app`, so paths can be appended without a double slash. */
export function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}
