import type { GlobalConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * FooterNav — editable footer link columns. The Footer reads this when present
 * and falls back to its built-in defaults otherwise. Public read.
 */
export const FooterNav: GlobalConfig = {
  slug: 'footer-nav',
  access: { read: () => true, update: superAdminOnly },
  admin: { group: 'Navigation' },
  fields: [
    {
      name: 'sections',
      type: 'array',
      labels: { singular: 'Column', plural: 'Columns' },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'href', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
}
