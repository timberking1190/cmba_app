import type { Metadata } from 'next'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { computeCertStatus } from '@/lib/certStatus'
import { CourseLibrary, type CourseCard } from '@/components/coach/CourseLibrary'
import type { Certification, Course, CertificationType } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Course Library | CMBA Connect' }

const idOf = (rel: unknown): number | string | undefined =>
  rel && typeof rel === 'object' ? (rel as { id: number | string }).id : (rel as number | string | undefined)

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default async function CoachCoursesPage() {
  const user = await getCurrentUser()
  const payload = await getPayloadClient()

  const coursesRes = await payload.find({
    collection: 'courses',
    depth: 1, // populate relatedCertificationType (for category + completion)
    limit: 200,
    overrideAccess: true,
  })
  const courses = coursesRes.docs as Course[]

  // The signed-in user's valid certification type ids → real completion.
  const validTypeIds = new Set<number | string>()
  if (user) {
    const certRes = await payload.find({
      collection: 'certifications',
      where: { user: { equals: user.id } },
      depth: 0,
      limit: 500,
      overrideAccess: true,
    })
    for (const c of certRes.docs as Certification[]) {
      const status = computeCertStatus({ verifiedAt: c.verifiedAt, expiryDate: c.expiryDate })
      if (status === 'valid' || status === 'expiring') {
        const t = idOf(c.type)
        if (t != null) validTypeIds.add(t)
      }
    }
  }

  const cards: CourseCard[] = courses.map((c) => {
    const related = (typeof c.relatedCertificationType === 'object' ? c.relatedCertificationType : undefined) as
      | CertificationType
      | undefined
    const relatedId = idOf(c.relatedCertificationType)
    const category = c.mandatory ? 'Required' : related?.category ? cap(related.category) : 'General'
    return {
      id: c.id,
      title: c.title,
      category,
      audience: c.targetAudience,
      duration: c.duration,
      modules: c.modules?.length ?? 0,
      mandatory: Boolean(c.mandatory),
      url: c.registerUrl,
      description: c.description,
      completed: relatedId != null && validTypeIds.has(relatedId),
    }
  })

  return <CourseLibrary courses={cards} signedIn={Boolean(user)} />
}
