import type { Database } from '~/types/database'
import type {
  Invite,
  Locale,
  Match,
  Member,
  MyWorkspace,
  PersonCard,
  Profile,
  ProfilePatch,
  Workspace,
  WorkspaceInput,
  WorkspacePreview,
  WorkspaceStats,
} from '~/types/domain'

type Tables = Database['public']['Tables']
type Functions = Database['public']['Functions']
export type ProfileRow = Tables['profiles']['Row']
export type WorkspaceRow = Tables['workspaces']['Row']
export type MembershipRow = Tables['memberships']['Row']
export type InviteRow = Tables['invites']['Row']

/** Partner JSON as built by the `my_matches` RPC (snake_case profile subset). */
export interface PersonJson {
  id: string
  email: string
  first_name: string
  last_name: string
  job_title: string
  department: string
  city: string
  meeting_format: Profile['meetingFormat']
  languages: string[]
  interests: string[]
  ask_me_about: string
  avatar_url: string | null
}

export function toPersonCard(p: PersonJson | ProfileRow): PersonCard {
  return {
    id: p.id,
    email: p.email,
    firstName: p.first_name,
    lastName: p.last_name,
    jobTitle: p.job_title,
    department: p.department,
    city: p.city,
    meetingFormat: p.meeting_format,
    languages: p.languages,
    interests: p.interests,
    askMeAbout: p.ask_me_about,
    avatarUrl: p.avatar_url,
  }
}

export function toProfile(r: ProfileRow): Profile {
  return {
    ...toPersonCard(r),
    locale: r.locale as Locale,
    timezone: r.timezone,
    notifyMatch: r.notify_match,
    notifyReminder: r.notify_reminder,
    notifyFeedback: r.notify_feedback,
    notifyProduct: r.notify_product,
    onboardedAt: r.onboarded_at,
  }
}

const PROFILE_COLUMNS: Record<keyof ProfilePatch, keyof ProfileRow> = {
  firstName: 'first_name',
  lastName: 'last_name',
  jobTitle: 'job_title',
  department: 'department',
  city: 'city',
  meetingFormat: 'meeting_format',
  languages: 'languages',
  interests: 'interests',
  askMeAbout: 'ask_me_about',
  avatarUrl: 'avatar_url',
  locale: 'locale',
  timezone: 'timezone',
  notifyMatch: 'notify_match',
  notifyReminder: 'notify_reminder',
  notifyFeedback: 'notify_feedback',
  notifyProduct: 'notify_product',
  onboardedAt: 'onboarded_at',
}

export function toProfileUpdate(patch: ProfilePatch): Tables['profiles']['Update'] {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PROFILE_COLUMNS[key as keyof ProfilePatch]
    if (column && value !== undefined) out[column] = value
  }
  return out as Tables['profiles']['Update']
}

export function toWorkspace(r: WorkspaceRow): Workspace {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    kind: r.kind,
    logoUrl: r.logo_url,
    allowedDomains: r.allowed_domains,
    groupSize: r.group_size as 2 | 3,
    cadence: r.cadence,
    anchorDay: r.anchor_day,
    roundHour: r.round_hour,
    timezone: r.timezone,
    nextRoundAt: r.next_round_at,
    inviteToken: r.invite_token,
    createdAt: r.created_at,
  }
}

export type MyWorkspaceRow = Pick<MembershipRow, 'role' | 'include_in_matching' | 'skip_next_round'> & {
  workspaces: WorkspaceRow & { memberships: { count: number }[] }
}

export function toMyWorkspace(r: MyWorkspaceRow): MyWorkspace {
  return {
    ...toWorkspace(r.workspaces),
    role: r.role,
    includeInMatching: r.include_in_matching,
    skipNextRound: r.skip_next_round,
    memberCount: r.workspaces.memberships[0]?.count ?? 0,
  }
}

export function toWorkspaceArgs(input: WorkspaceInput): Functions['create_workspace']['Args'] {
  return {
    p_name: input.name,
    p_kind: input.kind,
    p_group_size: input.groupSize,
    p_cadence: input.cadence,
    p_anchor_day: input.anchorDay,
    p_round_hour: input.roundHour,
    p_timezone: input.timezone,
    p_allowed_domains: input.allowedDomains,
    p_next_round_at: input.nextRoundAt,
  }
}

export function toWorkspaceUpdate(input: Partial<WorkspaceInput> & { logoUrl?: string | null }): Tables['workspaces']['Update'] {
  const out: Tables['workspaces']['Update'] = {}
  if (input.name !== undefined) out.name = input.name
  if (input.kind !== undefined) out.kind = input.kind
  if (input.groupSize !== undefined) out.group_size = input.groupSize
  if (input.cadence !== undefined) out.cadence = input.cadence
  if (input.anchorDay !== undefined) out.anchor_day = input.anchorDay
  if (input.roundHour !== undefined) out.round_hour = input.roundHour
  if (input.timezone !== undefined) out.timezone = input.timezone
  if (input.allowedDomains !== undefined) out.allowed_domains = input.allowedDomains
  if (input.nextRoundAt !== undefined) out.next_round_at = input.nextRoundAt
  if (input.logoUrl !== undefined) out.logo_url = input.logoUrl
  return out
}

type PreviewRow = Functions['workspace_preview']['Returns'][number]

export function toWorkspacePreview(r: PreviewRow): WorkspacePreview {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    kind: r.kind,
    logoUrl: r.logo_url,
    memberCount: Number(r.member_count),
    allowedDomains: r.allowed_domains,
    nextRoundAt: r.next_round_at,
    invitedEmail: r.invited_email,
  }
}

export type MemberRow = Pick<MembershipRow, 'user_id' | 'role' | 'include_in_matching' | 'skip_next_round' | 'joined_at'> & {
  profiles: ProfileRow
}

export function toMember(r: MemberRow): Member {
  return {
    userId: r.user_id,
    role: r.role,
    includeInMatching: r.include_in_matching,
    skipNextRound: r.skip_next_round,
    joinedAt: r.joined_at,
    person: toPersonCard(r.profiles),
  }
}

export function toInvite(r: InviteRow): Invite {
  return { id: r.id, email: r.email, createdAt: r.created_at, expiresAt: r.expires_at, acceptedAt: r.accepted_at }
}

type MatchRow = Functions['my_matches']['Returns'][number]

export function toMatch(r: MatchRow): Match {
  return {
    id: r.match_id,
    workspaceId: r.workspace_id,
    workspaceName: r.workspace_name,
    roundAt: r.round_at,
    myFeedback: r.my_feedback,
    partners: ((r.partners as unknown as PersonJson[] | null) ?? []).map(toPersonCard),
  }
}

type StatsRow = Functions['workspace_stats']['Returns'][number]
interface RoundJson { scheduled_for: string; participant_count: number; answered: number; met: number }

export function toWorkspaceStats(r: StatsRow): WorkspaceStats {
  return {
    members: Number(r.members),
    active: Number(r.active),
    paused: Number(r.paused),
    skipping: Number(r.skipping),
    rounds: ((r.rounds as unknown as RoundJson[] | null) ?? []).map((x) => ({
      scheduledFor: x.scheduled_for,
      participantCount: x.participant_count,
      answered: x.answered,
      met: x.met,
    })),
  }
}
