import type { Access, CollectionConfig } from 'payload'

import { EMAIL_CATEGORIES } from '@/lib/email/meta'
import { isSuperAdmin } from '@/access/index'

/*
 * EmailSendLog (P0.2) - an append-only health record of every transactional email
 * the platform tries to send. Written by the tracked email adapter via
 * overrideAccess (see src/lib/email/adapter.ts), so all direct writes are denied.
 * Super admins can READ it in the admin panel to see delivery health and recent
 * failures; the /api/v1/admin/email-health endpoint gives the same data as rollups.
 *
 * PII free by design: no raw recipient address is stored, only a salted hash and
 * the bare domain. Subjects are already PII free across the app. Retention is about
 * 90 days, swept by the ttl-sweep cron.
 *
 * Copy rule: no em or en dashes anywhere.
 */
const denyAll: Access = () => false

export const EMAIL_LOG_RETENTION_DAYS = 90

export const EmailSendLog: CollectionConfig = {
  slug: 'email-send-log',
  access: { read: ({ req: { user } }) => isSuperAdmin(user), create: denyAll, update: denyAll, delete: denyAll },
  admin: {
    useAsTitle: 'subject',
    group: 'System',
    defaultColumns: ['sentAt', 'category', 'status', 'transport', 'recipientDomain', 'errorCode'],
    description: 'Delivery health for transactional email. Read only, PII free, append only.',
  },
  fields: [
    {
      name: 'category',
      type: 'select',
      required: true,
      index: true,
      options: EMAIL_CATEGORIES.map((c) => ({ label: c, value: c })),
    },
    { name: 'subject', type: 'text', admin: { description: 'PII free by design.' } },
    { name: 'recipientHash', type: 'text', index: true, admin: { description: 'Salted hash of the recipient. Not reversible.' } },
    { name: 'recipientDomain', type: 'text', index: true },
    { name: 'recipientCount', type: 'number', defaultValue: 1 },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'transport',
      type: 'select',
      required: true,
      options: [
        { label: 'AWS SES', value: 'ses' },
        { label: 'Dev jsonTransport (not delivered)', value: 'json' },
      ],
    },
    { name: 'errorCode', type: 'text' },
    { name: 'errorMessage', type: 'text' },
    { name: 'sentAt', type: 'date', required: true, index: true },
  ],
}
