import type { CollectionConfig } from 'payload'

import { publishedOrAdmin, superAdminOnly } from '../access/index'

/*
 * Announcements — short, dated notices surfaced live (e.g. the homepage strip).
 * Drafts/published; public sees published only. Super-admin write.
 */
export const Announcements: CollectionConfig = {
  slug: 'announcements',
  access: {
    read: publishedOrAdmin,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tag', 'pinned', 'publishedAt', 'expiresAt'],
    group: 'Content',
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'tag', type: 'text', admin: { description: 'e.g. Registration, Schedule, Safety.' } },
    { name: 'link', type: 'text', admin: { description: 'Optional URL the announcement links to.' } },
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Hidden from the site after this date.' },
    },
  ],
}
