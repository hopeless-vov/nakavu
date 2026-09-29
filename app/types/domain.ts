import type { Database } from '~/types/database'

type Enums = Database['public']['Enums']

export type MeetingFormat = Enums['meeting_format']
export type WorkspaceKind = Enums['workspace_kind']
export type Cadence = Enums['cadence']
export type MemberRole = Enums['member_role']
export type MatchFeedback = Enums['match_feedback']
export type Locale = 'uk' | 'en' | 'nl'

export interface Profile {
  id: string
  email: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  city: string
  meetingFormat: MeetingFormat
  languages: string[]
  interests: string[]
  askMeAbout: string
  avatarUrl: string | null
  locale: Locale
  timezone: string
  notifyMatch: boolean
  notifyReminder: boolean
  notifyFeedback: boolean
  notifyProduct: boolean
  onboardedAt: string | null
}

export type ProfilePatch = Partial<Omit<Profile, 'id' | 'email'>>

/** What a match partner (or coworker) sees about someone. */
export type PersonCard = Pick<
  Profile,
  'id' | 'email' | 'firstName' | 'lastName' | 'jobTitle' | 'department' | 'city' | 'meetingFormat' | 'languages' | 'interests' | 'askMeAbout' | 'avatarUrl'
>

export interface WorkspaceSchedule {
  cadence: Cadence
  anchorDay: number
  roundHour: number
  timezone: string
}

export interface Workspace extends WorkspaceSchedule {
  id: string
  name: string
  slug: string
  kind: WorkspaceKind
  logoUrl: string | null
  allowedDomains: string[]
  groupSize: 2 | 3
  nextRoundAt: string
  inviteToken: string
  createdAt: string
}

/** A workspace as seen by one member, with their own switches. */
export interface MyWorkspace extends Workspace {
  role: MemberRole
  includeInMatching: boolean
  skipNextRound: boolean
  memberCount: number
}

export interface WorkspaceInput extends WorkspaceSchedule {
  name: string
  kind: WorkspaceKind
  groupSize: 2 | 3
  allowedDomains: string[]
  nextRoundAt: string
}

export interface WorkspacePreview {
  id: string
  name: string
  slug: string
  kind: WorkspaceKind
  logoUrl: string | null
  memberCount: number
  allowedDomains: string[]
  nextRoundAt: string
  invitedEmail: string | null
}

export interface Member {
  userId: string
  role: MemberRole
  includeInMatching: boolean
  skipNextRound: boolean
  joinedAt: string
  person: PersonCard
}

export interface Invite {
  id: string
  email: string
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
}

export interface Match {
  id: string
  workspaceId: string
  workspaceName: string
  roundAt: string
  myFeedback: MatchFeedback | null
  partners: PersonCard[]
}

export interface RoundStat {
  scheduledFor: string
  participantCount: number
  answered: number
  met: number
}

export interface WorkspaceStats {
  members: number
  active: number
  paused: number
  skipping: number
  rounds: RoundStat[]
}
