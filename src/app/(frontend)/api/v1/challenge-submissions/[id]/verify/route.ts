import { NextResponse } from 'next/server'
import { APIError } from 'payload'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse, numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { canVerifyChallenge } from '@/lib/gamification/challengeVerify'
import { writeAudit } from '@/lib/games/service'
import { checkRateLimit } from '@/lib/rateLimit'
import { getVerifiedTeamIdsForRole } from '@/lib/teamAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const relId = (r: unknown): number | string | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: number | string }).id : (r as number | string)

/*
 * POST /api/v1/challenge-submissions/:id/verify - a verified coach (of the team on
 * the submission) or an admin verifies a challenge submission. Coach authorization
 * is asynchronous (it queries verified coach memberships), so per the build plan it
 * is done HERE in the route, not as a field lock: after authorizing, the route
 * writes verified=true via overrideAccess (the field is superAdminFieldOnly) and
 * audits it. The ChallengeSubmissions afterChange hook then grants the meaningful
 * (verified) XP. Idempotent: a repeat verify is a no-op.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subId = numericId(id)
  if (subId == null) return NextResponse.json({ error: 'Invalid submission id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rl = await checkRateLimit(payload, { bucket: 'challenge-verify', subject: String(user.id), limit: 60, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  return mutationResponse(payload, req, {
    scope: `challenge-verify:${subId}`,
    userId: String(user.id),
    method: 'POST',
    path: `/api/v1/challenge-submissions/${subId}/verify`,
    logical: { id: subId },
    run: async () => {
      const sub = await payload.findByID({ collection: 'challenge-submissions', id: subId, depth: 0, overrideAccess: true }).catch(() => null)
      if (!sub) throw new APIError('That submission was not found.', 404, undefined, true)
      if ((sub as { verified?: boolean }).verified) return { statusCode: 200, body: { ok: true, alreadyVerified: true } }

      // Authorize: an admin, or a VERIFIED COACH of the team on this submission.
      const isAdmin = isAnyAdmin(user)
      const teamId = relId((sub as { team?: unknown }).team)
      const coachTeamIds = !isAdmin && teamId != null ? await getVerifiedTeamIdsForRole(payload, user.id, 'coach') : []
      if (!canVerifyChallenge({ isAdmin, submissionTeamId: teamId ?? null, coachTeamIds })) {
        throw new APIError('Only a verified coach of this team or an admin can verify this submission.', 403, undefined, true)
      }

      await payload.update({
        collection: 'challenge-submissions',
        id: subId,
        overrideAccess: true,
        data: { verified: true, verifiedBy: user.id, verifiedAt: new Date().toISOString() } as never,
      })
      await writeAudit(payload, { actor: { id: user.id, email: user.email }, action: 'challenge.verify', entity: 'challenge-submissions', entityId: subId, after: { verifiedBy: user.id, team: teamId ?? null } })
      return { statusCode: 200, body: { ok: true, verified: true } }
    },
  })
}
