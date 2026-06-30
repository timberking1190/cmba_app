import type { CollectionConfig } from 'payload'

import { ownerOrSuperAdmin, superAdminFieldOnly } from '../access/index'

/*
 * QuizAttempts - SCAFFOLD (model only this stage; the quiz UI lands with it).
 *
 * A per-user record of a Basketball IQ quiz attempt. The score is computed
 * SERVER-SIDE by the /api/v1/quiz-attempts endpoint (the client's answers are
 * scored against the answer key; the client never supplies a score), and the row
 * is written there via overrideAccess. The collection denies all API writes so a
 * participant cannot self-record a passing score. Read is owner-and-admin only.
 */
export const QuizAttempts: CollectionConfig = {
  slug: 'quiz-attempts',
  access: {
    read: ownerOrSuperAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'quizId', 'score', 'total', 'passed', 'takenAt'],
    group: 'Engagement',
    description: 'Server-scored quiz attempts. Written only by the quiz endpoint.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, access: { update: superAdminFieldOnly } },
    { name: 'quizId', type: 'text', required: true, index: true, admin: { description: 'Which quiz, e.g. basketball-iq.' } },
    { name: 'score', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'total', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'passed', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'takenAt', type: 'date', required: true, admin: { readOnly: true } },
  ],
}
