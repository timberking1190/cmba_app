/*
 * Users lifecycle hooks: minor derivation, server-side consent enforcement,
 * guardian confirmation flow, and the append-only consent audit log.
 *
 * The consent sign-off is a HARD, server-enforced requirement (see
 * docs ACCOUNT_CREATION_CONSENT_AND_BUILD Part 3). The front end is never
 * trusted: a Users.create is REJECTED unless the required consent fields match
 * the current PolicyVersions. Admin-created users and the seed/bootstrap are
 * exempt (those users re-consent at first sign-in).
 */
import crypto from 'crypto'
import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionAfterChangeHook } from 'payload'
import { APIError } from 'payload'

import { isSuperAdmin } from '../../access/index'
import { isUnder18 } from '../../lib/age'
import { CATEGORY_HEADER } from '../../lib/email/meta'

export { isUnder18 }

/** Derive isMinor from dateOfBirth on every write so it can never drift. */
export const deriveIsMinor: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  if (data.dateOfBirth) data.isMinor = isUnder18(data.dateOfBirth)
  return data
}

/**
 * Enforce the consent sign-off server-side on account creation. Exempt:
 *  - the seed/bootstrap (req.context.skipConsentEnforcement)
 *  - super-admin-created accounts (admin panel)
 *  - the very first user (empty Users collection)
 */
export const enforceConsent: CollectionBeforeValidateHook = async ({ data, req, operation }) => {
  if (operation !== 'create' || !data) return data
  if (req.context?.skipConsentEnforcement) return data
  if (isSuperAdmin(req.user)) return data

  // Allow bootstrap of the very first user.
  const existing = await req.payload.count({ collection: 'users' })
  if (existing.totalDocs === 0) return data

  const current = await req.payload.findGlobal({ slug: 'policy-versions' })
  const consents = data.consents || {}
  const minor = isUnder18(data.dateOfBirth)

  const missing: string[] = []
  if (consents.termsVersion !== current.termsVersion) missing.push('Terms of Use')
  if (consents.privacyVersion !== current.privacyVersion) missing.push('Privacy Policy')
  if (!consents.acceptedAt) missing.push('acceptance timestamp')

  if (minor) {
    if (consents.guardianConsentVersion !== current.guardianConsentVersion)
      missing.push('Guardian Consent notice')
    const g = data.guardian || {}
    if (!g.name) missing.push('guardian name')
    if (!g.email) missing.push('guardian email')
  }

  if (missing.length > 0) {
    throw new APIError(
      `Account cannot be created without a valid consent sign-off. Missing or outdated: ${missing.join(', ')}.`,
      400,
    )
  }

  return data
}

/**
 * Guardian/minor flow: a minor account starts `pending` with an unconfirmed
 * guardian and a confirmation token. It only activates after the guardian
 * confirms their email (see /guardian/confirm). Adults are unaffected.
 */
export const guardianFlow: CollectionBeforeChangeHook = ({ data, req, operation }) => {
  if (operation !== 'create' || !data) return data
  if (req.context?.skipConsentEnforcement) return data // seed/bootstrap stays active

  if (isUnder18(data.dateOfBirth)) {
    data.status = 'pending'
    data.guardian = {
      ...(data.guardian || {}),
      confirmed: false,
      confirmationToken: crypto.randomBytes(24).toString('hex'),
    }
  }
  return data
}

/** Send the guardian confirmation email after a pending minor is created. */
export const sendGuardianConfirmation: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') return doc
  const guardian = doc?.guardian
  if (!doc?.isMinor || doc?.status !== 'pending' || !guardian?.confirmationToken || !guardian?.email) {
    return doc
  }
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const link = `${base}/guardian/confirm?token=${guardian.confirmationToken}`
  try {
    await req.payload.sendEmail({
      to: guardian.email,
      subject: 'Confirm the CMBA Connect account for your athlete',
      text:
        `You are receiving this because a CMBA Connect account was created for an athlete under 18 ` +
        `with you as the guardian.\n\n` +
        `Confirm the account to activate it: ${link}\n\n` +
        `If you did not expect this, you can ignore this email and the account will stay inactive.\n\n` +
        `CMBA Connect`,
      headers: { [CATEGORY_HEADER]: 'guardian' },
    })
    req.payload.logger.info(`Guardian confirmation email queued for user ${doc.id}`)
  } catch (err) {
    req.payload.logger.error(`Failed to send guardian confirmation for user ${doc.id}: ${String(err)}`)
  }
  return doc
}

/**
 * Append a ConsentRecords entry whenever consent is accepted/changed, keeping a
 * permanent history (initial on create; reconsent when the version changes).
 */
export const logConsentRecord: CollectionAfterChangeHook = async ({ doc, previousDoc, req, operation }) => {
  const consents = doc?.consents
  if (!consents?.acceptedAt) return doc

  const changed =
    operation === 'create' ||
    previousDoc?.consents?.acceptedAt !== consents.acceptedAt ||
    previousDoc?.consents?.termsVersion !== consents.termsVersion ||
    previousDoc?.consents?.privacyVersion !== consents.privacyVersion ||
    previousDoc?.consents?.guardianConsentVersion !== consents.guardianConsentVersion

  if (!changed) return doc

  try {
    await req.payload.create({
      collection: 'consent-records',
      overrideAccess: true,
      // Pass req so this insert joins the parent transaction and can see the
      // not-yet-committed user (otherwise the user_id FK fails).
      req,
      data: {
        user: doc.id,
        kind: operation === 'create' ? 'initial' : 'reconsent',
        isMinor: Boolean(doc.isMinor),
        termsVersion: consents.termsVersion,
        privacyVersion: consents.privacyVersion,
        guardianConsentVersion: consents.guardianConsentVersion,
        marketingOptIn: Boolean(consents.marketingOptIn),
        photoOptIn: Boolean(consents.photoOptIn),
        recognitionSurfacing: Boolean(consents.recognitionSurfacing),
        progressSharing: Boolean(consents.progressSharing),
        appearOnLeaderboard: Boolean(consents.appearOnLeaderboard),
        acceptedAt: consents.acceptedAt,
        acceptedIp: consents.acceptedIp,
      },
    })
  } catch (err) {
    req.payload.logger.error(`Failed to write consent record for user ${doc.id}: ${String(err)}`)
  }
  return doc
}
