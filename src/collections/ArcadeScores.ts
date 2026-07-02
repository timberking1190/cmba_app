import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly } from '../access/index'
import { checkName, formatArcadeName, MAX_NAME_LEN } from '../lib/arcade/nameFilter'
import { checkRateLimit } from '../lib/rateLimit'
import {
  getClientIp,
  hashIp,
  honeypotTripped,
  isTurnstileEnabled,
  verifyTurnstile,
  TURNSTILE_HEADER,
} from '../lib/security/botChallenge'

const TEN_MINUTES = 10 * 60 * 1000
export const MIN_SCORE = 1
export const MAX_SCORE = 999 // a believable arcade streak ceiling; blocks absurd injected values
const AUTO_HIDE_REPORTS = 5 // community reports that auto-hide an entry pending admin review

/*
 * ArcadeScores - shared high-score table for the home-page retro basketball game.
 * Anyone may submit and read the (non-hidden) top scores; only admins can hide or
 * delete. Scores are client-reported (the game runs in the browser), so this is a
 * fun leaderboard, not an anti-cheat system: a score is clamped to a believable
 * ceiling and guarded by Turnstile + rate limits, and abuse is handled by public
 * reporting and admin moderation, not by trusting the client.
 *
 * Names are the real risk on a kids' feature. checkName() is the AUTHORITATIVE
 * filter here on the server; the client runs the same function only for instant
 * feedback. No filter is perfect, which is why reporting and moderation exist.
 */
export const ArcadeScores: CollectionConfig = {
  slug: 'arcade-scores',
  access: {
    create: () => true, // public submissions, gated in beforeValidate
    // Public sees only non-hidden entries; admins see everything.
    read: ({ req: { user } }) => (isAnyAdmin(user) ? true : { hidden: { not_equals: true } }),
    update: ({ req: { user } }) => isSuperAdmin(user),
    delete: ({ req: { user } }) => isSuperAdmin(user),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'score', 'game', 'reports', 'hidden', 'createdAt'],
    group: 'Engagement',
    description: 'Public arcade high scores from the home-page game. Hide or delete abusive entries.',
  },
  hooks: {
    beforeValidate: [
      /*
       * Abuse gates for the only public, unauthenticated write here. Admin-panel
       * writes (req.user present) skip them. Order: honeypot -> per-IP + global
       * rate limit -> Turnstile (when configured) -> authoritative name filter.
       * All rejections are safe, generic, and non-leaking.
       */
      async ({ req, data, operation }) => {
        if (operation !== 'create' || req.user) return
        const headers = req.headers

        if (honeypotTripped(headers)) {
          throw new APIError('Submission rejected.', 400, undefined, true)
        }

        const ip = getClientIp(headers)
        const subject = hashIp(ip)
        const perIp = await checkRateLimit(req.payload, {
          bucket: 'arcade-score:ip',
          subject,
          limit: 15,
          windowMs: TEN_MINUTES,
        })
        const global = await checkRateLimit(req.payload, {
          bucket: 'arcade-score:global',
          subject: 'all',
          limit: 200,
          windowMs: TEN_MINUTES,
        })
        if (!perIp.ok || !global.ok) {
          throw new APIError(
            'Too many submissions. Please wait a few minutes and try again.',
            429,
            undefined,
            true,
          )
        }

        if (isTurnstileEnabled()) {
          const ok = await verifyTurnstile(headers.get(TURNSTILE_HEADER), ip)
          if (!ok) {
            throw new APIError('Bot challenge failed. Please try again.', 400, undefined, true)
          }
        }

        // Authoritative name filter. The friendly message is safe to show.
        const nameCheck = checkName(String(data?.name ?? ''))
        if (!nameCheck.ok) {
          throw new APIError(nameCheck.message || 'Pick another name.', 400, undefined, true)
        }
      },
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        const next = { ...data }
        if (operation === 'create') {
          // Server owns these; never trust the client for identity/moderation fields.
          next.name = formatArcadeName(String(data.name ?? ''), MAX_NAME_LEN)
          next.game = typeof data.game === 'string' && data.game ? data.game : 'freethrow'
          next.score = clampScore(data.score)
          next.submitterFingerprint = req.user ? 'admin' : hashIp(getClientIp(req.headers))
          next.reports = 0
          next.hidden = false
        }
        return next
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: MAX_NAME_LEN },
    { name: 'score', type: 'number', required: true, min: MIN_SCORE, max: MAX_SCORE },
    {
      name: 'game',
      type: 'text',
      defaultValue: 'freethrow',
      index: true,
      admin: { description: 'Game slug, for future games on the same table.' },
    },
    {
      // Hashed IP for rate limiting and moderation only. Never shown publicly.
      name: 'submitterFingerprint',
      type: 'text',
      access: { read: superAdminFieldOnly, create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Hashed submitter fingerprint (moderation only).' },
    },
    {
      name: 'reports',
      type: 'number',
      defaultValue: 0,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Community report count.' },
    },
    {
      name: 'hidden',
      type: 'checkbox',
      defaultValue: false,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Hidden from the public table (moderation). Delete to remove entirely.' },
    },
  ],
  indexes: [{ fields: ['game', 'score'] }],
}

function clampScore(value: unknown): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return MIN_SCORE
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, n))
}

export { AUTO_HIDE_REPORTS }
