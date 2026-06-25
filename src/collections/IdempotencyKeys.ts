import type { Access, CollectionConfig } from 'payload'

/*
 * IdempotencyKeys - the dedupe store behind the Idempotency-Key header so a score
 * report or confirm submitted from a weak gym connection cannot be double counted
 * on retry. No caller can ever read or write these directly; the withIdempotency
 * helper reads and writes them via overrideAccess. The (key, scope) pair is unique
 * so a concurrent race inserts exactly once and the loser replays the winner's
 * stored response. A store outage fails closed (the helper returns 503).
 */
const denyAll: Access = () => false

export const IdempotencyKeys: CollectionConfig = {
  slug: 'idempotency-keys',
  access: {
    read: denyAll,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    useAsTitle: 'key',
    group: 'System',
    hidden: () => true,
    description: 'System dedupe store for the Idempotency-Key header. Not user editable.',
  },
  fields: [
    { name: 'key', type: 'text', required: true, index: true },
    { name: 'scope', type: 'text', required: true, index: true, admin: { description: 'For example report:game:123.' } },
    { name: 'userId', type: 'text', index: true, admin: { description: 'Same key from a different user is rejected 403.' } },
    { name: 'requestHash', type: 'text', admin: { description: 'Hash of the stable logical fields, not the multipart envelope.' } },
    { name: 'statusCode', type: 'number' },
    { name: 'responseBody', type: 'json' },
    { name: 'createdAt', type: 'date', index: true, admin: { description: 'Swept after 24 hours by the TTL cron.' } },
  ],
  indexes: [{ fields: ['key', 'scope'], unique: true }],
}
