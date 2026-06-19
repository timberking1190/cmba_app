import type { Block } from 'payload'

/*
 * The CMS block library. Each block maps 1:1 to an on-brand renderer in
 * src/components/blocks/RenderBlocks.tsx, so admins can compose pages that stay
 * on the Off+Brand design. Add a block here + a case in RenderBlocks to extend.
 */

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text', required: true },
    { name: 'subheading', type: 'textarea' },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaHref', type: 'text' },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  fields: [{ name: 'content', type: 'richText', required: true }],
}

export const CTABlock: Block = {
  slug: 'cta',
  interfaceName: 'CTABlock',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'buttonLabel', type: 'text', required: true },
    { name: 'buttonHref', type: 'text', required: true },
  ],
}

export const StatsGridBlock: Block = {
  slug: 'statsGrid',
  interfaceName: 'StatsGridBlock',
  labels: { singular: 'Stats grid', plural: 'Stats grids' },
  fields: [
    {
      name: 'stats',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
  ],
}

export const FAQBlock: Block = {
  slug: 'faq',
  interfaceName: 'FAQBlock',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
  ],
}

export const ImageBlock: Block = {
  slug: 'image',
  interfaceName: 'ImageBlock',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text' },
  ],
}

export const EmbedBlock: Block = {
  slug: 'embed',
  interfaceName: 'EmbedBlock',
  labels: { singular: 'Embed', plural: 'Embeds' },
  fields: [
    { name: 'title', type: 'text' },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: { description: 'URL to embed in an iframe (e.g. a TeamLinkt schedule).' },
    },
    { name: 'height', type: 'number', defaultValue: 600 },
  ],
}

export const pageBlocks: Block[] = [
  HeroBlock,
  RichTextBlock,
  StatsGridBlock,
  FAQBlock,
  CTABlock,
  ImageBlock,
  EmbedBlock,
]
