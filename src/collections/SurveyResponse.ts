import type { Access, CollectionConfig } from 'payload'

import { anyAdminOnly } from '@/access/index'

/*
 * SurveyResponse (P2.9) - one member's answers to a SeasonSurvey. Written only by the
 * respond API via overrideAccess (after auth + one-per-member dedupe), so all direct
 * writes are denied. Raw responses are admin-read-only; members only ever see the
 * aggregate (computed in src/lib/survey/results.ts), so individuals are never exposed.
 *
 * Copy rule: no em or en dashes anywhere.
 */
const denyAll: Access = () => false

export const SurveyResponse: CollectionConfig = {
  slug: 'survey-responses',
  access: { read: anyAdminOnly, create: denyAll, update: denyAll, delete: denyAll },
  admin: {
    useAsTitle: 'id',
    group: 'Engagement',
    defaultColumns: ['survey', 'respondent', 'submittedAt'],
    description: 'Individual survey answers. Admin-read only; members see aggregate results.',
  },
  fields: [
    { name: 'survey', type: 'relationship', relationTo: 'season-surveys', required: true, index: true },
    { name: 'respondent', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'answers',
      type: 'array',
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text' },
      ],
    },
    { name: 'submittedAt', type: 'date', required: true },
  ],
}
