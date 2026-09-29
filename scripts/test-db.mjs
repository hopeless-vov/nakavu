// Runs pgTAP files in supabase/tests/database against the local Supabase DB
// container via psql (no bind mounts needed). Exits non-zero on any failure.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'supabase/tests/database'
const container = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_nakavu'
let failed = 0

for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = `create extension if not exists pgtap with schema extensions;\nset search_path = public, extensions;\n${readFileSync(join(dir, file), 'utf8')}`
  let out
  try {
    out = execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (e) {
    out = `${e.stdout ?? ''}\nnot ok - ${file} crashed: ${e.stderr ?? e.message}`
  }
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean)
  const bad = lines.filter((l) => l.startsWith('not ok') || /^# Looks like/.test(l))
  const passed = lines.filter((l) => l.startsWith('ok ')).length
  if (bad.length) {
    failed++
    console.log(`✗ ${file} — ${passed} passed`)
    for (const l of lines.filter((l) => l.startsWith('not ok') || l.startsWith('#'))) console.log(`   ${l}`)
  } else {
    console.log(`✓ ${file} — ${passed} passed`)
  }
}
process.exit(failed ? 1 : 0)
