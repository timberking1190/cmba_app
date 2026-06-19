import type { CollectionConfig } from 'payload'

import { publishedOrAdmin, superAdminOnly } from '../access/index'
import { pageBlocks } from '../blocks/config'

const previewUrl = (data: { slug?: string | null }) => {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const slug = data?.slug && data.slug !== 'home' ? data.slug : ''
  return `${base}/${slug}`
}

/*
 * Pages — the website CMS. Block-based layout, drafts + version history +
 * autosave, SEO, and Live Preview. Published pages render at /<slug> via the
 * catch-all route + RenderBlocks. Public reads see published only; admins see
 * drafts. Super-admin write.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    read: publishedOrAdmin,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    group: 'Content',
    livePreview: { url: ({ data }) => previewUrl(data) },
    preview: (doc) => previewUrl(doc as { slug?: string }),
  },
  versions: {
    maxPerDoc: 50,
    drafts: { autosave: { interval: 375 } },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL path, e.g. "about" → /about. Use "home" for the homepage slot.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              minRows: 1,
              blocks: pageBlocks,
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'seo',
              type: 'group',
              fields: [
                { name: 'metaTitle', type: 'text' },
                { name: 'metaDescription', type: 'textarea' },
                { name: 'ogImage', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
