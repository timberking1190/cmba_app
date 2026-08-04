import { NextResponse } from 'next/server'

/*
 * Stage C / S0 — CSP violation sink referenced by the policy's report-uri.
 * Browsers POST violation reports here (application/csp-report or
 * application/reports+json). We log a scrubbed, bounded summary so a preview
 * deploy in Report-Only mode surfaces what a strict policy would block, then we
 * enforce. We never persist personal data and always answer 204 so a malformed or
 * flooded report can never error or leak detail.
 */

export const runtime = 'nodejs'

// Only keep the fields useful for tuning the policy; drop everything else.
function summarize(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const report = (b['csp-report'] as Record<string, unknown>) || b
  if (!report || typeof report !== 'object') return null
  const pick = (k: string) => {
    const v = (report as Record<string, unknown>)[k]
    return typeof v === 'string' ? v.slice(0, 300) : undefined
  }
  return {
    directive: pick('violated-directive') || pick('effectiveDirective'),
    blockedUri: pick('blocked-uri') || pick('blockedURL'),
    documentUri: pick('document-uri') || pick('documentURL'),
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const raw = await req.text()
    // Bound the payload so a hostile client cannot flood logs/memory.
    if (raw.length <= 16_384) {
      const parsed = JSON.parse(raw)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items.slice(0, 10)) {
        const summary = summarize(item)
        if (summary?.directive) {
          console.warn('[csp-report]', JSON.stringify(summary))
        }
      }
    }
  } catch {
    // Ignore unparseable reports.
  }
  return new NextResponse(null, { status: 204 })
}
