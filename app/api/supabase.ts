import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export type Db = SupabaseClient<Database>

let client: Db | null = null

/** Called once by the supabase plugin with values from runtime config. */
export function initSupabase(url: string, anonKey: string): Db {
  client = createClient<Database>(url, anonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  return client
}

export function supabase(): Db {
  if (!client) throw new Error('Supabase is not initialised — is the supabase plugin registered?')
  return client
}

/** Error from the data layer with the Postgres/Auth code kept for the UI to map. */
export class ApiError extends Error {
  public readonly code: string
  public readonly hint?: string

  public constructor(message: string, code = 'unknown', hint?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.hint = hint
  }
}

interface RawError { message: string; code?: string; hint?: string | null; status?: number }

export function toApiError(error: RawError): ApiError {
  return new ApiError(error.message, error.code ?? (error.status ? String(error.status) : 'unknown'), error.hint ?? undefined)
}

/** Unwraps a Supabase `{ data, error }` result, throwing an ApiError on failure. */
export function unwrap<T>(result: { data: T | null; error: RawError | null }): T {
  if (result.error) throw toApiError(result.error)
  return result.data as T
}
