import type { GlobalConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * SiteSettings — site chrome + the Privacy Officer contact (PIPEDA
 * accountability). Public read (footer/contact surface these); super-admin write.
 * Phase 3 extends this with logo, socials, and default SEO for the CMS.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
    update: superAdminOnly,
  },
  admin: { group: 'Settings' },
  fields: [
    {
      name: 'privacyOfficer',
      type: 'group',
      label: 'Privacy Officer',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email', defaultValue: 'league@cmba.ab.ca' },
        { name: 'phone', type: 'text', defaultValue: '(403) 804-3396' },
      ],
    },
    {
      name: 'schedulingAdmin',
      type: 'group',
      label: 'Scheduling admin',
      admin: {
        description:
          'Where contested-game and review escalations are sent. Update is super admin only, so a club admin cannot repoint it.',
      },
      fields: [
        { name: 'email', type: 'email', admin: { description: 'Recipient for contested-game and review escalations.' } },
        { name: 'name', type: 'text' },
      ],
    },
  ],
}
