import 'server-only'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { User } from '@/payload-types'

/*
 * Server-side auth helpers. Resolve the signed-in user from the Payload session
 * cookie via the Local API (no HTTP hop). Use in server components / route
 * handlers. Middleware only checks cookie presence (edge has no DB).
 */
export async function getPayloadClient() {
  return getPayload({ config })
}

export async function getCurrentUser(): Promise<User | null> {
  const payload = await getPayload({ config })
  const hdrs = await nextHeaders()
  const { user } = await payload.auth({ headers: hdrs })
  return (user as User | null) ?? null
}
