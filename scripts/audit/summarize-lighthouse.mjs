/*
 * Reduce a .lighthouseci run to the median of each metric per route, and compare
 * it against the committed baseline.
 *
 * Lighthouse is noisy. Taking the median of three runs is what makes a CI gate
 * usable; a single run swings enough to fail a build for no reason.
 *
 * Usage:
 *   npx lhci collect --config=lighthouserc.json
 *   node scripts/audit/summarize-lighthouse.mjs            # print + write summary
 *   node scripts/audit/summarize-lighthouse.mjs --baseline # (re)write the baseline
 *   node scripts/audit/summarize-lighthouse.mjs --check    # exit 1 on regression
 *
 * These are LAB numbers under simulated throttling. They are not field data and
 * must never be reported as a real user 75th percentile.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const LHCI_DIR = path.join(ROOT, '.lighthouseci')
const BASELINE_PATH = path.join(ROOT, 'docs', 'audit', 'lighthouse-baseline.json')

/*
 * Regression tolerances. Lighthouse's own run to run variance on a shared CI
 * runner is real, so a gate that trips on a 1ms move is a gate everybody learns
 * to ignore. These allow normal noise and catch genuine slides.
 */
const TOLERANCE = {
  lcp: { absolute: 250, relative: 0.1 }, // ms, or 10 percent, whichever is larger
  tbt: { absolute: 50, relative: 0.25 },
  cls: { absolute: 0.02, relative: 0.25 },
  perf: { absolute: -3, relative: 0 }, // score: allow a 3 point drop
  a11y: { absolute: -2, relative: 0 },
}

/** Budgets from the module brief. Alert thresholds are 80 percent of the target. */
export const BUDGET = {
  lcp: { target: 2500, alert: 2000 },
  tbt: { target: 300, alert: 160 }, // stands in for INP, which needs field data
  cls: { target: 0.1, alert: 0.08 },
}

const median = (nums) => nums.slice().sort((a, b) => a - b)[Math.floor(nums.length / 2)]

function collect() {
  if (!existsSync(LHCI_DIR)) {
    console.error(`No ${LHCI_DIR}. Run: npx lhci collect --config=lighthouserc.json`)
    process.exit(1)
  }
  const files = readdirSync(LHCI_DIR).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
  if (!files.length) {
    console.error(`No Lighthouse reports in ${LHCI_DIR}.`)
    process.exit(1)
  }

  const byRoute = {}
  for (const f of files) {
    const r = JSON.parse(readFileSync(path.join(LHCI_DIR, f), 'utf8'))
    const route = new URL(r.finalDisplayedUrl || r.finalUrl).pathname
    ;(byRoute[route] ??= []).push({
      perf: Math.round(r.categories.performance.score * 100),
      a11y: Math.round(r.categories.accessibility.score * 100),
      bestPractices: Math.round(r.categories['best-practices'].score * 100),
      seo: Math.round(r.categories.seo.score * 100),
      lcp: Math.round(r.audits['largest-contentful-paint'].numericValue),
      fcp: Math.round(r.audits['first-contentful-paint'].numericValue),
      tbt: Math.round(r.audits['total-blocking-time'].numericValue),
      cls: Math.round(r.audits['cumulative-layout-shift'].numericValue * 1000) / 1000,
      speedIndex: Math.round(r.audits['speed-index'].numericValue),
    })
  }

  const summary = {}
  for (const [route, runs] of Object.entries(byRoute)) {
    const m = { runs: runs.length }
    for (const key of Object.keys(runs[0])) m[key] = median(runs.map((r) => r[key]))
    summary[route] = m
  }
  return summary
}

function print(summary, baseline) {
  const head = 'route'.padEnd(14) + 'perf a11y  bp seo |    LCP   FCP   TBT    CLS'
  console.log(head)
  console.log('-'.repeat(head.length))
  for (const [route, m] of Object.entries(summary)) {
    const b = baseline?.routes?.[route]
    const delta = (key, val, unit = '') => {
      if (!b || b[key] === undefined) return ''
      const d = val - b[key]
      if (d === 0) return ''
      return ` (${d > 0 ? '+' : ''}${Math.round(d * 1000) / 1000}${unit})`
    }
    console.log(
      route.padEnd(14) +
        String(m.perf).padStart(4) +
        String(m.a11y).padStart(5) +
        String(m.bestPractices).padStart(4) +
        String(m.seo).padStart(4) +
        ' | ' +
        String(m.lcp).padStart(6) +
        String(m.fcp).padStart(6) +
        String(m.tbt).padStart(6) +
        String(m.cls).padStart(7) +
        delta('lcp', m.lcp, 'ms'),
    )
  }
  console.log(
    `\nBudget (lab, mobile throttled): LCP alert ${BUDGET.lcp.alert}ms / target ${BUDGET.lcp.target}ms, ` +
      `TBT alert ${BUDGET.tbt.alert}ms, CLS alert ${BUDGET.cls.alert}.`,
  )
}

function check(summary, baseline) {
  if (!baseline) {
    console.error('No committed baseline to compare against. Run with --baseline first.')
    process.exit(1)
  }
  const problems = []

  for (const [route, m] of Object.entries(summary)) {
    const b = baseline.routes[route]
    if (!b) {
      console.log(`  ${route}: new route, no baseline, skipped`)
      continue
    }
    for (const [key, tol] of Object.entries(TOLERANCE)) {
      const now = m[key]
      const then = b[key]
      if (now === undefined || then === undefined) continue

      if (tol.absolute < 0) {
        // Score metric: higher is better, so a drop past the allowance is a regression.
        if (now - then < tol.absolute) {
          problems.push(`${route} ${key}: ${then} -> ${now} (dropped ${then - now}, allowed ${-tol.absolute})`)
        }
        continue
      }
      // Timing metric: lower is better.
      const allowed = Math.max(tol.absolute, then * tol.relative)
      if (now - then > allowed) {
        problems.push(
          `${route} ${key}: ${then} -> ${now} (worse by ${Math.round((now - then) * 1000) / 1000}, allowed ${Math.round(allowed * 1000) / 1000})`,
        )
      }
    }
  }

  if (problems.length) {
    console.error('\nREGRESSION against docs/audit/lighthouse-baseline.json:')
    for (const p of problems) console.error(`  ${p}`)
    console.error('\nEither fix the regression or, if the change is deliberate and justified, rebaseline with --baseline and say why in docs/VERIFICATION.md.')
    process.exit(1)
  }
  console.log('\nNo regression against the committed baseline.')
}

const summary = collect()
const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null

print(summary, baseline)

if (process.argv.includes('--baseline')) {
  mkdirSync(path.dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        capturedAt: process.env.AUDIT_CAPTURED_AT || new Date().toISOString(),
        note: 'Median of 3 Lighthouse runs per route, mobile emulation with simulated slow 4G and 4x CPU slowdown, against a local production build. LAB numbers. Not field data.',
        budget: BUDGET,
        routes: summary,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`\nWrote ${path.relative(ROOT, BASELINE_PATH)}`)
}

if (process.argv.includes('--check')) check(summary, baseline)
