import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/memberCards'

/*
 * ImportFieldMappings (Member Cards, D15) — one NAMED mapping set per credential
 * upload source (record_check | nccp | safesport | registration | …). A governing
 * body renaming a column is a DATA change here, not a code change: the importer reads
 * the active rows for a source, maps file headers → target fields, and applies the
 * transform. Never invent column names — seed these from the real export files
 * (human setup task 5).
 *
 * (The (source_name, source_column, target_field) uniqueness is enforced by a
 * composite unique index added in the migration — Payload field `unique` is
 * single-column only.)
 */
export const ImportFieldMappings: CollectionConfig = {
  slug: 'import-field-mappings',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'sourceColumn',
    defaultColumns: ['sourceName', 'sourceColumn', 'targetField', 'transform', 'isRequired', 'isActive'],
    description: 'Named column→field mappings per credential upload source.',
  },
  fields: [
    { name: 'sourceName', type: 'text', required: true, index: true, admin: { description: "Mapping set, e.g. 'record_check', 'nccp', 'registration'." } },
    { name: 'sourceColumn', type: 'text', required: true, admin: { description: 'Header exactly as it appears in the file.' } },
    { name: 'targetField', type: 'text', required: true, admin: { description: "e.g. 'member.external_id', 'credential.record_check.expires_on'." } },
    {
      name: 'transform',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Date M/D/Y', value: 'date_mdy' },
        { label: 'Date Y-M-D', value: 'date_ymd' },
        { label: 'Status map', value: 'status_map' },
        { label: 'Trim + uppercase', value: 'trim_upper' },
      ],
    },
    { name: 'isRequired', type: 'checkbox', defaultValue: false, admin: { description: 'A missing required column fails the whole import.' } },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}
