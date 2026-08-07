import 'server-only'

import { getPayloadClient } from './auth'

/*
 * Server side read of the live announcements strip.
 *
 * This exists to remove a layout shift. The strip used to fetch
 * /api/announcements from the browser and render nothing until the response
 * arrived, then insert itself ABOVE the hero, pushing the whole homepage down.
 * That was the entire measured homepage CLS (0.046). Rendering it on the server
 * means it is either in the first paint or not there at all, and nothing moves.
 *
 * The old comment on the component said the client fetch kept the homepage
 * static. That has not been true for a while: the root layout reads the CSP nonce
 * via headers(), which opts every route in this app into dynamic rendering. So
 * there is no static generation left to protect, and the fetch was pure cost.
 */

export type Announcement = {
  id: number | string
  title: string
  body?: string | null
  tag?: string | null
  link?: string | null
  pinned?: boolean | null
  expiresAt?: string | null
}

/**
 * Published, unexpired announcements, most pinned first. Returns [] on any
 * failure: a broken announcements query must never take the homepage down with
 * it, and an empty strip is indistinguishable from no announcements to a visitor.
 */
export async function getLiveAnnouncements(limit = 10): Promise<Announcement[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'announcements',
      // `publishedOrAdmin` access already restricts an unauthenticated read to
      // published documents, so this runs with the public's own permissions
      // rather than overriding them.
      where: { _status: { equals: 'published' } },
      sort: ['-pinned', '-publishedAt'],
      depth: 0,
      limit,
    })

    const now = Date.now()
    return (res.docs as unknown as Announcement[]).filter(
      (a) => !a.expiresAt || new Date(a.expiresAt).getTime() >= now,
    )
  } catch {
    return []
  }
}
