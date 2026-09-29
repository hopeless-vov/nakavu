// Round orchestration, independent of Supabase so it can be unit-tested.
// The Edge Function wires it to the database through the RoundsDb interface.

import { matchParticipants, type Participant, type PastMeeting } from './lib/matching.ts'
import { feedbackNudgeAt, nextRoundAt, REMINDER_LEAD_MS, type Schedule } from './lib/schedule.ts'
import { pickStarters, type Starter } from './lib/starters.ts'

export interface DueWorkspace extends Schedule {
  id: string
  name: string
  slug: string
  kind: 'work' | 'friends'
  groupSize: 2 | 3
  nextRoundAt: string
}

export interface Member extends Participant {
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  askMeAbout: string
  avatarUrl: string | null
  locale: string
  timezone: string
  notifyMatch: boolean
  notifyReminder: boolean
  notifyFeedback: boolean
  skipNextRound: boolean
}

export interface OutboxEmail {
  kind: 'match' | 'no_match' | 'reminder' | 'feedback'
  userId: string
  toEmail: string
  locale: string
  payload: Record<string, unknown>
  dedupeKey: string
}

export interface CreatedRound {
  id: string
  scheduledFor: string
}

export interface RoundsDb {
  dueWorkspaces(now: Date, limit: number): Promise<DueWorkspace[]>
  /** Members who are in the draw and finished onboarding (skippers included, flagged). */
  members(workspaceId: string): Promise<Member[]>
  /** Past pairs in this workspace, newest round first. */
  history(workspaceId: string, rounds: number): Promise<PastMeeting[]>
  /** Inserts the round; returns null if it already exists (a retry). */
  createRound(workspaceId: string, scheduledFor: string): Promise<CreatedRound | null>
  saveMatches(roundId: string, workspaceId: string, groups: string[][]): Promise<{ id: string; members: string[] }[]>
  finishRound(roundId: string, participants: number, unmatched: number): Promise<void>
  clearSkips(workspaceId: string): Promise<void>
  setNextRound(workspaceId: string, at: string): Promise<void>
  enqueue(emails: OutboxEmail[]): Promise<void>
  /** Workspaces whose next round is within `until`, for reminder emails. */
  upcomingWorkspaces(now: Date, until: Date): Promise<DueWorkspace[]>
  /** Finished rounds whose members haven't answered "did you meet?". */
  unansweredRounds(now: Date): Promise<{ roundId: string; workspace: DueWorkspace; scheduledFor: string; members: { matchId: string; member: Member; partners: string[] }[] }[]>
}

const fullName = (m: Pick<Member, 'firstName' | 'lastName'>) => `${m.firstName} ${m.lastName}`.trim()

export function partnerCard(m: Member) {
  return {
    name: fullName(m),
    firstName: m.firstName,
    email: m.email,
    jobTitle: m.jobTitle,
    department: m.department,
    city: m.city,
    meetingFormat: m.meetingFormat,
    languages: m.languages,
    interests: m.interests,
    askMeAbout: m.askMeAbout,
    avatarUrl: m.avatarUrl,
  }
}

/** Pure: who meets whom this round, and what goes into everyone's inbox. */
export function planRound(ws: DueWorkspace, members: Member[], history: PastMeeting[], roundId: string) {
  const inDraw = members.filter((m) => !m.skipNextRound)
  const { groups, unmatched } = matchParticipants(inDraw, { groupSize: ws.groupSize, kind: ws.kind, seed: roundId, history })
  const byId = new Map(inDraw.map((m) => [m.id, m]))
  const next = nextRoundAt(ws, new Date(ws.nextRoundAt)).toISOString()
  const common = { workspaceName: ws.name, workspaceSlug: ws.slug, roundAt: ws.nextRoundAt, nextRoundAt: next, kind: ws.kind }

  const emails: OutboxEmail[] = []
  for (const group of groups) {
    for (const id of group) {
      const me = byId.get(id)!
      if (!me.notifyMatch) continue
      const partners = group.filter((x) => x !== id).map((x) => byId.get(x)!)
      const starters: Starter[] = pickStarters(`${roundId}:${group.join(',')}`, me, partners[0]!, ws.kind)
      emails.push({
        kind: 'match',
        userId: id,
        toEmail: me.email,
        locale: me.locale,
        dedupeKey: `match:${roundId}:${id}`,
        payload: { ...common, firstName: me.firstName, myInterests: me.interests, timezone: me.timezone, partners: partners.map(partnerCard), starters },
      })
    }
  }
  for (const id of unmatched) {
    const me = byId.get(id)!
    if (!me.notifyMatch) continue
    emails.push({ kind: 'no_match', userId: id, toEmail: me.email, locale: me.locale, dedupeKey: `no_match:${roundId}:${id}`, payload: { ...common, firstName: me.firstName } })
  }
  return { groups, unmatched, next, emails, participants: inDraw.length }
}

export interface RunReport {
  rounds: { workspaceId: string; groups: number; unmatched: number; skipped: boolean }[]
  reminders: number
  nudges: number
}

/** Runs every due round, then queues reminders and "did you meet?" nudges. Safe to re-run. */
export async function runDueRounds(db: RoundsDb, now = new Date(), batch = 25): Promise<RunReport> {
  const report: RunReport = { rounds: [], reminders: 0, nudges: 0 }

  for (const ws of await db.dueWorkspaces(now, batch)) {
    const round = await db.createRound(ws.id, ws.nextRoundAt)
    const next = nextRoundAt(ws, new Date(ws.nextRoundAt)).toISOString()
    if (!round) {
      // Already ran (a retry after a crash) — just move the schedule on.
      await db.setNextRound(ws.id, next)
      report.rounds.push({ workspaceId: ws.id, groups: 0, unmatched: 0, skipped: true })
      continue
    }
    const [members, history] = await Promise.all([db.members(ws.id), db.history(ws.id, 12)])
    const plan = planRound(ws, members, history, round.id)
    await db.saveMatches(round.id, ws.id, plan.groups)
    await db.enqueue(plan.emails)
    await db.finishRound(round.id, plan.participants, plan.unmatched.length)
    await db.clearSkips(ws.id)
    await db.setNextRound(ws.id, plan.next)
    report.rounds.push({ workspaceId: ws.id, groups: plan.groups.length, unmatched: plan.unmatched.length, skipped: false })
  }

  // Reminders: three days before a round, to everyone in the draw who wants them.
  const reminders: OutboxEmail[] = []
  for (const ws of await db.upcomingWorkspaces(now, new Date(now.getTime() + REMINDER_LEAD_MS))) {
    for (const m of await db.members(ws.id)) {
      if (!m.notifyReminder || m.skipNextRound) continue
      reminders.push({
        kind: 'reminder',
        userId: m.id,
        toEmail: m.email,
        locale: m.locale,
        dedupeKey: `reminder:${ws.id}:${ws.nextRoundAt}:${m.id}`,
        payload: { workspaceName: ws.name, workspaceSlug: ws.slug, roundAt: ws.nextRoundAt, firstName: m.firstName, timezone: m.timezone },
      })
    }
  }
  await db.enqueue(reminders)
  report.reminders = reminders.length

  // Nudges: halfway to the next round, ask people who haven't answered.
  const nudges: OutboxEmail[] = []
  for (const r of await db.unansweredRounds(now)) {
    const nudgeAt = feedbackNudgeAt(new Date(r.scheduledFor), new Date(r.workspace.nextRoundAt))
    if (now < nudgeAt) continue
    for (const { matchId, member, partners } of r.members) {
      if (!member.notifyFeedback) continue
      nudges.push({
        kind: 'feedback',
        userId: member.id,
        toEmail: member.email,
        locale: member.locale,
        dedupeKey: `feedback:${r.roundId}:${member.id}`,
        payload: { workspaceName: r.workspace.name, roundAt: r.scheduledFor, firstName: member.firstName, matchId, partners },
      })
    }
  }
  await db.enqueue(nudges)
  report.nudges = nudges.length
  return report
}
