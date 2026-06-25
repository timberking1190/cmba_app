import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin } from '../access/index'

/*
 * StandingsCache - a DERIVED cache of computed standings, one row per division.
 * It is NEVER the source of truth: the standings service recomputes it from final
 * and forfeit games and writes it via overrideAccess. Users can never write it.
 * Reads are public, but only for divisions whose season is active, in playoffs, or
 * complete (the seasonStatus is denormalized onto each row so this gate is a plain
 * Where; Payload access cannot join to the parent season). The rows json holds the
 * StandingRow[] already in final sorted order, each with a server-assigned rank.
 */
const readStandingsCache: Access = ({ req: { user } }) => {
  if (isAnyAdmin(user)) return true
  return { seasonStatus: { in: ['active', 'playoffs', 'complete'] } }
}

const denyAll: Access = () => false

export const StandingsCache: CollectionConfig = {
  slug: 'standings-cache',
  access: {
    read: readStandingsCache,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['division', 'computedAt', 'seasonStatus'],
    group: 'Competition',
    description: 'Derived standings cache. Recomputed by the standings service; never edited by hand.',
  },
  fields: [
    { name: 'division', type: 'relationship', relationTo: 'divisions', required: true, unique: true, index: true },
    { name: 'rows', type: 'json', admin: { description: 'StandingRow[] in final sorted order, each with a server-assigned rank.' } },
    { name: 'inputsHash', type: 'text', admin: { description: 'Hash of the canonical-ordered final games plus config plus seed. Skips the upsert when unchanged.' } },
    { name: 'computedAt', type: 'date', admin: { readOnly: true } },
    { name: 'legend', type: 'text', admin: { description: 'Snapshot of the standings legend shown to families.' } },
    { name: 'seasonStatus', type: 'text', index: true, admin: { readOnly: true, description: 'Denormalized parent season status for the public read gate.' } },
  ],
}
