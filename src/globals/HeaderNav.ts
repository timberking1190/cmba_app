import type { GlobalConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * HeaderNav — editable primary nav. Stored for admin editing; the Header keeps
 * its icon-rich built-in nav as the rendered default (icons can't be stored),
 * so this is available for future/secondary nav surfaces. Public read.
 */
export const HeaderNav: GlobalConfig = {
  slug: 'header-nav',
  access: { read: () => true, update: superAdminOnly },
  admin: { group: 'Navigation' },
  fields: [
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
        {
          name: 'children',
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
