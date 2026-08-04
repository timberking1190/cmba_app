/*
 * Email health rollups for the admin surface (/api/v1/admin/email-health and the
 * EmailSendLog admin view). Kept as a pure function over a minimal payload shape so
 * it is unit testable without a live database.
 *
 * Copy rule: no em or en dashes anywhere.
 */

export type CountArgs = { collection: string; where?: unknown }
export type FindArgs = { collection: string; where?: unknown; sort?: string; limit?: number; depth?: number; overrideAccess?: boolean }

export interface HealthPayload {
  count: (args: CountArgs) => Promise<{ totalDocs: number }>
  find: (args: FindArgs) => Promise<{ docs: Array<Record<string, unknown>> }>
}

export type Window = { sent: number; failed: number; total: number; failureRate: number }

export interface EmailHealth {
  configured: boolean
  transport: 'ses' | 'json'
  windows: { last24h: Window; last7d: Window; last30d: Window }
  recentFailures: Array<{ category: string; recipientDomain: string; errorCode: string; sentAt: string }>
  alert: boolean
  warnings: string[]
  generatedAt: string
}

const DAY = 86_400_000

async function windowCounts(payload: HealthPayload, sinceISO: string): Promise<Window> {
  const base = { sentAt: { greater_than_equal: sinceISO } }
  const [sentRes, failedRes] = await Promise.all([
    payload.count({ collection: 'email-send-log', where: { and: [base, { status: { equals: 'sent' } }] } }),
    payload.count({ collection: 'email-send-log', where: { and: [base, { status: { equals: 'failed' } }] } }),
  ])
  const sent = sentRes.totalDocs
  const failed = failedRes.totalDocs
  const total = sent + failed
  return { sent, failed, total, failureRate: total > 0 ? failed / total : 0 }
}

export async function computeEmailHealth(payload: HealthPayload, now: Date = new Date()): Promise<EmailHealth> {
  const t = now.getTime()
  const configured = Boolean(process.env.SES_SMTP_HOST)
  const transport: 'ses' | 'json' = configured ? 'ses' : 'json'

  const [last24h, last7d, last30d, failuresRes] = await Promise.all([
    windowCounts(payload, new Date(t - DAY).toISOString()),
    windowCounts(payload, new Date(t - 7 * DAY).toISOString()),
    windowCounts(payload, new Date(t - 30 * DAY).toISOString()),
    payload.find({ collection: 'email-send-log', where: { status: { equals: 'failed' } }, sort: '-sentAt', limit: 10, depth: 0, overrideAccess: true }),
  ])

  const recentFailures = failuresRes.docs.map((d) => ({
    category: String(d.category ?? 'other'),
    recipientDomain: String(d.recipientDomain ?? 'unknown'),
    errorCode: String(d.errorCode ?? 'ERROR'),
    sentAt: String(d.sentAt ?? ''),
  }))

  const warnings: string[] = []
  // In production, jsonTransport means nothing is actually being delivered.
  if (!configured && process.env.NODE_ENV === 'production') {
    warnings.push('SES is not configured, so transactional email is logged but not delivered.')
  }
  // Elevated failure rate over a meaningful sample in the last day.
  const elevated = last24h.total >= 5 && last24h.failureRate > 0.2
  if (elevated) {
    warnings.push(`Elevated email failure rate in the last 24 hours: ${Math.round(last24h.failureRate * 100)} percent of ${last24h.total} sends failed.`)
  }

  return {
    configured,
    transport,
    windows: { last24h, last7d, last30d },
    recentFailures,
    alert: elevated || (!configured && process.env.NODE_ENV === 'production'),
    warnings,
    generatedAt: now.toISOString(),
  }
}
