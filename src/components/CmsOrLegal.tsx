import { getPayloadClient } from '@/lib/auth'
import { PageRenderer } from '@/components/PageRenderer'
import { LegalDocView } from '@/components/LegalDocView'
import type { LegalDoc } from '@/content/legal'
import type { Page } from '@/payload-types'

/*
 * Renders the published CMS Page at the legal doc's slug if an admin has created
 * one (so legal docs are CMS-editable), otherwise the built-in static content.
 */
export async function CmsOrLegal({ doc }: { doc: LegalDoc }) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: doc.slug } },
    limit: 1,
    depth: 2,
    overrideAccess: false, // published only for the public
  })
  const page = res.docs[0] as Page | undefined
  if (page?.layout?.length) {
    return (
      <div className="min-h-[60vh]">
        <PageRenderer initialData={page} />
      </div>
    )
  }
  return <LegalDocView doc={doc} />
}
