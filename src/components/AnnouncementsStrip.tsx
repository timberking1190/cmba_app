'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Megaphone, X } from 'lucide-react'

type Announcement = {
  id: number | string
  title: string
  body?: string | null
  tag?: string | null
  link?: string | null
  pinned?: boolean | null
  expiresAt?: string | null
}

/*
 * Live announcements strip (homepage). Client-fetches published announcements
 * from the public API so the homepage stays static and gets fresh content on
 * load. Renders nothing when there are none. Dismissible per session.
 */
export function AnnouncementsStrip() {
  const [items, setItems] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/announcements?limit=10&sort=-pinned&depth=0')
      .then((r) => r.json())
      .then((d) => {
        const now = Date.now()
        const live = (d?.docs ?? []).filter(
          (a: Announcement) => !a.expiresAt || new Date(a.expiresAt).getTime() >= now,
        )
        setItems(live)
      })
      .catch(() => {})
  }, [])

  if (dismissed || items.length === 0) return null
  const a = items[0]

  return (
    <div data-testid="announcements-strip" className="bg-cmba-red/10 border-b border-cmba-red/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2 lg:py-2.5 flex items-center gap-3">
        <Megaphone size={16} className="text-cmba-red shrink-0" />
        {a.tag ? (
          <span className="font-mono text-[10px] uppercase tracking-wider bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 shrink-0">{a.tag}</span>
        ) : null}
        <p className="text-sm text-cmba-grey-light min-w-0 truncate">
          <span className="text-white font-medium">{a.title}</span>
          {a.body ? <span className="text-cmba-grey">. {a.body}</span> : null}
        </p>
        {a.link ? (
          <Link href={a.link} className="ml-auto shrink-0 font-display font-bold text-xs uppercase tracking-wider text-cmba-red hover:text-white transition-colors">
            More
          </Link>
        ) : (
          <span className="ml-auto" />
        )}
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-cmba-grey-mid hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
