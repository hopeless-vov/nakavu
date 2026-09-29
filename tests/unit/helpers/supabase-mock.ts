/**
 * A chainable stand-in for the Supabase client. Every builder call is recorded
 * as [method, ...args]; awaiting the chain resolves to the next queued result.
 *
 *   const db = createSupabaseMock()
 *   db.queue({ data: [...], error: null })
 *   await listInvites('w1')
 *   expect(db.calls).toContainEqual(['from', 'invites'])
 */
export interface MockResult { data?: unknown; error?: unknown }

export function createSupabaseMock() {
  const calls: unknown[][] = []
  const results: MockResult[] = []
  const next = () => {
    const r = results.shift() ?? { data: null, error: null }
    return { data: r.data ?? null, error: r.error ?? null }
  }

  const chain: Record<string | symbol, unknown> = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise.resolve(next()).then(resolve, reject)
      return (...args: unknown[]) => {
        calls.push([String(prop), ...args])
        return chain
      }
    },
  })

  const auth = new Proxy({}, {
    get(_t, prop) {
      return (...args: unknown[]) => {
        calls.push([`auth.${String(prop)}`, ...args])
        if (prop === 'onAuthStateChange') return { data: { subscription: { unsubscribe: () => calls.push(['auth.unsubscribe']) } } }
        return Promise.resolve(next())
      }
    },
  })

  const bucket = (name: string) => ({
    upload: (...args: unknown[]) => {
      calls.push([`storage.${name}.upload`, ...args])
      return Promise.resolve(next())
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${name}/${path}` } }),
  })

  const client = {
    from: (table: string) => {
      calls.push(['from', table])
      return chain
    },
    rpc: (fn: string, args?: unknown) => {
      calls.push(['rpc', fn, args])
      return chain
    },
    auth,
    storage: { from: bucket },
  }

  return {
    client,
    calls,
    queue: (...r: MockResult[]) => results.push(...r),
    reset: () => {
      calls.length = 0
      results.length = 0
    },
  }
}
