import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly } from '../access/index'
import { checkRateLimit } from '../lib/rateLimit'
import { CATEGORY_HEADER } from '../lib/email/meta'
import {
  getClientIp,
  hashIp,
  honeypotTripped,
  isTurnstileEnabled,
  verifyTurnstile,
  TURNSTILE_HEADER,
} from '../lib/security/botChallenge'

const TEN_MINUTES = 10 * 60 * 1000

/*
 * GameReports — native intake for game/incident reports (ejections, conduct
 * concerns, compliments). Replaces the external cmba.ab.ca form. Anyone may
 * submit; only admins can read (super admins all, club admins their club's
 * games are not modeled, so club admins see all reports for triage). On submit,
 * a no-PII notification email points reviewers to the admin panel.
 */
export const GameReports: CollectionConfig = {
  slug: 'game-reports',
  access: {
    create: () => true, // public submissions
    read: ({ req: { user } }) => isAnyAdmin(user),
    update: ({ req: { user } }) => isSuperAdmin(user),
    delete: ({ req: { user } }) => isSuperAdmin(user),
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['reportType', 'gameDate', 'division', 'status', 'createdAt'],
    group: 'People',
    description: 'Game / incident reports submitted from /game-report.',
  },
  hooks: {
    beforeValidate: [
      /*
       * Stage C / S0 — abuse defenses on the only public, unauthenticated form.
       * Admin-panel submissions (req.user present) skip the challenge. Public
       * submissions run: honeypot -> per-IP + global rate limit -> Turnstile
       * (when configured). All rejections are safe, generic, and non-leaking.
       */
      async ({ req, operation }) => {
        if (operation !== 'create' || req.user) return
        const headers = req.headers

        if (honeypotTripped(headers)) {
          throw new APIError('Submission rejected.', 400, undefined, true)
        }

        const ip = getClientIp(headers)
        const subject = hashIp(ip)
        const perIp = await checkRateLimit(req.payload, {
          bucket: 'game-report:ip',
          subject,
          limit: 5,
          windowMs: TEN_MINUTES,
        })
        const global = await checkRateLimit(req.payload, {
          bucket: 'game-report:global',
          subject: 'all',
          limit: 60,
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
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        try {
          await req.payload.sendEmail({
            to: process.env.EMAIL_FROM || 'league@cmba.ab.ca',
            subject: `New game report submitted (${doc.reportType})`,
            // No PII in the body. Reviewers open the admin panel to see details.
            text: `A new game report was submitted. Review it in the admin panel:\n${base}/admin/collections/game-reports/${doc.id}`,
            headers: { [CATEGORY_HEADER]: 'score_report' },
          })
        } catch (err) {
          req.payload.logger.error(`Game report notification failed: ${String(err)}`)
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'reportType',
      type: 'select',
      required: true,
      options: [
        { label: 'Incident', value: 'incident' },
        { label: 'Ejection', value: 'ejection' },
        { label: 'Concern', value: 'concern' },
        { label: 'Compliment', value: 'compliment' },
      ],
    },
    { name: 'reporterName', type: 'text', required: true },
    { name: 'reporterEmail', type: 'email', required: true },
    { name: 'role', type: 'text', admin: { description: 'Coach, parent, official, etc.' } },
    { name: 'gameDate', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'division', type: 'text' },
    { name: 'homeTeam', type: 'text' },
    { name: 'awayTeam', type: 'text' },
    { name: 'location', type: 'text' },
    { name: 'description', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Closed', value: 'closed' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Triage status (admin only).' },
    },
  ],
}
