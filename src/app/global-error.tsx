"use client";

/*
 * The last line of defence: an error thrown by the ROOT layout itself.
 *
 * Next.js replaces the entire document when this renders, so it has to supply its
 * own <html> and <body>. That also means none of the app's normal chrome exists
 * here: no fonts loaded through next/font, no globals.css guarantee, no Header,
 * no MobileNav. If the root layout is what broke, importing anything from it is
 * how a fallback screen becomes a second blank screen.
 *
 * So this file deliberately does NOT import the shared ErrorState component or
 * any project CSS. Every style below is inline. It is the ugliest file in the
 * repo on purpose: it is the one screen that has to render when everything else
 * has already failed.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | CMBA+</title>
        {/*
         * Repeated here because the root layout's viewport export is not applied
         * when the root layout is the thing that threw. Without it this page
         * renders at desktop width on a phone, zoomed out and unreadable.
         */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#08080A",
          color: "#F1F1ED",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <main style={{ maxWidth: "34rem", width: "100%" }} role="alert">
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#EB1C24",
            }}
          >
            Something went wrong
          </p>

          <h1
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(30px, 8vw, 56px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            CMBA+ could not load
          </h1>

          <p style={{ marginTop: "20px", fontSize: "16px", lineHeight: 1.6, color: "#9A9AA2" }}>
            The site hit a problem it could not recover from on its own. Trying again usually
            works. If it keeps happening, your connection may be dropping.
          </p>

          <div
            style={{
              marginTop: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "48px",
                padding: "0 24px",
                background: "#EB1C24",
                color: "#fff",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/*
             * A plain <a>, not next/link, and deliberately so. Link does a client
             * side navigation, which keeps the same React tree alive: the tree
             * whose root layout just threw. A full document load is the only way
             * out of that, and it is what this button has to do.
             */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: "48px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 24px",
                border: "1px solid #55555E",
                color: "#F1F1ED",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Go to the home page
            </a>
          </div>

          {error.digest ? (
            <p style={{ marginTop: "36px", fontSize: "11px", color: "#8E8E96" }}>
              If you report this, quote reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
