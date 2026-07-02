/*
 * Member Cards runtime smoke (E2E of the issuance + verify data path against the real
 * DB). Creates ONE throwaway coach, asserts auto-issuance, simulates a valid scan +
 * a revocation, then DELETES everything it made. Self-cleaning (try/finally).
 *
 * Guarded: set MEMBERCARD_SMOKE_ALLOW=1. Needs MEMBERCARD_SIGNING_* in the env.
 * Usage:  MEMBERCARD_SMOKE_ALLOW=1 npm run smoke:member-cards
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { issueCardForUser, loadRequirementMatrix } from '../src/lib/memberCards/issuance'
import { buildPublicKeyResolver, getActiveSigningKey, isSigningConfigured } from '../src/lib/memberCards/keys'
import { mintPassToken } from '../src/lib/memberCards/token'
import { verifyPassToken } from '../src/lib/memberCards/token'
import { decideQrVerdict } from '../src/lib/memberCards/verify'
import { loadScannedPassBySerial } from '../src/lib/memberCards/verifyRoute'

const EMAIL = 'mc-e2e-smoke@example.invalid'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`)
}

async function main() {
  if (process.env.MEMBERCARD_SMOKE_ALLOW !== '1') throw new Error('Set MEMBERCARD_SMOKE_ALLOW=1 to run.')
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[smoke:member-cards] ${m}`)
  assert(isSigningConfigured(), 'MEMBERCARD_SIGNING_* must be configured (check .env loading)')

  const createdCertIds: number[] = []
  let userId: number | null = null
  let passSerial: string | null = null

  try {
    // Clean any leftover from a prior run.
    const prior = await payload.find({ collection: 'users', where: { email: { equals: EMAIL } }, limit: 1, overrideAccess: true })
    if (prior.docs.length) userId = (prior.docs[0] as { id: number }).id
    if (userId) await cleanup(payload, userId)

    // 1. Create a coach → auto-issuance fires.
    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipConsentEnforcement: true },
      data: { fullName: 'E2E Smoke Coach', email: EMAIL, password: 'Smoke!Test9aA', roles: ['coach'], status: 'active', dateOfBirth: '1990-05-05' } as never,
    })
    userId = (user as { id: number }).id
    log(`created coach id=${userId}`)

    const reloaded = await payload.findByID({ collection: 'users', id: userId, overrideAccess: true })
    assert((reloaded as { memberNumber?: string }).memberNumber === `CMBA-${String(userId).padStart(5, '0')}`, 'member number assigned')

    const passes = await payload.find({ collection: 'passes', where: { member: { equals: userId } }, overrideAccess: true })
    assert(passes.docs.length === 1, 'exactly one base pass created')
    const pass = passes.docs[0] as { serialNumber: string; status: string; currentJti: string | null; platform: string }
    passSerial = pass.serialNumber
    assert(pass.platform === 'print' && pass.status === 'issued', 'base pass is issued/print')
    assert(!!pass.currentJti, 'scannable coach pass has a current jti (token minted)')
    const tokens = await payload.count({ collection: 'verification-tokens', where: { pass: { equals: (passes.docs[0] as { id: number }).id } }, overrideAccess: true })
    assert(tokens.totalDocs === 1, 'a verification-token row was minted')
    log(`issuance OK: memberNumber + pass ${passSerial} + token`)

    // 2. Give the coach their gating credentials (valid).
    const matrix = await loadRequirementMatrix(payload)
    const gatingTypeIds = matrix.filter((r) => r.role === 'coach').map((r) => Number(r.credential))
    assert(gatingTypeIds.length > 0, 'coach card has gating credentials')
    for (const typeId of gatingTypeIds) {
      const c = await payload.create({
        collection: 'certifications',
        overrideAccess: true,
        data: { user: userId, type: typeId, source: 'registration', issueDate: '2024-01-01', expiryDate: '2027-12-31', verifiedAt: new Date().toISOString() } as never,
      })
      createdCertIds.push((c as { id: number }).id)
    }
    log(`created ${gatingTypeIds.length} valid gating credentials`)

    // 3. Simulate a scan of a current token → expect valid.
    const signingKey = getActiveSigningKey()!
    const iat = Math.floor(Date.now() / 1000)
    const mkToken = (jti: string) => mintPassToken({ passSerial: passSerial!, jti, channel: 'print', kid: signingKey.kid, iat, exp: iat + 3600, privateKeyPem: signingKey.privateKeyPem })

    let loaded = await loadScannedPassBySerial(payload, passSerial)
    assert(loaded && loaded.member.roles.includes('coach'), 'pass loads with coach member')
    const currentJti = (await payload.findByID({ collection: 'passes', id: (passes.docs[0] as { id: number }).id, overrideAccess: true }) as { currentJti: string }).currentJti

    const validToken = mkToken(currentJti)
    const verified = verifyPassToken(validToken, { resolvePublicKeyPem: buildPublicKeyResolver(), nowSeconds: iat })
    assert(verified.ok, 'token verifies')
    let verdict = decideQrVerdict({ token: { ok: true, jti: currentJti, passSerial: passSerial }, pass: loaded, ctx: { requirementRows: matrix, now: new Date() } })
    assert(verdict.result === 'valid' && verdict.cleared, `fully-credentialed coach scans valid (got ${verdict.result})`)
    log('VALID scan OK')

    // 4. Old/rotated token → revoked_token.
    verdict = decideQrVerdict({ token: { ok: true, jti: 'stale-jti-0000', passSerial: passSerial }, pass: loaded, ctx: { requirementRows: matrix, now: new Date() } })
    assert(verdict.result === 'revoked_token', `stale token → revoked_token (got ${verdict.result})`)
    log('REVOKED_TOKEN (stale screenshot) OK')

    // 5. Remove one credential → expired_credentials.
    await payload.delete({ collection: 'certifications', id: createdCertIds.pop()!, overrideAccess: true })
    loaded = await loadScannedPassBySerial(payload, passSerial)
    verdict = decideQrVerdict({ token: { ok: true, jti: currentJti, passSerial: passSerial }, pass: loaded, ctx: { requirementRows: matrix, now: new Date() } })
    assert(verdict.result === 'expired_credentials' && (verdict.missing?.length ?? 0) === 1, `missing a credential → expired_credentials (got ${verdict.result})`)
    log('EXPIRED_CREDENTIALS (missing one) OK')

    log('✅ ALL SMOKE ASSERTIONS PASSED')
  } finally {
    if (userId) await cleanup(payload, userId)
    log('cleaned up test data')
  }
}

async function cleanup(payload: Awaited<ReturnType<typeof getPayload>>, userId: number) {
  const passes = await payload.find({ collection: 'passes', where: { member: { equals: userId } }, overrideAccess: true, limit: 100 })
  for (const p of passes.docs as Array<{ id: number }>) {
    await payload.delete({ collection: 'verification-tokens', where: { pass: { equals: p.id } }, overrideAccess: true }).catch(() => {})
    await payload.delete({ collection: 'passes', id: p.id, overrideAccess: true }).catch(() => {})
  }
  await payload.delete({ collection: 'certifications', where: { user: { equals: userId } }, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'users', id: userId, overrideAccess: true }).catch(() => {})
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
