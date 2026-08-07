'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Megaphone, X } from 'lucide-react'

import type { Announcement } from '@/lib/announcements'

/*
 * Live announcements strip (homepage).
 *
 * The announcement is passed IN from the server (see src/lib/announcements.ts)
 * rather than fetched here. It used to client-fetch and render nothing until the
 * response landed, then insert itself above the hero and push the whole homepage
 * down. That shift was the entire measured homepage CLS of 0.046. Now it is
 * either in the first paint or absent, and nothing moves.
 *
 * This stays a client component only because dismissing is client state. It holds
 * no fetching logic any more.
 */
export function AnnouncementsStrip({ items }: { items: Announcement[] }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || items.length === 0) return null
  const a = items[0]

  return (
    <div className="bg-cmba-red/10 border-b border-cmba-red/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center gap-3">
        <Megaphone size={16} className="text-cmba-red shrink-0" />
        {a.tag ? (
          <span className="font-mono text-[10px] uppercase tracking-wider bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 shrink-0">{a.tag}</span>
        ) : null}
        <p className="text-sm text-cmba-grey-light min-w-0 truncate">
          <span className="text-white font-medium">{a.title}</span>
          {a.body ? <span className="text-cmba-grey"> — {a.body}</span> : null}
        </p>
        {/*
          tap-target on both controls below, rather than min-h/min-w.

          This strip sits above the hero, so any change to its height moves the
          whole page below it. tap-target (globals.css) grows the hit area with a
          pseudo element and leaves the layout box alone, which is what WCAG 2.5.8
          measures anyway. Same 44px target, no change to the layout.
        */}
        {a.link ? (
          <Link href={a.link} className="tap-target ml-auto shrink-0 inline-flex items-center justify-center px-2 font-display font-bold text-xs uppercase tracking-wider text-cmba-red hover:text-white transition-colors">
            More
          </Link>
        ) : (
          <span className="ml-auto" />
        )}
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="tap-target shrink-0 text-cmba-grey-mid hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
