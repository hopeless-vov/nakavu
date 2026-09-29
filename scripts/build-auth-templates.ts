// Writes supabase/templates/*.html (Supabase Auth email templates) from
// supabase/functions/_shared/email/auth-templates.ts. Run: `npm run email:auth`.
// Then paste each file into Dashboard → Authentication → Emails (production),
// or rely on supabase/config.toml locally.
import { mkdirSync, writeFileSync } from 'node:fs'

import { AUTH_SUBJECTS, AUTH_TEMPLATES, buildAuthTemplate } from '../supabase/functions/_shared/email/auth-templates.ts'

mkdirSync('supabase/templates', { recursive: true })
for (const t of AUTH_TEMPLATES) {
  writeFileSync(`supabase/templates/${t}.html`, buildAuthTemplate(t))
  console.log(`supabase/templates/${t}.html  — subject: ${AUTH_SUBJECTS[t]}`)
}
