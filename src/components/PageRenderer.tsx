'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'

type PageData = { layout?: unknown }

/*
 * Renders a CMS page's blocks, and — when shown inside the Payload admin Live
 * Preview iframe — live-updates from in-flight editor data via useLivePreview
 * (no save/DB round-trip). Outside the iframe it just renders initialData.
 */
export function PageRenderer({ initialData }: { initialData: PageData }) {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const { data } = useLivePreview<PageData>({ initialData, serverURL, depth: 2 })
  return <RenderBlocks blocks={(data?.layout as never) ?? null} />
}
