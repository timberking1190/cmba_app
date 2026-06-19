import type { CollectionConfig } from 'payload'

import { authenticated, isAnyAdmin, superAdminOnly } from '../access/index'

/*
 * Media — PUBLIC uploads (profile photos, page images).
 *
 * Backed by the public Supabase Storage bucket (ca-central-1). Files are served
 * directly from the bucket's public URL (Payload access control disabled for
 * this collection in the storage plugin), so `read` is public by design.
 * Sensitive documents do NOT live here — see CertificateFiles (private bucket).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true, // public images
    create: authenticated, // any signed-in user (e.g. profile photo upload)
    update: ({ req: { user } }) => isAnyAdmin(user),
    delete: superAdminOnly,
  },
  admin: {
    group: 'Content',
  },
  upload: {
    mimeTypes: ['image/*'],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: undefined },
      { name: 'hero', width: 1600, height: undefined },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Alt text for accessibility. Describe the image.' },
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
}
