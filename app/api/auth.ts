import type { AuthChangeEvent, Provider, Session } from '@supabase/supabase-js'
import { supabase, toApiError } from '~/api/supabase'
import type { Locale } from '~/types/domain'

/** Sends the sign-in email: a link to /auth/confirm plus a 6-digit code. */
export async function sendSignInEmail(email: string, redirectTo: string, locale: Locale): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true, data: { locale } },
  })
  if (error) throw toApiError(error)
}

/** Signs in with the 6-digit code typed from the email. */
export async function verifyEmailCode(email: string, token: string): Promise<Session> {
  const { data, error } = await supabase().auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw toApiError(error)
  return data.session!
}

/** Signs in with the token hash from the email link (only after the person clicks "Sign in"). */
export async function verifyTokenHash(tokenHash: string, type: 'email' | 'magiclink' | 'signup' | 'invite' | 'email_change'): Promise<Session | null> {
  const { data, error } = await supabase().auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) throw toApiError(error)
  return data.session
}

export async function signInWithProvider(provider: Provider, redirectTo: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({ provider, options: { redirectTo } })
  if (error) throw toApiError(error)
}

/** Completes an OAuth (PKCE) redirect. */
export async function exchangeCode(code: string): Promise<Session> {
  const { data, error } = await supabase().auth.exchangeCodeForSession(code)
  if (error) throw toApiError(error)
  return data.session
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase().auth.getSession()
  return data.session
}

export function onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}

export async function changeEmail(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ email }, { emailRedirectTo: redirectTo })
  if (error) throw toApiError(error)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase().auth.signOut()
  if (error) throw toApiError(error)
}
