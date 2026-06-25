import type { CollectionConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * Venues - a facility where games are played. Reads are public because families
 * use the address and map link for directions; this is not personal data. Super
 * admins manage venues. Each playing surface is a separate Court (see Courts), so
 * the conflict engine can key on a stable court id.
 */
export const Venues: CollectionConfig = {
  slug: 'venues',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'province'],
    group: 'Competition',
    description: 'A facility. Courts are modeled separately so conflict checks key on a stable court id.',
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true, index: true },
    { name: 'address', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'province', type: 'text', defaultValue: 'AB' },
    { name: 'postalCode', type: 'text' },
    { name: 'mapsUrl', type: 'text', admin: { description: 'Full map link. If blank, the app builds a search link from the address.' } },
    { name: 'notes', type: 'textarea', admin: { description: 'Parking or entry notes shown to families.' } },
    {
      name: 'blackoutDates',
      type: 'array',
      labels: { singular: 'Blackout date', plural: 'Blackout dates' },
      admin: { description: 'Dates this venue is unavailable for scheduling.' },
      fields: [
        { name: 'date', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'reason', type: 'text' },
      ],
    },
    { name: 'externalId', type: 'text', index: true },
  ],
}
