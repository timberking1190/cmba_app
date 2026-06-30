import { APIError } from 'payload'
import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin } from '../access/index'
import { auditHmac } from '../lib/audit/integrity'

/*
 * AuditLog - the append-only system of record for privileged actions (game
 * finalize, membership verify, official assign, import commit and undo, admin
 * override). Append-only is enforced THREE ways so history can never be rewritten,
 * even by a super admin or by a server call using overrideAccess:
 *   1. access create/update/delete are all denied at the access layer (rows are
 *      written only via overrideAccess inside an already-authorized service).
 *   2. beforeChange throws on any update operation.
 *   3. beforeDelete throws unconditionally.
 * overrideAccess bypasses the access functions but NOT the hooks, so 2 and 3 hold
 * even for a server call.
 */
const denyAll: Access = () => false

export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  access: {
    read: ({ req: { user } }) => isAnyAdmin(user),
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'entity', 'entityId', 'actorEmail', 'at'],
    group: 'Compliance',
    description: 'Append-only record of privileged actions. Cannot be edited or deleted.',
  },
  hooks: {
    beforeChange: [
      ({ operation, data }) => {
        if (operation === 'update') {
          throw new APIError('The audit log is append only and cannot be edited.', 403)
        }
        // Stamp the tamper-evident HMAC over the integrity-protected fields.
        if (operation === 'create' && data) data.integrity = auditHmac(data)
        return data
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError('The audit log is append only and cannot be deleted.', 403)
      },
    ],
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', index: true, admin: { description: 'Acting user. Null for system or cron actions.' } },
    { name: 'actorEmail', type: 'text', admin: { description: 'Snapshot of the actor email so the record survives user deletion.' } },
    { name: 'action', type: 'text', required: true, admin: { description: 'For example game.finalize, membership.verify, official.assign, import.commit.' } },
    { name: 'entity', type: 'text', required: true },
    { name: 'entityId', type: 'text', required: true, index: true },
    { name: 'before', type: 'json' },
    { name: 'after', type: 'json' },
    { name: 'reason', type: 'text' },
    { name: 'at', type: 'date', required: true, index: true },
    {
      name: 'integrity',
      type: 'text',
      access: { update: () => false },
      admin: { readOnly: true, description: 'Tamper-evident HMAC of this entry. System-set.' },
    },
  ],
}
