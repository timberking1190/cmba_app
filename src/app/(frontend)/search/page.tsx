import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, BookOpen, FileText, Users, MapPin, ExternalLink } from 'lucide-react'

import { getPayloadClient } from '@/lib/auth'
import { siteSearch, type SearchResult, type SearchResultType } from '@/lib/search/site'
import { EmptyState } from '@/components/feedback/EmptyState'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Search | CMBA Connect' }

const ICONS: Record<SearchResultType, typeof BookOpen> = {
  rule: BookOpen,
  page: FileText,
  team: Users,
  venue: MapPin,
}
const LABELS: Record<SearchResultType, string> = { rule: 'Rules', page: 'Pages', team: 'Teams', venue: 'Venues' }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const query = q.trim()

  let results: SearchResult[] = []
  if (query.length >= 2) {
    const payload = await getPayloadClient()
    results = (await siteSearch(payload as unknown as Parameters<typeof siteSearch>[0], query)).results
  }

  const groups = (['rule', 'page', 'team', 'venue'] as SearchResultType[])
    .map((type) => ({ type, items: results.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-12 lg:pt-20 pb-20">
      <div className="label-xs text-cmba-grey mb-3">Search</div>
      <h1 className="font-display font-black uppercase leading-[0.9] tracking-tighter2 text-[clamp(32px,8vw,64px)] mb-6">
        Find <span className="text-stroke">anything</span>
      </h1>

      <form method="get" action="/search" className="flex items-center gap-2 border border-white/15 focus-within:border-cmba-red/50 bg-cmba-black-card/60 px-4 py-3 transition-colors">
        <Search size={18} className="text-cmba-grey-mid shrink-0" aria-hidden="true" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Rules, teams, venues, pages"
          aria-label="Search the site"
          className="flex-1 bg-transparent text-cmba-grey-light placeholder:text-cmba-grey-mid outline-none text-sm"
        />
        <button type="submit" className="font-mono text-[11px] uppercase tracking-wider text-cmba-red hover:text-white transition-colors">
          Search
        </button>
      </form>

      <div className="mt-8">
        {query.length < 2 ? (
          <p className="text-sm text-cmba-grey">Type at least two characters to search across rules, schedule, and pages.</p>
        ) : groups.length === 0 ? (
          <EmptyState icon={Search} title={`No results for "${query}"`} description="Try a different word, or browse the rules and schedule from the main menu." />
        ) : (
          <div className="space-y-8">
            {groups.map((g) => {
              const Icon = ICONS[g.type]
              return (
                <section key={g.type}>
                  <h2 className="font-display font-bold text-white uppercase tracking-wide text-xs mb-3 flex items-center gap-2">
                    <Icon size={14} className="text-cmba-red" aria-hidden="true" /> {LABELS[g.type]}
                  </h2>
                  <ul className="space-y-2">
                    {g.items.map((r, i) => (
                      <li key={`${g.type}-${i}`} className="bg-cmba-black-card border border-white/12 hover:border-cmba-red/40 transition-colors">
                        <Link href={r.url} className="block p-4 group">
                          <div className="font-display font-bold text-sm text-white group-hover:text-cmba-red transition-colors">{r.title}</div>
                          {r.snippet && <p className="text-xs text-cmba-grey mt-1 leading-relaxed line-clamp-2">{r.snippet}</p>}
                        </Link>
                        {r.external && (
                          <a href={r.external} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 pb-3 -mt-1 font-mono text-[10px] uppercase tracking-wider text-cmba-grey-mid hover:text-cmba-red transition-colors w-fit">
                            Open document <ExternalLink size={10} aria-hidden="true" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
