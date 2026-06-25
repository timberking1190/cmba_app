import type { Access, CollectionConfig } from 'payload'

/*
 * RateLimitHits - a durable, serverless-safe rate limiter. In-memory counters do
 * not work on ephemeral serverless instances, so each rate-limited action writes a
 * hit row (bucket, subject, at) via overrideAccess and the limiter counts rows in
 * the window. No caller reads or writes these directly. The TTL sweep cron removes
 * old rows. Wraps report, confirm, import, membership self-claim, and ICS.
 */
const denyAll: Access = () => false

export const RateLimitHits: CollectionConfig = {
  slug: 'rate-limit-hits',
  access: {
    read: denyAll,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    useAsTitle: 'id',
    group: 'System',
    hidden: () => true,
    description: 'System rate-limit hit log. Not user editable.',
  },
  fields: [
    { name: 'bucket', type: 'text', required: true, index: true, admin: { description: 'For example report, confirm, import.' } },
    { name: 'subject', type: 'text', required: true, index: true, admin: { description: 'The actor being limited, for example user id or ip.' } },
    { name: 'at', type: 'date', required: true, index: true },
  ],
  indexes: [{ fields: ['bucket', 'subject', 'at'] }],
}
