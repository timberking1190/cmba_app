#!/usr/bin/env node
/*
 * Dependency audit gate (Stage C / S0). Fails CI on any high or critical advisory
 * in PRODUCTION dependencies that is NOT in .audit-allowlist.json. The allowlist
 * holds triaged, accepted-pending-upgrade framework advisories (next / nodemailer
 * / undici via Payload + Next), documented in docs/SECURITY.md. A newly disclosed
 * high/critical advisory that is not yet triaged will fail the build.
 *
 * npm audit exits non-zero when advisories exist, so we capture stdout regardless
 * of exit code and parse the JSON ourselves.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const res = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
const stdout = res.stdout || ''
let report
try {
  report = JSON.parse(stdout)
} catch {
  console.error('audit-ci: could not parse npm audit output')
  console.error(stdout.slice(0, 2000))
  process.exit(2)
}

let allow = {}
try {
  allow = JSON.parse(readFileSync(new URL('../.audit-allowlist.json', import.meta.url), 'utf8')).allow || {}
} catch {
  console.error('audit-ci: missing or invalid .audit-allowlist.json')
  process.exit(2)
}

const offenders = new Map() // ghsa -> { severity, module, title }
for (const v of Object.values(report.vulnerabilities || {})) {
  for (const adv of v.via || []) {
    if (typeof adv !== 'object') continue
    if (adv.severity !== 'high' && adv.severity !== 'critical') continue
    const ghsa = (adv.url || '').split('/').pop()
    if (ghsa && !allow[ghsa]) {
      offenders.set(ghsa, { severity: adv.severity, module: adv.name, title: adv.title })
    }
  }
}

const allowCount = Object.keys(allow).length
if (offenders.size === 0) {
  console.log(`audit-ci: OK — 0 un-allowlisted high/critical advisories (${allowCount} triaged in .audit-allowlist.json).`)
  process.exit(0)
}

console.error(`audit-ci: FAIL — ${offenders.size} high/critical advisory(ies) not in the allowlist:`)
for (const [ghsa, info] of offenders) {
  console.error(`  [${info.severity}] ${info.module}: ${info.title}`)
  console.error(`           https://github.com/advisories/${ghsa}`)
}
console.error('\nTriage each: fix it, or (if a framework-transitive advisory with no compatible patch) add it to .audit-allowlist.json with a note and record it in docs/SECURITY.md.')
process.exit(1)
