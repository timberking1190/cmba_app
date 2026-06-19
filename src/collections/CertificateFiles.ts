import type { Access, CollectionConfig } from 'payload'

import { authenticated, isSuperAdmin, superAdminFieldOnly } from '../access/index'

/*
 * CertificateFiles — PRIVATE uploads (certification PDFs / images).
 *
 * Backed by the PRIVATE Supabase Storage bucket (ca-central-1). Payload access
 * control is KEPT ON for this collection (the storage plugin does NOT disable
 * it), so every download routes through Payload's access-checked file endpoint
 * and is gated by `read` below — the bucket is never public.
 *
 * Privacy posture (minors' documents): a file is readable only by its owner and
 * super admins. Club admins see derived compliance status, never the raw file.
 */
const readOwnerOrSuperAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { owner: { equals: user.id } }
}

export const CertificateFiles: CollectionConfig = {
  slug: 'certificate-files',
  access: {
    read: readOwnerOrSuperAdmin,
    create: authenticated,
    update: readOwnerOrSuperAdmin,
    delete: readOwnerOrSuperAdmin,
  },
  admin: {
    group: 'People',
    description: 'Private certificate files. Downloads are access-controlled; never public.',
    useAsTitle: 'filename',
    hidden: ({ user }) => !isSuperAdmin(user),
  },
  upload: {
    // Private bucket only — no local copy on the serverless filesystem.
    disableLocalStorage: true,
    mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  },
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        const user = req.user
        // Non-admins can only ever own their own files (no reassignment).
        if (user && !isSuperAdmin(user)) {
          return { ...data, owner: user.id }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      // Ownership is set by the beforeChange hook for non-admins; only super
      // admins may explicitly set/move ownership.
      access: {
        update: superAdminFieldOnly,
      },
      admin: {
        description: 'The user this certificate file belongs to.',
      },
    },
  ],
}
