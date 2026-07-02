import { headers } from 'next/headers'

/*
 * Renders JSON-LD structured data. Two things make this safe under the strict CSP:
 *   - the script carries the per-request nonce (read from the x-nonce header), so a
 *     nonce + strict-dynamic policy allows it;
 *   - the serialized JSON has every "<" escaped to <, so a value can never close
 *     the script tag or inject markup. The data is our own server data, not user
 *     input, so there is no XSS surface; this is the one controlled use of
 *     dangerouslySetInnerHTML in the app (recorded in docs/SECURITY.md).
 *
 * Copy rule: no em or en dashes anywhere.
 */
export async function JsonLd({ data }: { data: object }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />
}
