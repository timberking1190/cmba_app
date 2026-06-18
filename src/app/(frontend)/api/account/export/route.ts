import { NextResponse } from 'next/server'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'

/*
 * Self-serve data export (PIPEDA individual access). Returns ONLY the
 * authenticated requester's own data as a JSON download: their profile, their
 * certifications, and their consent history. Never another user's data.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const payload = await getPayloadClient()

  const [certs, consents] = await Promise.all([
    payload.find({
      collection: 'certifications',
      where: { user: { equals: user.id } },
      depth: 1,
      limit: 500,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'consent-records',
      where: { user: { equals: user.id } },
      depth: 0,
      limit: 200,
      overrideAccess: true,
    }),
  ])

  // Strip internal guardian token from the export.
  const profile = { ...user } as Record<string, unknown>
  if (profile.guardian && typeof profile.guardian === 'object') {
    const g = { ...(profile.guardian as Record<string, unknown>) }
    delete g.confirmationToken
    profile.guardian = g
  }

  const payloadOut = {
    exportedAt: new Date().toISOString(),
    profile,
    certifications: certs.docs,
    consentHistory: consents.docs,
  }

  return new NextResponse(JSON.stringify(payloadOut, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cmba-connect-data-${user.id}.json"`,
    },
  })
}
