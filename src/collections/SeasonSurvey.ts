import type { CollectionConfig } from 'payload'

import { anyAdminOnly, authenticated } from '@/access/index'

/*
 * SeasonSurvey (P2.9) - a short season feedback survey. Admins author it and open it;
 * signed-in members answer it once; aggregate results can be published back to
 * members (showResults). Individual responses live in survey-responses and are
 * admin-only; members only ever see aggregate counts, so no one is profiled.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export const SeasonSurvey: CollectionConfig = {
  slug: 'season-surveys',
  access: {
    read: authenticated, // signed-in members can see an open survey and its aggregate
    create: anyAdminOnly,
    update: anyAdminOnly,
    delete: anyAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Engagement',
    defaultColumns: ['title', 'status', 'showResults', 'season'],
    description: 'Short season feedback surveys. Members answer once; results are aggregate only.',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    { name: 'season', type: 'relationship', relationTo: 'seasons' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
      index: true,
    },
    { name: 'showResults', type: 'checkbox', defaultValue: false, admin: { description: 'Publish aggregate results to members.' } },
    {
      name: 'questions',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Question', plural: 'Questions' },
      fields: [
        { name: 'key', type: 'text', required: true, admin: { description: 'Stable id for this question (e.g. q1).' } },
        { name: 'prompt', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'rating',
          options: [
            { label: 'Rating (1 to 5)', value: 'rating' },
            { label: 'Multiple choice', value: 'choice' },
            { label: 'Short text', value: 'text' },
          ],
        },
        {
          name: 'options',
          type: 'array',
          admin: { condition: (_, sibling) => sibling?.type === 'choice' },
          fields: [{ name: 'label', type: 'text', required: true }],
        },
      ],
    },
  ],
}
