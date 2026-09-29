import type { PersonJson, ProfileRow, WorkspaceRow } from '~/utils/mappers'

export function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    email: 'priya@northwind.com',
    first_name: 'Priya',
    last_name: 'Raman',
    job_title: 'Product Owner',
    department: 'Payments',
    city: 'Amsterdam',
    meeting_format: 'both',
    languages: ['en', 'hi'],
    interests: ['Sourdough', 'Board games'],
    ask_me_about: 'the office basement',
    avatar_url: null,
    locale: 'en',
    timezone: 'Europe/Amsterdam',
    notify_match: true,
    notify_reminder: true,
    notify_feedback: true,
    notify_product: false,
    onboarded_at: '2026-09-01T09:00:00Z',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
    ...overrides,
  }
}

export function personJson(overrides: Partial<PersonJson> = {}): PersonJson {
  return {
    id: 'u2',
    email: 'tomas@northwind.com',
    first_name: 'Tomás',
    last_name: 'Herrera',
    job_title: 'Data Engineer',
    department: 'Risk',
    city: 'Lisbon',
    meeting_format: 'in_person',
    languages: ['en', 'pt', 'es'],
    interests: ['Sourdough', 'Jazz'],
    ask_me_about: 'fraud and croissants',
    avatar_url: null,
    ...overrides,
  }
}

export function workspaceRow(overrides: Partial<WorkspaceRow> = {}): WorkspaceRow {
  return {
    id: 'w1',
    name: 'Northwind Group',
    slug: 'northwind-group',
    kind: 'work',
    logo_url: null,
    allowed_domains: ['northwind.com'],
    group_size: 2,
    cadence: 'monthly',
    anchor_day: 1,
    round_hour: 9,
    timezone: 'Europe/Amsterdam',
    next_round_at: '2026-10-01T07:00:00Z',
    invite_token: 'tok',
    created_by: 'u1',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
    ...overrides,
  }
}
