import { supabase, unwrap } from '~/api/supabase'
import type { Invite } from '~/types/domain'
import { toInvite } from '~/utils/mappers'

/** Creates personal invites; existing invites for the same address are kept (and re-sent by the mailer). */
export async function createInvites(workspaceId: string, emails: string[], invitedBy: string): Promise<Invite[]> {
  const rows = emails.map((email) => ({ workspace_id: workspaceId, email, invited_by: invitedBy }))
  return unwrap(
    await supabase().from('invites').upsert(rows, { onConflict: 'workspace_id,email', ignoreDuplicates: true }).select('*'),
  ).map(toInvite)
}

export async function listInvites(workspaceId: string): Promise<Invite[]> {
  return unwrap(
    await supabase().from('invites').select('*').eq('workspace_id', workspaceId).is('accepted_at', null).order('created_at', { ascending: false }),
  ).map(toInvite)
}

export async function revokeInvite(id: string): Promise<void> {
  unwrap(await supabase().from('invites').delete().eq('id', id))
}
