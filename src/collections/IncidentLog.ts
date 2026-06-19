import type { CollectionConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * IncidentLog — the PIPEDA-mandated breach/incident record. Super-admin only.
 * Every privacy/security incident is logged here (whether or not it triggers
 * notification) so CMBA keeps a record as the law requires. The breach runbook
 * lives in the README.
 */
export const IncidentLog: CollectionConfig = {
  slug: 'incident-log',
  access: {
    read: superAdminOnly,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'severity', 'status', 'occurredAt'],
    group: 'Compliance',
    description: 'Privacy/security incident & breach log (PIPEDA accountability).',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'severity',
      type: 'select',
      required: true,
      defaultValue: 'low',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Investigating', value: 'investigating' },
        { label: 'Contained', value: 'contained' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    { name: 'occurredAt', type: 'date', required: true },
    { name: 'discoveredAt', type: 'date' },
    {
      name: 'realRiskOfSignificantHarm',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'If true, OPC + affected individuals must be notified (PIPEDA).' },
    },
    { name: 'opcNotifiedAt', type: 'date', admin: { description: 'Office of the Privacy Commissioner notification date.' } },
    { name: 'individualsNotifiedAt', type: 'date' },
    { name: 'affectedCount', type: 'number', min: 0 },
    { name: 'description', type: 'textarea' },
    { name: 'remediation', type: 'textarea' },
  ],
}
