import Link from 'next/link'

import type { LegalDoc } from '@/content/legal'

/*
 * Minimal markdown renderer for the legal docs (they use only # / ## headings and
 * paragraphs). Kept dependency-free. Phase 3 replaces these with CMS Pages.
 */
function renderBlocks(body: string) {
  const lines = body.split('\n')
  const blocks: React.ReactNode[] = []
  let para: string[] = []
  let key = 0

  const flush = () => {
    if (para.length) {
      blocks.push(
        <p key={key++} className="text-cmba-grey-light leading-relaxed mb-4">
          {para.join(' ')}
        </p>,
      )
      para = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      blocks.push(
        <h2 key={key++} className="font-display font-bold text-xl text-white uppercase tracking-wide mt-8 mb-3">
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith('# ')) {
      flush()
      blocks.push(
        <h1 key={key++} className="font-display font-black text-3xl text-white uppercase tracking-tight mb-4">
          {line.slice(2)}
        </h1>,
      )
    } else {
      para.push(line)
    }
  }
  flush()
  return blocks
}

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
      <div className="font-mono text-[11px] text-cmba-grey-mid uppercase tracking-[0.18em] mb-2">
        Version {doc.version}
      </div>
      <article>{renderBlocks(doc.body)}</article>
      <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-cmba-red hover:text-white transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="text-cmba-red hover:text-white transition-colors">Terms of Use</Link>
        <Link href="/guardian-consent" className="text-cmba-red hover:text-white transition-colors">Guardian Consent</Link>
        <Link href="/contact" className="text-cmba-grey hover:text-white transition-colors ml-auto">Contact</Link>
      </div>
    </div>
  )
}
