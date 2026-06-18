import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { getPayloadClient } from '@/lib/auth'
import { PageRenderer } from '@/components/PageRenderer'
import type { Page } from '@/payload-types'

export const dynamic = 'force-dynamic'

async function fetchPage(slug: string): Promise<Page | null> {
  const payload = await getPayloadClient()
  const { isEnabled: draft } = await draftMode()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    draft,
    limit: 1,
    depth: 2,
    overrideAccess: draft, // published-only for the public; drafts only in preview
  })
  return (res.docs[0] as Page) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await fetchPage(slug)
  if (!page) return {}
  const seo = page.seo
  return {
    title: seo?.metaTitle || `${page.title} | CMBA Connect`,
    description: seo?.metaDescription || undefined,
  }
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await fetchPage(slug)
  if (!page) notFound()
  return (
    <div className="min-h-[60vh]">
      <PageRenderer initialData={page} />
    </div>
  )
}
