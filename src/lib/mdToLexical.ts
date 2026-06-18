/*
 * Minimal markdown → Lexical (Payload default) converter. Handles the subset the
 * legal docs use: `#`/`##` headings and blank-line-separated paragraphs. Used by
 * the seed to publish the legal documents as CMS rich-text pages.
 */
type LexNode = Record<string, unknown>

const textNode = (text: string): LexNode => ({
  type: 'text',
  text,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const para = (text: string): LexNode => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  textStyle: '',
  children: [textNode(text)],
})

const heading = (text: string, tag: 'h1' | 'h2'): LexNode => ({
  type: 'heading',
  tag,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children: [textNode(text)],
})

export function mdToLexical(body: string): { root: LexNode } {
  const children: LexNode[] = []
  let buf: string[] = []
  const flush = () => {
    if (buf.length) {
      children.push(para(buf.join(' ')))
      buf = []
    }
  }
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
    } else if (line.startsWith('## ')) {
      flush()
      children.push(heading(line.slice(3), 'h2'))
    } else if (line.startsWith('# ')) {
      flush()
      children.push(heading(line.slice(2), 'h1'))
    } else {
      buf.push(line)
    }
  }
  flush()
  return {
    root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children },
  }
}
