import { AUTH_SUBJECTS, AUTH_TEMPLATES, buildAuthTemplate } from '../../supabase/functions/_shared/email/auth-templates'
import { readFileSync } from 'node:fs'

describe('Supabase auth email templates', () => {
  it('are up to date (run `npm run email:auth`)', () => {
    for (const t of AUTH_TEMPLATES) expect(readFileSync(`supabase/templates/${t}.html`, 'utf8'), t).toBe(buildAuthTemplate(t))
  })

  it('are registered in supabase/config.toml with their subjects', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    for (const t of AUTH_TEMPLATES) {
      expect(config).toContain(`[auth.email.template.${t}]\nsubject = "${AUTH_SUBJECTS[t]}"\ncontent_path = "./supabase/templates/${t}.html"`)
    }
  })

  it('switch language on .Data.locale without comparing nil', () => {
    const html = buildAuthTemplate('magic_link')
    expect(html).toContain('{{ $locale := printf "%v" .Data.locale }}{{ if eq $locale "en" }}')
    expect(html).toContain('{{ else if eq $locale "nl" }}')
    expect(html.match(/<html lang="(uk|en|nl)"/g)).toEqual(['<html lang="en"', '<html lang="nl"', '<html lang="uk"'])
  })

  it('link to our confirm page with a token hash and show the code (never the raw ConfirmationURL)', () => {
    for (const t of ['magic_link', 'confirmation'] as const) {
      const html = buildAuthTemplate(t)
      expect(html).toContain('{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email')
      expect(html).toContain('{{ .SiteURL }}/auth/confirm?next=/app&amp;token_hash={{ .TokenHash }}')
      expect(html).toContain('{{ .Token }}')
      expect(html).not.toContain('ConfirmationURL')
    }
    expect(buildAuthTemplate('email_change')).toContain('type=email_change')
    expect(buildAuthTemplate('email_change')).toContain('{{ .NewEmail }}')
    expect(buildAuthTemplate('invite')).toContain('type=invite')
    expect(buildAuthTemplate('invite')).not.toContain('{{ .Token }}')
  })

  it('reauthentication is code-only', () => {
    const html = buildAuthTemplate('reauthentication')
    expect(html).toContain('{{ .Token }}')
    expect(html).not.toContain('TokenHash')
  })

  it('has balanced Go template blocks', () => {
    for (const t of AUTH_TEMPLATES) {
      const html = buildAuthTemplate(t)
      const opens = (html.match(/\{\{ if /g) ?? []).length
      const ends = (html.match(/\{\{ end \}\}/g) ?? []).length
      expect(ends, t).toBe(opens)
    }
  })
})
