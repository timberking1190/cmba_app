import Image from 'next/image'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/*
 * RenderBlocks — switches on `blockType` and renders the matching on-brand
 * component for each CMS block. 1:1 with src/blocks/config.ts.
 */
type AnyBlock = { blockType: string; id?: string | null; [key: string]: unknown }

type MediaLike = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null }

function HeroR(b: AnyBlock) {
  return (
    <section className="bg-hero-gradient border-b-2 border-cmba-red">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
        {b.eyebrow ? (
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">{String(b.eyebrow)}</span>
          </div>
        ) : null}
        <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">{String(b.heading)}</h1>
        {b.subheading ? <p className="text-cmba-grey mt-3 max-w-2xl">{String(b.subheading)}</p> : null}
        {b.ctaLabel && b.ctaHref ? (
          <Link href={String(b.ctaHref)} className="inline-flex items-center gap-2 mt-5 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
            {String(b.ctaLabel)}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

function RichTextR(b: AnyBlock) {
  return (
    <section className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      <div className="prose-cmba text-cmba-grey-light leading-relaxed [&_h2]:font-display [&_h2]:text-white [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-2 [&_a]:text-cmba-red [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-4">
        <RichText data={b.content as SerializedEditorState} />
      </div>
    </section>
  )
}

function StatsGridR(b: AnyBlock) {
  const stats = (b.stats as Array<{ value: string; label: string }>) || []
  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-cmba-black-card border border-white/12 p-5 text-center">
            <div className="font-display font-black text-3xl text-cmba-red">{s.value}</div>
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FAQR(b: AnyBlock) {
  const items = (b.items as Array<{ question: string; answer: string }>) || []
  return (
    <section className="max-w-3xl mx-auto px-4 lg:px-6 py-10">
      {b.heading ? <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-5">{String(b.heading)}</h2> : null}
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="bg-cmba-black-card border border-white/12 p-4">
            <h3 className="font-display font-bold text-white text-sm uppercase tracking-wide">{it.question}</h3>
            <p className="text-sm text-cmba-grey mt-1 leading-relaxed">{it.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CTAR(b: AnyBlock) {
  return (
    <section className="max-w-5xl mx-auto px-4 lg:px-6 py-10">
      <div className="bg-cmba-red/10 border border-cmba-red/30 p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">{String(b.heading)}</h2>
          {b.body ? <p className="text-cmba-grey mt-1">{String(b.body)}</p> : null}
        </div>
        <Link href={String(b.buttonHref)} className="shrink-0 inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
          {String(b.buttonLabel)}
        </Link>
      </div>
    </section>
  )
}

function ImageR(b: AnyBlock) {
  const img = b.image as MediaLike | null
  if (!img?.url) return null
  return (
    <figure className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <Image src={img.url} alt={img.alt || ''} width={img.width || 1200} height={img.height || 800} className="w-full h-auto border border-white/12" />
      {b.caption ? <figcaption className="text-xs text-cmba-grey-mid mt-2 text-center">{String(b.caption)}</figcaption> : null}
    </figure>
  )
}

function EmbedR(b: AnyBlock) {
  return (
    <section className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
      {b.title ? <h2 className="font-display font-bold text-white uppercase tracking-wide text-lg mb-3">{String(b.title)}</h2> : null}
      <iframe
        src={String(b.url)}
        title={String(b.title || 'Embedded content')}
        className="w-full border border-white/12 bg-cmba-black-surface"
        height={Number(b.height) || 600}
        loading="lazy"
      />
    </section>
  )
}

const renderers: Record<string, (b: AnyBlock) => React.ReactNode> = {
  hero: HeroR,
  richText: RichTextR,
  statsGrid: StatsGridR,
  faq: FAQR,
  cta: CTAR,
  image: ImageR,
  embed: EmbedR,
}

export function RenderBlocks({ blocks }: { blocks?: AnyBlock[] | null }) {
  if (!blocks?.length) return null
  return (
    <>
      {blocks.map((b, i) => {
        const R = renderers[b.blockType]
        return R ? <div key={b.id || i}>{R(b)}</div> : null
      })}
    </>
  )
}
