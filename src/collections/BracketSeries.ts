import type { CollectionConfig } from 'payload'

import { superAdminFieldOnly, superAdminOnly } from '../access/index'

/*
 * BracketSeries - one node (matchup) in a playoff bracket. The advancement service
 * sets the winner when the linked game finals and wires the winner into the next
 * round via feedsInto. Bracket structure is public information (no PII), so reads
 * are public; only super admins write, and winner is set by the service.
 */
export const BracketSeries: CollectionConfig = {
  slug: 'bracket-series',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['bracket', 'round', 'slot', 'homeTeam', 'awayTeam', 'winner'],
    group: 'Competition',
    description: 'A matchup in a playoff bracket.',
  },
  fields: [
    { name: 'bracket', type: 'relationship', relationTo: 'playoff-brackets', required: true, index: true },
    { name: 'round', type: 'number', required: true },
    { name: 'slot', type: 'number', required: true },
    { name: 'homeSeed', type: 'number' },
    { name: 'awaySeed', type: 'number' },
    { name: 'homeTeam', type: 'relationship', relationTo: 'teams' },
    { name: 'awayTeam', type: 'relationship', relationTo: 'teams' },
    { name: 'game', type: 'relationship', relationTo: 'games', index: true },
    { name: 'feedsInto', type: 'relationship', relationTo: 'bracket-series' },
    { name: 'feedsIntoSlot', type: 'select', options: [{ label: 'Home', value: 'home' }, { label: 'Away', value: 'away' }] },
    { name: 'isLosersBracket', type: 'checkbox', defaultValue: false },
    { name: 'winner', type: 'relationship', relationTo: 'teams', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    {
      /*
       * How the winner got here. The bracket advances itself when a game finals
       * or forfeits; a person can override that for a correction, and the screen
       * has to be able to say which of the two happened.
       */
      name: 'winnerSetBy',
      type: 'select',
      options: [
        { label: 'Advanced automatically from the result', value: 'auto' },
        { label: 'Set by an administrator', value: 'manual' },
      ],
      access: { update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Whether the result advanced this team or an administrator did.' },
    },
  ],
}
