/*
 * Branded 404 for the public and member site. Reached for any unknown URL under
 * the (frontend) route group, and by any page that calls notFound(). Gives a
 * plain language explanation and clear ways back into the site.
 *
 * Copy rule: no em or en dashes anywhere.
 */

import Link from 'next/link'
import { Compass, Home } from 'lucide-react'

export default function NotFound() {
  const links: Array<{ href: string; label: string }> = [
    { href: '/schedule', label: 'Schedule' },
    { href: '/standings', label: 'Standings' },
    { href: '/rules', label: 'Rules' },
    { href: '/resources', label: 'Resources' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 lg:py-32 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cmba-red/10 border border-cmba-red/30 mb-6">
        <Compass size={26} className="text-cmba-red" aria-hidden="true" />
      </div>
      <div className="label-xs text-cmba-grey-mid mb-3">Error 404</div>
      <h1 className="font-display font-black text-white uppercase tracking-tight text-3xl lg:text-4xl mb-3">
        Page not found
      </h1>
      <p className="text-sm text-cmba-grey leading-relaxed max-w-md mx-auto mb-8">
        The page you were looking for does not exist or may have moved. Here are some good places
        to pick things back up.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="border border-white/15 hover:border-cmba-red/50 text-cmba-grey-light hover:text-white font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-red-dark text-white font-mono text-xs uppercase tracking-wider px-5 py-2.5 transition-colors"
      >
        <Home size={14} aria-hidden="true" /> Return home
      </Link>
    </div>
  )
}
