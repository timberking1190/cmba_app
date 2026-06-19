import type { Access, CollectionConfig } from 'payload'

import { authenticated, isSuperAdmin, superAdminFieldOnly } from '../access/index'
import { addMonths, computeCertStatus } from '../lib/certStatus'

/*
 * Certifications — per-user certification records.
 *
 * - The actual file lives in the PRIVATE CertificateFiles collection (owner/admin
 *   only). This record holds metadata + verification + computed status.
 * - `status` is auto-computed (pending-verification | valid | expiring | expired)
 *   by the beforeChange hook from verification + expiry. `expiryDate` is
 *   auto-filled from the type's validityMonths when left blank.
 * - Verification fields (`verifiedBy`/`verifiedAt`) are admin-only.
 * - Access: a participant CRUDs only their OWN certifications; super admins all.
 */
const ownerOrSuperAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { user: { equals: user.id } }
}

export const Certifications: CollectionConfig = {
  slug: 'certifications',
  access: {
    read: ownerOrSuperAdmin,
    create: authenticated,
    update: ownerOrSuperAdmin,
    delete: ownerOrSuperAdmin,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'type', 'status', 'expiryDate', 'verifiedAt'],
    group: 'People',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next = { ...data }

        // A participant can only ever own their own certifications.
        if (operation === 'create' && req.user && !isSuperAdmin(req.user)) {
          next.user = req.user.id
        }

        // Auto-fill expiry from the certification type's validityMonths.
        if (!next.expiryDate && next.issueDate && next.type) {
          const typeId = typeof next.type === 'object' ? next.type.id : next.type
          try {
            const type = await req.payload.findByID({
              collection: 'certification-types',
              id: typeId,
              depth: 0,
            })
            const computed = addMonths(next.issueDate, type?.validityMonths)
            if (computed) next.expiryDate = computed
          } catch {
            // type not found / not provided — leave expiry as-is
          }
        }

        // Stamp verifiedAt when an admin sets verifiedBy without a date.
        if (next.verifiedBy && !next.verifiedAt) {
          next.verifiedAt = new Date().toISOString()
        }

        // Derive status (cached for querying; the Phase 2 cron refreshes it).
        next.status = computeCertStatus({
          verifiedAt: next.verifiedAt,
          expiryDate: next.expiryDate,
        })

        return next
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
    {
      name: 'type',
      type: 'relationship',
      relationTo: 'certification-types',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending verification', value: 'pending-verification' },
        { label: 'Valid', value: 'valid' },
        { label: 'Expiring', value: 'expiring' },
        { label: 'Expired', value: 'expired' },
      ],
      defaultValue: 'pending-verification',
      admin: {
        readOnly: true,
        description: 'Auto-computed from verification + expiry.',
      },
    },
    { name: 'issueDate', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'expiryDate',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Auto-filled from the type validity if left blank.',
      },
    },
    {
      name: 'certificateFile',
      type: 'upload',
      relationTo: 'certificate-files',
      admin: { description: 'Private file (owner + admin only). Never public.' },
    },
    { name: 'issuingBody', type: 'text' },
    { name: 'credentialId', type: 'text' },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Admin who verified this certification. Admin-only.' },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Set when an admin verifies. Admin-only.' },
    },
    { name: 'notes', type: 'textarea' },
  ],
}
