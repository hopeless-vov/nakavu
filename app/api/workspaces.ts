import { supabase, unwrap } from '~/api/supabase'
import type { MemberRole, MyWorkspace, Workspace, WorkspaceInput, WorkspacePreview, WorkspaceStats } from '~/types/domain'
import {
  type MemberRow,
  type MyWorkspaceRow,
  toMember,
  toMyWorkspace,
  toWorkspace,
  toWorkspaceArgs,
  toWorkspacePreview,
  toWorkspaceStats,
  toWorkspaceUpdate,
} from '~/utils/mappers'

const MY_WORKSPACE_SELECT = 'role, include_in_matching, skip_next_round, workspaces!inner(*, memberships(count))'

export async function listMyWorkspaces(userId: string): Promise<MyWorkspace[]> {
  const rows = unwrap(
    await supabase().from('memberships').select(MY_WORKSPACE_SELECT).eq('user_id', userId).order('joined_at'),
  ) as unknown as MyWorkspaceRow[]
  return rows.map(toMyWorkspace)
}

export async function createWorkspace(input: WorkspaceInput): Promise<Workspace> {
  return toWorkspace(unwrap(await supabase().rpc('create_workspace', toWorkspaceArgs(input))))
}

export async function updateWorkspace(id: string, patch: Partial<WorkspaceInput> & { logoUrl?: string | null }): Promise<Workspace> {
  return toWorkspace(unwrap(await supabase().from('workspaces').update(toWorkspaceUpdate(patch)).eq('id', id).select('*').single()))
}

export async function deleteWorkspace(id: string): Promise<void> {
  unwrap(await supabase().from('workspaces').delete().eq('id', id))
}

export async function uploadWorkspaceLogo(workspaceId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${workspaceId}/logo.${ext}`
  const storage = supabase().storage.from('workspace-logos')
  unwrap(await storage.upload(path, file, { upsert: true, contentType: file.type }))
  return `${storage.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

export async function previewInvite(token: string): Promise<WorkspacePreview | null> {
  const rows = unwrap(await supabase().rpc('workspace_preview', { p_token: token }))
  return rows[0] ? toWorkspacePreview(rows[0]) : null
}

export async function joinWorkspace(token: string): Promise<Workspace> {
  return toWorkspace(unwrap(await supabase().rpc('join_workspace', { p_token: token })))
}

export async function leaveWorkspace(id: string): Promise<void> {
  unwrap(await supabase().rpc('leave_workspace', { p_workspace: id }))
}

export async function regenerateInviteToken(id: string): Promise<string> {
  return unwrap(await supabase().rpc('regenerate_invite_token', { p_workspace: id }))
}

export async function updateMySwitches(
  workspaceId: string,
  userId: string,
  patch: { includeInMatching?: boolean; skipNextRound?: boolean },
): Promise<void> {
  const update: { include_in_matching?: boolean; skip_next_round?: boolean } = {}
  if (patch.includeInMatching !== undefined) update.include_in_matching = patch.includeInMatching
  if (patch.skipNextRound !== undefined) update.skip_next_round = patch.skipNextRound
  unwrap(await supabase().from('memberships').update(update).eq('workspace_id', workspaceId).eq('user_id', userId))
}

export async function listMembers(workspaceId: string) {
  const rows = unwrap(
    await supabase()
      .from('memberships')
      .select('user_id, role, include_in_matching, skip_next_round, joined_at, profiles!inner(*)')
      .eq('workspace_id', workspaceId)
      .order('joined_at'),
  ) as unknown as MemberRow[]
  return rows.map(toMember)
}

export async function setMemberRole(workspaceId: string, userId: string, role: MemberRole): Promise<void> {
  unwrap(await supabase().from('memberships').update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId))
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  unwrap(await supabase().from('memberships').delete().eq('workspace_id', workspaceId).eq('user_id', userId))
}

export async function getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
  const rows = unwrap(await supabase().rpc('workspace_stats', { p_workspace: workspaceId }))
  return toWorkspaceStats(rows[0]!)
}
