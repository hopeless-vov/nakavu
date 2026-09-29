// RoundsDb backed by Supabase (service role). Thin by design: all decisions
// live in rounds.ts, which is unit-tested; this file only moves rows.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

import type { PastMeeting } from './lib/matching.ts'
import type { DueWorkspace, Member, OutboxEmail, RoundsDb } from './rounds.ts'

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>

const toWorkspace = (w: Row): DueWorkspace => ({
  id: w.id,
  name: w.name,
  slug: w.slug,
  kind: w.kind,
  groupSize: w.group_size,
  cadence: w.cadence,
  anchorDay: w.anchor_day,
  roundHour: w.round_hour,
  timezone: w.timezone,
  nextRoundAt: w.next_round_at,
})

const toMember = (m: Row): Member => {
  const p = m.profiles
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    jobTitle: p.job_title,
    department: p.department,
    city: p.city,
    meetingFormat: p.meeting_format,
    languages: p.languages,
    interests: p.interests,
    askMeAbout: p.ask_me_about,
    avatarUrl: p.avatar_url,
    locale: p.locale,
    timezone: p.timezone,
    notifyMatch: p.notify_match,
    notifyReminder: p.notify_reminder,
    notifyFeedback: p.notify_feedback,
    skipNextRound: m.skip_next_round,
  }
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const MEMBER_SELECT = 'skip_next_round, profiles!inner(*)'

export function supabaseRoundsDb(db: SupabaseClient): RoundsDb {
  return {
    async dueWorkspaces(now, limit) {
      return check(await db.from('workspaces').select('*').lte('next_round_at', now.toISOString()).order('next_round_at').limit(limit)).map(toWorkspace)
    },

    async members(workspaceId) {
      const rows = check(
        await db.from('memberships').select(MEMBER_SELECT).eq('workspace_id', workspaceId).eq('include_in_matching', true).not('profiles.onboarded_at', 'is', null),
      )
      return (rows as Row[]).map(toMember)
    },

    async history(workspaceId, rounds) {
      const recent = check(
        await db.from('rounds').select('id').eq('workspace_id', workspaceId).eq('status', 'done').order('scheduled_for', { ascending: false }).limit(rounds),
      ) as Row[]
      if (!recent.length) return []
      const index = new Map(recent.map((r, i) => [r.id as string, i + 1]))
      const matches = check(await db.from('matches').select('round_id, match_members(user_id)').in('round_id', [...index.keys()])) as Row[]
      const out: PastMeeting[] = []
      for (const m of matches) {
        const ids = (m.match_members as Row[]).map((x) => x.user_id as string)
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push({ a: ids[i]!, b: ids[j]!, roundsAgo: index.get(m.round_id)! })
      }
      return out
    },

    async createRound(workspaceId, scheduledFor) {
      const res = await db.from('rounds').insert({ workspace_id: workspaceId, scheduled_for: scheduledFor }).select('id, scheduled_for').single()
      if (res.error?.code === '23505') return null
      const row = check(res) as Row
      return { id: row.id, scheduledFor: row.scheduled_for }
    },

    async saveMatches(roundId, workspaceId, groups) {
      const out: { id: string; members: string[] }[] = []
      for (const members of groups) {
        const match = check(await db.from('matches').insert({ round_id: roundId, workspace_id: workspaceId }).select('id').single()) as Row
        check(await db.from('match_members').insert(members.map((user_id) => ({ match_id: match.id, user_id }))))
        out.push({ id: match.id, members })
      }
      return out
    },

    async finishRound(roundId, participants, unmatched) {
      check(await db.from('rounds').update({ status: 'done', ran_at: new Date().toISOString(), participant_count: participants, unmatched_count: unmatched }).eq('id', roundId))
    },

    async clearSkips(workspaceId) {
      check(await db.from('memberships').update({ skip_next_round: false }).eq('workspace_id', workspaceId).eq('skip_next_round', true))
    },

    async setNextRound(workspaceId, at) {
      check(await db.from('workspaces').update({ next_round_at: at }).eq('id', workspaceId))
    },

    async enqueue(emails: OutboxEmail[]) {
      if (!emails.length) return
      check(
        await db.from('email_outbox').upsert(
          emails.map((e) => ({ kind: e.kind, user_id: e.userId, to_email: e.toEmail, locale: e.locale, payload: e.payload, dedupe_key: e.dedupeKey })),
          { onConflict: 'dedupe_key', ignoreDuplicates: true },
        ),
      )
    },

    async upcomingWorkspaces(now, until) {
      return check(
        await db.from('workspaces').select('*').gt('next_round_at', now.toISOString()).lte('next_round_at', until.toISOString()),
      ).map(toWorkspace)
    },

    async unansweredRounds(now) {
      const since = new Date(now.getTime() - 120 * 86_400_000).toISOString()
      const rounds = check(
        await db
          .from('rounds')
          .select('id, scheduled_for, workspaces!inner(*), matches(id, match_members(user_id, feedback, profiles!inner(*)))')
          .eq('status', 'done')
          .gte('scheduled_for', since),
      ) as Row[]
      return rounds.map((r) => ({
        roundId: r.id,
        scheduledFor: r.scheduled_for,
        workspace: toWorkspace(r.workspaces),
        members: (r.matches as Row[]).flatMap((m) => {
          const mm = m.match_members as Row[]
          return mm
            .filter((x) => x.feedback === null)
            .map((x) => ({
              matchId: m.id as string,
              member: toMember({ skip_next_round: false, profiles: x.profiles }),
              partners: mm.filter((o) => o.user_id !== x.user_id).map((o) => `${o.profiles.first_name} ${o.profiles.last_name}`.trim()),
            }))
        }),
      }))
    },
  }
}
