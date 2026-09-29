// Copies the pure logic in shared/ into supabase/functions/_shared/lib/ so Edge
// Functions (Deno) bundle the exact same code the app uses. Run after editing
// shared/: `npm run sync:shared`. A unit test fails if the copies drift.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'

const target = 'supabase/functions/_shared/lib'
mkdirSync(target, { recursive: true })
for (const file of readdirSync('shared').filter((f) => f.endsWith('.ts'))) {
  copyFileSync(`shared/${file}`, `${target}/${file}`)
  console.log(`shared/${file} → ${target}/${file}`)
}
