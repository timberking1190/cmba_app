/*
 * Member Cards — Canadian data-residency assertion (Non-negotiable 1, ADR 0002).
 *
 * The app already runs on the ca-central-1 Supabase project (`cmba-connect`). This
 * guardrail makes "no member-card data ever touches us-east-2" enforceable at
 * runtime: if the configured Postgres / Storage region is not Canadian, member-card
 * code paths refuse to operate rather than silently writing to the wrong region.
 *
 * Pure over its inputs (env is passed in) so it is unit-testable and callable from a
 * health check or a route guard. It is a config guardrail, not a network probe.
 */

const CANADIAN_REGION = 'ca-central-1'
// Known ca-central-1 Supabase project refs (direct `db.<ref>.supabase.co` URLs do
// not encode the region in the host, so we allowlist the ref). Extend via
// MEMBERCARD_ALLOWED_DB_REFS (comma-separated) rather than editing code.
const DEFAULT_ALLOWED_REFS = ['pdwautioosstdgbbblxl']

export interface ResidencyInputs {
  databaseUrl?: string | null
  s3Region?: string | null
  s3Endpoint?: string | null
  /** Extra allowed project refs (e.g. a ca-central-1 preview branch). */
  allowedRefs?: string[]
}

export interface ResidencyResult {
  ok: boolean
  problems: string[]
}

function extractSupabaseRef(url: string): string | null {
  // db.<ref>.supabase.co  |  https://<ref>.supabase.co/...  |  postgres.<ref>@...pooler
  const host = url.match(/(?:db\.)?([a-z0-9]{20})\.supabase\.co/i)
  if (host) return host[1].toLowerCase()
  const pooler = url.match(/postgres\.([a-z0-9]{20})/i)
  if (pooler) return pooler[1].toLowerCase()
  return null
}

export function checkCanadianResidency(inputs: ResidencyInputs): ResidencyResult {
  const problems: string[] = []
  const allowed = new Set([...DEFAULT_ALLOWED_REFS, ...(inputs.allowedRefs ?? [])].map((r) => r.toLowerCase()))

  const s3Region = (inputs.s3Region ?? '').trim()
  if (s3Region !== CANADIAN_REGION) {
    problems.push(`S3_REGION is "${s3Region || '(unset)'}", expected "${CANADIAN_REGION}"`)
  }
  if (inputs.s3Endpoint && !/\.supabase\.co/i.test(inputs.s3Endpoint)) {
    problems.push('S3_ENDPOINT is not a Supabase Storage endpoint')
  }

  const dbUrl = (inputs.databaseUrl ?? '').trim()
  if (!dbUrl) {
    problems.push('DATABASE_URL is unset')
  } else {
    const mentionsCaRegion = dbUrl.includes(CANADIAN_REGION) // pooler host encodes the region
    const ref = extractSupabaseRef(dbUrl)
    const refAllowed = ref != null && allowed.has(ref)
    if (!mentionsCaRegion && !refAllowed) {
      problems.push(
        `DATABASE_URL is not a known ca-central-1 target (ref=${ref ?? 'unknown'}); ` +
          'add its ref to MEMBERCARD_ALLOWED_DB_REFS only if it is Canadian',
      )
    }
  }

  return { ok: problems.length === 0, problems }
}

/** Throwing wrapper for boot / health-check use. */
export function assertCanadianResidency(inputs: ResidencyInputs): void {
  const { ok, problems } = checkCanadianResidency(inputs)
  if (!ok) {
    throw new Error(`Member Cards residency check failed (must be ${CANADIAN_REGION}): ${problems.join('; ')}`)
  }
}

/** Convenience: read the residency inputs from process.env. */
export function residencyFromEnv(env: NodeJS.ProcessEnv = process.env): ResidencyInputs {
  return {
    databaseUrl: env.DATABASE_URL,
    s3Region: env.S3_REGION,
    s3Endpoint: env.S3_ENDPOINT,
    allowedRefs: (env.MEMBERCARD_ALLOWED_DB_REFS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }
}
