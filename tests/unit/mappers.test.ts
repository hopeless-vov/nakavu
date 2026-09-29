import { profileRow, workspaceRow } from './fixtures'
import { toMyWorkspace, toProfile, toProfileUpdate, toWorkspaceArgs, toWorkspaceUpdate } from '~/utils/mappers'

describe('mappers', () => {
  it('maps a profile row', () => {
    expect(toProfile(profileRow())).toMatchObject({
      firstName: 'Priya',
      meetingFormat: 'both',
      locale: 'en',
      notifyProduct: false,
      onboardedAt: '2026-09-01T09:00:00Z',
    })
  })

  it('maps every profile field to its column and drops unknown or undefined keys', () => {
    const patch = {
      firstName: 'a', lastName: 'b', jobTitle: 'c', department: 'd', city: 'e', meetingFormat: 'online' as const,
      languages: ['uk'], interests: ['x'], askMeAbout: 'f', avatarUrl: null, locale: 'nl' as const, timezone: 'UTC',
      notifyMatch: false, notifyReminder: false, notifyFeedback: false, notifyProduct: true, onboardedAt: 'now',
    }
    expect(toProfileUpdate(patch)).toEqual({
      first_name: 'a', last_name: 'b', job_title: 'c', department: 'd', city: 'e', meeting_format: 'online',
      languages: ['uk'], interests: ['x'], ask_me_about: 'f', avatar_url: null, locale: 'nl', timezone: 'UTC',
      notify_match: false, notify_reminder: false, notify_feedback: false, notify_product: true, onboarded_at: 'now',
    })
    expect(toProfileUpdate({ city: undefined, ...({ email: 'x' } as object) })).toEqual({})
  })

  it('maps workspace create args and every update field', () => {
    const input = { name: 'N', kind: 'friends' as const, groupSize: 3 as const, cadence: 'weekly' as const, anchorDay: 5, roundHour: 18, timezone: 'Europe/Kyiv', allowedDomains: ['a.com'], nextRoundAt: 'x' }
    expect(toWorkspaceArgs(input)).toEqual({
      p_name: 'N', p_kind: 'friends', p_group_size: 3, p_cadence: 'weekly', p_anchor_day: 5, p_round_hour: 18,
      p_timezone: 'Europe/Kyiv', p_allowed_domains: ['a.com'], p_next_round_at: 'x',
    })
    expect(toWorkspaceUpdate({ ...input, logoUrl: 'l' })).toEqual({
      name: 'N', kind: 'friends', group_size: 3, cadence: 'weekly', anchor_day: 5, round_hour: 18,
      timezone: 'Europe/Kyiv', allowed_domains: ['a.com'], next_round_at: 'x', logo_url: 'l',
    })
    expect(toWorkspaceUpdate({})).toEqual({})
  })

  it('defaults member count to zero', () => {
    const row = { role: 'member' as const, include_in_matching: true, skip_next_round: true, workspaces: { ...workspaceRow(), memberships: [] } }
    expect(toMyWorkspace(row)).toMatchObject({ memberCount: 0, skipNextRound: true })
  })
})
