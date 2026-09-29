import { type DueWorkspace, type Member, type OutboxEmail, planRound, type RoundsDb, runDueRounds } from '../../supabase/functions/_shared/rounds'
import { readdirSync, readFileSync } from 'node:fs'

const ws = (over: Partial<DueWorkspace> = {}): DueWorkspace => ({
  id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work', groupSize: 2,
  cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: 'Europe/Amsterdam', nextRoundAt: '2026-10-01T07:00:00.000Z', ...over,
})
const member = (id: string, over: Partial<Member> = {}): Member => ({
  id, firstName: id.toUpperCase(), lastName: 'X', email: `${id}@nw.com`, jobTitle: 'Eng', department: `d-${id}`, city: 'Kyiv',
  meetingFormat: 'both', languages: ['en'], interests: ['jazz'], askMeAbout: '', avatarUrl: null, locale: 'uk', timezone: 'Europe/Kyiv',
  notifyMatch: true, notifyReminder: true, notifyFeedback: true, skipNextRound: false, ...over,
})

describe('shared code copies for Edge Functions', () => {
  it('match shared/ exactly (run `npm run sync:shared`)', () => {
    for (const file of readdirSync('shared').filter((f) => f.endsWith('.ts'))) {
      expect(readFileSync(`supabase/functions/_shared/lib/${file}`, 'utf8'), file).toBe(readFileSync(`shared/${file}`, 'utf8'))
    }
  })
})

describe('planRound', () => {
  it('pairs the draw, leaves skippers out and writes match emails with partners and starters', () => {
    const members = [member('a'), member('b'), member('c', { skipNextRound: true }), member('d', { notifyMatch: false })]
    const plan = planRound(ws(), members, [], 'r1')
    expect(plan.participants).toBe(3)
    expect(plan.groups).toHaveLength(1)
    expect(plan.groups[0]!.sort()).toEqual(['a', 'b', 'd'])
    expect(plan.next).toBe('2026-11-01T08:00:00.000Z')
    const mails = plan.emails
    expect(mails.map((e) => e.userId).sort()).toEqual(['a', 'b'])
    const a = mails.find((e) => e.userId === 'a')!
    expect(a).toMatchObject({ kind: 'match', toEmail: 'a@nw.com', locale: 'uk', dedupeKey: 'match:r1:a' })
    expect((a.payload.partners as { name: string }[]).map((p) => p.name).sort()).toEqual(['B X', 'D X'])
    expect(a.payload.starters).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'starters.sharedInterest' })]))
    expect(a.payload).toMatchObject({ workspaceName: 'Northwind', roundAt: '2026-10-01T07:00:00.000Z', nextRoundAt: '2026-11-01T08:00:00.000Z', firstName: 'A' })
  })

  it('tells unmatched people there is no match this time (unless they opted out)', () => {
    const plan = planRound(ws(), [member('a', { languages: ['uk'] }), member('b', { languages: ['nl'] }), member('c', { languages: ['ja'], notifyMatch: false })], [], 'r2')
    expect(plan.groups).toEqual([])
    expect(plan.emails.map((e) => [e.kind, e.userId]).sort()).toEqual([['no_match', 'a'], ['no_match', 'b']])
  })
})

function fakeDb(over: Partial<RoundsDb> = {}) {
  const outbox: OutboxEmail[] = []
  const calls: string[] = []
  const db: RoundsDb = {
    dueWorkspaces: vi.fn(async () => [ws()]),
    members: vi.fn(async () => [member('a'), member('b'), member('c', { skipNextRound: true, notifyReminder: true }), member('d', { notifyReminder: false })]),
    history: vi.fn(async () => [{ a: 'a', b: 'b', roundsAgo: 1 }]),
    createRound: vi.fn(async (_w, at) => ({ id: 'r1', scheduledFor: at })),
    saveMatches: vi.fn(async (_r, _w, groups) => groups.map((g, i) => ({ id: `m${i}`, members: g }))),
    finishRound: vi.fn(async () => void calls.push('finish')),
    clearSkips: vi.fn(async () => void calls.push('clear')),
    setNextRound: vi.fn(async (_w, at) => void calls.push(`next:${at}`)),
    enqueue: vi.fn(async (e) => void outbox.push(...e)),
    upcomingWorkspaces: vi.fn(async () => [ws({ id: 'w2', nextRoundAt: '2026-10-03T07:00:00.000Z' })]),
    unansweredRounds: vi.fn(async () => [
      {
        roundId: 'old',
        scheduledFor: '2026-09-01T07:00:00.000Z',
        workspace: ws({ nextRoundAt: '2026-10-01T07:00:00.000Z' }),
        members: [
          { matchId: 'm9', member: member('a'), partners: ['B X'] },
          { matchId: 'm9', member: member('b', { notifyFeedback: false }), partners: ['A X'] },
        ],
      },
      { roundId: 'fresh', scheduledFor: '2026-09-29T07:00:00.000Z', workspace: ws({ nextRoundAt: '2026-10-29T07:00:00.000Z' }), members: [{ matchId: 'm8', member: member('z'), partners: [] }] },
    ]),
    ...over,
  }
  return { db, outbox, calls }
}

describe('runDueRounds', () => {
  const now = new Date('2026-10-01T07:05:00Z')

  it('runs due rounds in order: matches, emails, finish, clear skips, schedule', async () => {
    const { db, outbox, calls } = fakeDb()
    const report = await runDueRounds(db, now)
    expect(db.dueWorkspaces).toHaveBeenCalledWith(now, 25)
    expect(db.createRound).toHaveBeenCalledWith('w1', '2026-10-01T07:00:00.000Z')
    expect(db.history).toHaveBeenCalledWith('w1', 12)
    expect(db.saveMatches).toHaveBeenCalledWith('r1', 'w1', expect.any(Array))
    expect(calls).toEqual(['finish', 'clear', 'next:2026-11-01T08:00:00.000Z'])
    expect(db.finishRound).toHaveBeenCalledWith('r1', 3, 0)
    expect(report.rounds).toEqual([{ workspaceId: 'w1', groups: 1, unmatched: 0, skipped: false }])
    expect(outbox.filter((e) => e.kind === 'match')).toHaveLength(3)
  })

  it('queues reminders for people in the draw who want them', async () => {
    const { db, outbox } = fakeDb({ dueWorkspaces: vi.fn(async () => []) })
    const report = await runDueRounds(db, now)
    expect(db.upcomingWorkspaces).toHaveBeenCalledWith(now, new Date('2026-10-04T07:05:00Z'))
    const reminders = outbox.filter((e) => e.kind === 'reminder')
    expect(reminders.map((e) => e.userId)).toEqual(['a', 'b'])
    expect(reminders[0]!.dedupeKey).toBe('reminder:w2:2026-10-03T07:00:00.000Z:a')
    expect(report.reminders).toBe(2)
  })

  it('nudges unanswered matches only after the halfway point', async () => {
    const { db, outbox } = fakeDb({ dueWorkspaces: vi.fn(async () => []), upcomingWorkspaces: vi.fn(async () => []) })
    const report = await runDueRounds(db, new Date('2026-09-20T00:00:00Z'))
    expect(report.nudges).toBe(1)
    expect(outbox).toEqual([expect.objectContaining({ kind: 'feedback', userId: 'a', dedupeKey: 'feedback:old:a', payload: expect.objectContaining({ matchId: 'm9', partners: ['B X'] }) })])
  })

  it('only moves the schedule on when the round already exists (retry)', async () => {
    const { db, calls } = fakeDb({ createRound: vi.fn(async () => null), upcomingWorkspaces: vi.fn(async () => []), unansweredRounds: vi.fn(async () => []) })
    const report = await runDueRounds(db, now)
    expect(db.saveMatches).not.toHaveBeenCalled()
    expect(calls).toEqual(['next:2026-11-01T08:00:00.000Z'])
    expect(report.rounds[0]!.skipped).toBe(true)
  })

  it('uses the current time by default', async () => {
    const { db } = fakeDb({ dueWorkspaces: vi.fn(async () => []), upcomingWorkspaces: vi.fn(async () => []), unansweredRounds: vi.fn(async () => []) })
    await runDueRounds(db)
    expect(vi.mocked(db.dueWorkspaces).mock.calls[0]![0]).toBeInstanceOf(Date)
  })
})
