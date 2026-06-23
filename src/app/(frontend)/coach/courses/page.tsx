import type { Metadata } from 'next'
import { BookOpen, ArrowDown } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { computeCertStatus } from '@/lib/certStatus'
import { CourseLibrary, type CourseCard } from '@/components/coach/CourseLibrary'
import { PhotoHero } from '@/components/media/PhotoHero'
import { PhotoBand } from '@/components/media/PhotoBand'
import { CourtLines } from '@/components/graphics/CourtLines'
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

  return (
    <div>
      {/* Hero */}
      <PhotoHero
        image="indoorGym"
        eyebrow="Coach Hub · Education"
        title="Course"
        accent="Library"
        subtitle="Every CMBA course in one place. Complete the right training to progress your certification — each course links straight to CMBA's official platform."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="#course-library"
            className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors"
          >
            <BookOpen size={16} /> Browse Courses
          </a>
          <a
            href="#course-library"
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm"
          >
            <ArrowDown size={16} /> Jump to Library
          </a>
        </div>
      </PhotoHero>

      {/* The interactive library (filters + course cards) — unchanged */}
      <div id="course-library" className="relative">
        <CourtLines className="pointer-events-none absolute top-24 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
        <CourseLibrary courses={cards} signedIn={Boolean(user)} />
      </div>

      {/* Photo band */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-12 lg:pb-16">
        <PhotoBand
          image="swish"
          side="right"
          eyebrow="Keep certified"
          title="Training that travels with you"
        >
          <p>
            Coaching certification is a journey, not a one-off. Work through the courses above at your own
            pace — your completed training stays on your CMBA Connect profile so you always know what to
            tackle next.
          </p>
        </PhotoBand>
      </div>
    </div>
  )
}
