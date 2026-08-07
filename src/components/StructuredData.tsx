import { siteUrl } from "@/lib/siteUrl";

/*
 * JSON-LD for the organisation and the site.
 *
 * The nonce matters. This app runs a strict nonce-based CSP set in src/proxy.ts,
 * so an un-nonced <script> is blocked, even one of type application/ld+json.
 * Blocked structured data is invisible: the page looks fine and search engines
 * see nothing. The nonce is read from the request header the proxy sets and
 * passed in by the caller.
 *
 * Only facts that are true and stable go in here. Structured data that does not
 * match the visible page is treated as spam, and there is no upside to inventing
 * an aggregateRating or a set of opening hours.
 */

export function StructuredData({ nonce }: { nonce?: string }) {
  const base = siteUrl();

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsOrganization",
        "@id": `${base}/#organization`,
        name: "Calgary Minor Basketball Association",
        alternateName: "CMBA",
        url: base,
        logo: `${base}/icon-512.png`,
        sport: "Basketball",
        areaServed: {
          "@type": "City",
          name: "Calgary",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Calgary",
            addressRegion: "AB",
            addressCountry: "CA",
          },
        },
        email: "league@cmba.ab.ca",
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "CMBA+",
        description:
          "Schedules, standings, rules, coaching and officiating resources for Calgary minor basketball.",
        publisher: { "@id": `${base}/#organization` },
        inLanguage: "en-CA",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // The content is built from the constant above, not from user input, so
      // there is nothing here that could carry an injected script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
