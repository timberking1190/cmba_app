import type { GlobalConfig } from 'payload'

import { ROLES, authenticated, superAdminOnly } from '../access/index'

/*
 * MemberCardConfig (Member Cards) — runtime verifier/scanner flags (spec app_config).
 * A Payload global fits this singleton config better than a table. Any signed-in user
 * may read (the scanner reads its min-version / serial-lookup switch); super-admin
 * writes. Toggling `serialLookupEnabled` off disables the manual serial fallback
 * (D17) league-wide without a deploy.
 */
export const MemberCardConfig: GlobalConfig = {
  slug: 'member-card-config',
  access: {
    read: authenticated,
    update: superAdminOnly,
  },
  admin: { group: 'Member Cards' },
  fields: [
    { name: 'verifierMinVersion', type: 'text', admin: { description: 'Minimum scanner app version; older clients are asked to refresh.' } },
    { name: 'serialLookupEnabled', type: 'checkbox', defaultValue: true, admin: { description: 'Master switch for the manual serial-lookup fallback (D17).' } },
    { name: 'currentSeason', type: 'text', admin: { description: 'Season label stamped on newly issued passes, e.g. 2026-27.' } },
    { name: 'anomalyAlertsEnabled', type: 'checkbox', defaultValue: true, admin: { description: 'Flag-and-alert on odd scan patterns (D6). Never auto-blocks.' } },
    {
      // D20: only these roles get a verification QR + are gated by the scan. Kept
      // explicit (not inherited from certification-types.requiredForRoles) so a
      // credential shared with officials for org compliance does not make officials
      // scannable. Default coach-only; edit here to expand — no deploy needed (D14).
      name: 'scannableRoles',
      type: 'select',
      hasMany: true,
      options: ROLES,
      defaultValue: ['coach'],
      admin: { description: 'Roles whose card is scannable (carries a QR, gated by credentials). Default: coach only (D20).' },
    },
  ],
}
