/*
 * Seed the CMBA Connect training catalog from the REAL existing static data
 * (reach360CourseData.ts, the coach pathway, cmbaLinks.ts). Idempotent:
 * find-or-create by a stable natural key, so it is safe to re-run.
 *
 * Usage (after DATABASE_URL + PAYLOAD_SECRET are set):  npm run seed
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { CollectionSlug, Where } from 'payload'
import config from '@payload-config'

import { allReach360Courses } from '../src/lib/reach360CourseData'
import { COURSES as LINKS } from '../src/lib/cmbaLinks'
import { mdToLexical } from '../src/lib/mdToLexical'
import { PRIVACY_POLICY, TERMS_OF_USE, GUARDIAN_CONSENT } from '../src/content/legal'

type Role = 'participant' | 'coach' | 'official' | 'club_admin' | 'super_admin'

async function main() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed] ${m}`)

  // ── PolicyVersions global ───────────────────────────────────────────────
  await payload.updateGlobal({
    slug: 'policy-versions',
    data: {
      termsVersion: '2026-06-01',
      privacyVersion: '2026-06-01',
      guardianConsentVersion: '2026-06-01',
    },
  })
  log('PolicyVersions set')

  // ── helper: find-or-create by a where clause ────────────────────────────
  async function findOrCreate(
    collection: CollectionSlug,
    where: Where,
    data: Record<string, unknown>,
  ): Promise<{ id: number | string }> {
    const existing = await payload.find({ collection, where, limit: 1, overrideAccess: true, depth: 0 })
    if (existing.docs.length) {
      const id = existing.docs[0].id
      await payload.update({ collection, id, data: data as never, overrideAccess: true })
      return { id }
    }
    const created = await payload.create({ collection, data: data as never, overrideAccess: true })
    return { id: created.id }
  }

  // ── Club (one real association) ─────────────────────────────────────────
  await findOrCreate(
    'clubs',
    { name: { equals: 'Calgary Minor Basketball Association' } },
    {
      name: 'Calgary Minor Basketball Association',
      shortName: 'CMBA',
      contactEmail: 'league@cmba.ab.ca',
      contactPhone: '(403) 804-3396',
    },
  )
  log('Club CMBA seeded')

  // ── CertificationTypes (real NCCP / RAMP / compliance items) ────────────
  const certTypeDefs: Array<{
    name: string
    category: 'coach' | 'official' | 'compliance' | 'medical'
    appliesToRoles?: Role[]
    validityMonths?: number
    isRequired?: boolean
    requiredForRoles?: Role[]
    renewalUrl?: string
    description?: string
  }> = [
    { name: 'CMBA Coach Training', category: 'coach', appliesToRoles: ['coach'], isRequired: true, requiredForRoles: ['coach'], renewalUrl: LINKS.coachTraining, description: 'Mandatory CMBA coach training (Reach360).' },
    { name: 'Safe CMBA Interactions', category: 'compliance', appliesToRoles: ['coach', 'official', 'participant'], validityMonths: 12, isRequired: true, requiredForRoles: ['coach', 'official'], renewalUrl: LINKS.safeInteractions, description: 'Safe sport: Rule of Two, codes of conduct, EDI, concussion. Annual.' },
    { name: 'NCCP Make Ethical Decisions', category: 'coach', appliesToRoles: ['coach'], isRequired: true, requiredForRoles: ['coach'], renewalUrl: 'https://coach.ca/nccp-make-ethical-decisions', description: 'Canada-wide coaching ethics (Coaching Association of Canada).' },
    { name: 'NCCP Community Coach', category: 'coach', appliesToRoles: ['coach'], renewalUrl: 'https://coach.ca', description: 'Foundational NCCP community coaching certification.' },
    { name: 'NCCP Competition Introduction — Basketball', category: 'coach', appliesToRoles: ['coach'], renewalUrl: 'https://coach.ca/nccp-competition-introduction' },
    { name: 'NCCP Competition Development — Basketball', category: 'coach', appliesToRoles: ['coach'], renewalUrl: 'https://coach.ca/nccp-competition-development' },
    { name: 'Concussion Awareness (Making Head Way)', category: 'medical', appliesToRoles: ['coach', 'official'], validityMonths: 12, isRequired: true, requiredForRoles: ['coach'], renewalUrl: 'https://coach.ca/making-head-way-concussion-elearning-series' },
    { name: 'Standard First Aid', category: 'medical', appliesToRoles: ['coach', 'official'], validityMonths: 36 },
    { name: 'Police Information Check (Vulnerable Sector)', category: 'compliance', appliesToRoles: ['coach', 'official', 'club_admin'], validityMonths: 36, isRequired: true, requiredForRoles: ['coach', 'official'], description: 'Criminal record / vulnerable sector check.' },
    { name: 'Intro to Officiating CMBA', category: 'official', appliesToRoles: ['official'], isRequired: true, requiredForRoles: ['official'], renewalUrl: LINKS.introOfficiating },
    { name: 'RAMP Level 1', category: 'official', appliesToRoles: ['official'], renewalUrl: 'https://cmba.rampassigning.com' },
    { name: 'RAMP Level 2', category: 'official', appliesToRoles: ['official'], renewalUrl: 'https://cmba.rampassigning.com' },
    { name: 'RAMP Level 3', category: 'official', appliesToRoles: ['official'], renewalUrl: 'https://cmba.rampassigning.com' },
  ]

  const certTypeIds = new Map<string, number | string>()
  for (const def of certTypeDefs) {
    const { id } = await findOrCreate('certification-types', { name: { equals: def.name } }, def)
    certTypeIds.set(def.name, id)
  }
  log(`CertificationTypes seeded (${certTypeIds.size})`)

  // ── Courses (migrate the real Reach360 catalog + NCCP courses) ──────────
  const relatedCertForCourse: Record<string, string> = {
    'CMBA Coach Training': 'CMBA Coach Training',
    'Safe CMBA Interactions': 'Safe CMBA Interactions',
    'Intro to Officiating CMBA': 'Intro to Officiating CMBA',
  }
  for (const c of allReach360Courses) {
    const related = relatedCertForCourse[c.title]
    await findOrCreate(
      'courses',
      { externalId: { equals: c.id } },
      {
        title: c.title,
        description: c.description,
        provider: 'Reach360 (CMBA)',
        format: c.format,
        duration: c.duration,
        targetAudience: c.targetAudience,
        registerUrl: c.url,
        mandatory: c.mandatory,
        externalId: c.id,
        relatedCertificationType: related ? certTypeIds.get(related) : undefined,
        modules: c.modules.map((m) => ({ number: m.number, title: m.title, description: m.description })),
        tags: c.tags.map((t) => ({ tag: t })),
      },
    )
  }
  // NCCP in-person / national courses referenced by the pathway.
  const nccpCourses = [
    { title: 'Online NCCP Make Ethical Decisions', provider: 'Coaching Association of Canada', format: 'Online', registerUrl: 'https://coach.ca/nccp-make-ethical-decisions', related: 'NCCP Make Ethical Decisions', mandatory: true },
    { title: 'NCCP Competition Introduction — Basketball', provider: 'Coaching Association of Canada', format: 'In-person, multi-day', registerUrl: 'https://coach.ca/nccp-competition-introduction', related: 'NCCP Competition Introduction — Basketball', mandatory: false },
    { title: 'NCCP Competition Development — Basketball', provider: 'Coaching Association of Canada', format: 'In-person, multi-day', registerUrl: 'https://coach.ca/nccp-competition-development', related: 'NCCP Competition Development — Basketball', mandatory: false },
  ]
  for (const c of nccpCourses) {
    await findOrCreate(
      'courses',
      { title: { equals: c.title } },
      {
        title: c.title,
        provider: c.provider,
        format: c.format,
        registerUrl: c.registerUrl,
        mandatory: c.mandatory,
        relatedCertificationType: certTypeIds.get(c.related),
      },
    )
  }
  log('Courses seeded')

  // ── Pathways (coach + official) ─────────────────────────────────────────
  const ct = (name: string) => {
    const id = certTypeIds.get(name)
    if (id == null) throw new Error(`Seed error: cert type "${name}" not found`)
    return id
  }

  await findOrCreate(
    'pathways',
    { name: { equals: 'CMBA Coach Certification' } },
    {
      name: 'CMBA Coach Certification',
      audience: 'coach',
      description: 'Progress through Community, Trained, and Developed Coach levels.',
      stages: [
        {
          name: 'Community Coach',
          order: 1,
          xpReward: 500,
          description: 'Foundation-level certification for new coaches.',
          requiredCertificationTypes: [ct('CMBA Coach Training'), ct('Safe CMBA Interactions'), ct('NCCP Make Ethical Decisions'), ct('Concussion Awareness (Making Head Way)')],
        },
        {
          name: 'Trained Coach',
          order: 2,
          xpReward: 800,
          description: 'Intermediate certification for competitive divisions.',
          requiredCertificationTypes: [ct('NCCP Community Coach'), ct('NCCP Competition Introduction — Basketball'), ct('Police Information Check (Vulnerable Sector)')],
        },
        {
          name: 'Developed Coach',
          order: 3,
          xpReward: 1200,
          description: 'Advanced certification for upper/competitive divisions.',
          requiredCertificationTypes: [ct('NCCP Competition Development — Basketball')],
        },
      ],
    },
  )

  await findOrCreate(
    'pathways',
    { name: { equals: 'CMBA Officials (RAMP)' } },
    {
      name: 'CMBA Officials (RAMP)',
      audience: 'official',
      description: 'Officiating development through RAMP levels.',
      stages: [
        { name: 'Entry Official', order: 1, xpReward: 400, requiredCertificationTypes: [ct('Intro to Officiating CMBA'), ct('Safe CMBA Interactions'), ct('RAMP Level 1')] },
        { name: 'Intermediate Official', order: 2, xpReward: 700, requiredCertificationTypes: [ct('RAMP Level 2'), ct('Police Information Check (Vulnerable Sector)')] },
        { name: 'Advanced Official', order: 3, xpReward: 1000, requiredCertificationTypes: [ct('RAMP Level 3')] },
      ],
    },
  )
  log('Pathways seeded')

  // ── Globals: Site Settings + nav ────────────────────────────────────────
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      privacyOfficer: { name: 'CMBA Privacy Officer', email: 'privacy@cmba.ab.ca', phone: '(403) 804-3396' },
      contact: { email: 'league@cmba.ab.ca', phone: '(403) 804-3396' },
    },
  })
  await payload.updateGlobal({
    slug: 'header-nav',
    data: {
      items: [
        { label: 'Rules', href: '/rules' },
        { label: 'Athletes', href: '/athlete' },
        { label: 'Coaches', href: '/coach', children: [
          { label: 'Dashboard', href: '/coach' },
          { label: 'Certification Pathway', href: '/coach/pathway' },
          { label: 'Courses', href: '/coach/courses' },
        ] },
        { label: 'Referees', href: '/ref' },
        { label: 'Parents', href: '/parent' },
        { label: 'Schedule', href: '/calendar' },
        { label: 'Standings', href: '/standings' },
      ],
    },
  })
  await payload.updateGlobal({
    slug: 'footer-nav',
    data: {
      sections: [
        { title: 'CMBA+', links: [
          { label: 'Rules & Info', href: '/rules' },
          { label: 'Schedule', href: '/calendar' },
          { label: 'Standings', href: '/standings' },
          { label: 'FAQ', href: '/faq' },
        ] },
        { title: 'Organization', links: [
          { label: 'League Operations', href: '/resources' },
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Use', href: '/terms' },
        ] },
      ],
    },
  })
  log('Globals (site settings + nav) seeded')

  // ── Announcement (sample) ───────────────────────────────────────────────
  await findOrCreate(
    'announcements',
    { title: { equals: 'Welcome to CMBA Connect' } },
    {
      title: 'Welcome to CMBA Connect',
      body: 'Your training, certification, and resources hub. Sign in to track your pathway.',
      tag: 'News',
      link: '/login',
      pinned: true,
      publishedAt: '2026-06-01',
      _status: 'published',
    },
  )
  log('Announcement seeded')

  // ── Legal docs as published CMS pages ───────────────────────────────────
  for (const doc of [PRIVACY_POLICY, TERMS_OF_USE, GUARDIAN_CONSENT]) {
    await findOrCreate(
      'pages',
      { slug: { equals: doc.slug } },
      {
        title: doc.title,
        slug: doc.slug,
        _status: 'published',
        layout: [{ blockType: 'richText', content: mdToLexical(doc.body) }],
        seo: { metaTitle: `${doc.title} | CMBA Connect` },
      },
    )
  }
  log('Legal CMS pages seeded')

  // ── Sample editable page (proves "create pages without code") ───────────
  await findOrCreate(
    'pages',
    { slug: { equals: 'about' } },
    {
      title: 'About CMBA Connect',
      slug: 'about',
      _status: 'published',
      seo: { metaTitle: 'About | CMBA Connect' },
      layout: [
        { blockType: 'hero', eyebrow: 'About', heading: 'CMBA Connect', subheading: 'People development and website content for Calgary Minor Basketball — built on a Canadian-resident backend.' },
        { blockType: 'statsGrid', stats: [
          { value: '5', label: 'Age groups' },
          { value: '13', label: 'Certifications tracked' },
          { value: '100%', label: 'Data in Canada' },
        ] },
        { blockType: 'cta', heading: 'Ready to get started?', body: 'Create your training account in minutes.', buttonLabel: 'Create account', buttonHref: '/login' },
      ],
    },
  )
  log('Sample CMS page (/about) seeded')

  log('Seed complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
