import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import { ownerOrSuperAdmin, superAdminFieldOnly } from '../access/index'

/*
 * BadgeAwards - SCAFFOLD (model only this stage; the award engine lands in F1b).
 *
 * The immutable "a badge that counts" ledger: one row per (user, badge) earned,
 * carrying the verified-vs-self-reported trust stamp. Rows are written ONLY by
 * the award engine via payload.create({ overrideAccess: true, req }); no user or
 * admin creates one through the API. Append-only is enforced the AuditLog way:
 *   1. access create/update/delete are denied (engine writes via overrideAccess);
 *   2. beforeChange throws on update;
 *   3. beforeDelete throws.
 * overrideAccess bypasses access but NOT hooks, so 2 and 3 hold for the engine
 * too - it may insert but never mutate an award.
 *
 * Minor-safety: `isMinor` is captured at award time (re-derived server-side by
 * the engine, never trusted from a client). Never displayed publicly; surfaced
 * only on the owner's own profile/digest and to the owner's verified coach/admin,
 * and any non-owner surface uses privacySafeName.
 */
export const BadgeAwards: CollectionConfig = {
  slug: 'badge-awards',
  access: {
    read: ownerOrSuperAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'badge', 'awardedVia', 'verified', 'awardedAt'],
    group: 'Engagement',
    description: 'Immutable badge-award ledger. Written only by the award engine; cannot be edited or deleted.',
  },
  hooks: {
    beforeChange: [
      ({ operation }) => {
        if (operation === 'update') {
          throw new APIError('Badge awards are append only and cannot be edited.', 403)
        }
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError('Badge awards are append only and cannot be deleted.', 403)
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'badge', type: 'relationship', relationTo: 'badges', required: true, index: true },
    {
      name: 'awardedVia',
      type: 'select',
      required: true,
      defaultValue: 'auto',
      options: [
        { label: 'Automatic', value: 'auto' },
        { label: 'Coach verified', value: 'coach_verified' },
        { label: 'Admin manual', value: 'admin_manual' },
      ],
    },
    {
      name: 'sourceEvent',
      type: 'relationship',
      relationTo: 'xp-events',
      admin: { description: 'The triggering XP event for an automatic award.' },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'True only for coach/admin-stamped awards or badges that do not require verification. Engine-set.' },
    },
    {
      name: 'awardedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Admin/coach who granted a manual or verified award. Null for automatic.' },
    },
    {
      name: 'isMinor',
      type: 'checkbox',
      defaultValue: false,
      admin: { readOnly: true, description: 'Captured at award time (re-derived server-side). Gates privacy-safe display.' },
    },
    { name: 'awardedAt', type: 'date', required: true, admin: { readOnly: true } },
  ],
  indexes: [{ fields: ['user', 'badge'], unique: true }],
}
